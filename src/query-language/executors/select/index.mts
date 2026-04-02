//@author Tijn Gommers
//@date 2026-04-02

import {
    AggregateFunctionNode,
    ExpressionNode,
    FromNode,
    IdentifierNode,
    JoinNode,
    SelectColumn,
    SelectStatement,
    ValueExpressionNode,
} from '../../types/index.mjs';
import { JoinExecutor } from '../join/index.mjs';
import { StorageAdapter } from '../../../storage-adapter/storage-adapter.mts';
import {
    buildSelectProjection,
    compileStorageWherePredicate,
    getSingleTableName,
    hasJoinNodes,
} from '../storage-adapter-helpers.mts';
import { SelectOptimizationResult, SelectOptimizer } from './select-optimizer.mts';

/**
 * Executes SELECT statements with optional storage-adapter pushdown and aggregate handling.
 */
export class SelectExecutor {
    private joinExecutor: JoinExecutor;
    private storageAdapter?: StorageAdapter;
    private selectOptimizer: SelectOptimizer;

    constructor(storageAdapter?: StorageAdapter) {
        this.joinExecutor = new JoinExecutor();
        this.storageAdapter = storageAdapter;
        this.selectOptimizer = new SelectOptimizer();
    }

    /**
     * Validates and executes a SELECT statement.
     * Returns a plain result when running in-memory, or a Promise when a storage adapter is used.
     */
    executeSelect(node: SelectStatement, inputRows: Record<string, any>[] = []): any {
        this.validateSelect(node);
        const optimization = this.optimizeSelect(node);

        const columns = node.columns;
        const distinct = node.distinct;
        const from = this.processFromClause(optimization.optimizedFrom);
        const where = optimization.optimizedWhere;
        const orderBy = node.orderBy;
        const limit = node.limit;

        const hasAggregateColumns = this.hasAggregateColumns(columns);
        const canUseStorageAdapter = this.storageAdapter !== undefined && inputRows.length === 0 && !hasJoinNodes(optimization.optimizedFrom);
        const singleTableName = getSingleTableName(optimization.optimizedFrom);

        const result: any = {
            type: 'SelectResult',
            columns,
            distinct,
            from,
            where,
            orderBy,
            limit,
        };

        if (!canUseStorageAdapter || !singleTableName) {
            if (hasAggregateColumns) {
                const filteredRows = this.applyWhereFilter(inputRows, where);
                result.rows = [this.computeAggregateRow(columns, filteredRows)];
            }

            return result;
        }

        return (async () => {
            const projection = optimization.projectionByTable[singleTableName] ?? buildSelectProjection(columns);
            const filteredRows = await this.storageAdapter!.read(singleTableName, projection, compileStorageWherePredicate(where));

            if (hasAggregateColumns) {
                result.rows = [this.computeAggregateRow(columns, filteredRows)];
            } else {
                result.rows = filteredRows;
            }

            return result;
        })();
    }

    /**
     * Applies the optimizer pipeline to a SELECT AST node.
     */
    optimizeSelect(node: SelectStatement): SelectOptimizationResult {
        return this.selectOptimizer.optimize(node);
    }

    private normalizeWhereExpression(where?: ExpressionNode): ExpressionNode | undefined {
        if (!where) {
            return undefined;
        }

        if (where.type === 'LogicalExpression') {
            return {
                ...where,
                left: this.normalizeWhereExpression(where.left) as ExpressionNode,
                right: this.normalizeWhereExpression(where.right) as ExpressionNode,
            };
        }

        if (where.type === 'NotExpression') {
            return {
                ...where,
                expression: this.normalizeWhereExpression(where.expression) as ExpressionNode,
            };
        }

        return where;
    }

    private processFromClause(fromNodes: FromNode[]): any[] {
        return fromNodes.map(node => {
            if (node.type === 'Join') {
                return this.joinExecutor.executeJoin(node as JoinNode);
            }
            return node;
        });
    }

    /**
     * Validates SELECT clause structure and aggregate usage rules.
     */
    validateSelect(node: SelectStatement): void {
        if (!node.columns || node.columns.length === 0) {
            throw new Error('Invalid SELECT: no columns specified');
        }

        if (!node.from || node.from.length === 0) {
            throw new Error('Invalid SELECT: no FROM clause');
        }

        node.from.forEach(fromNode => {
            if (fromNode.type === 'Join') {
                this.joinExecutor.validateJoin(fromNode as JoinNode);
            }
        });

        this.validateAggregateColumns(node.columns);
    }

    private validateAggregateColumns(columns: SelectColumn[]): void {
        const hasAggregate = this.hasAggregateColumns(columns);
        const hasNonAggregate = columns.some(column => column.type !== 'AggregateFunction');

        if (hasAggregate && hasNonAggregate) {
            throw new Error('Invalid SELECT: cannot mix aggregate and non-aggregate columns without GROUP BY');
        }

        columns.forEach(column => {
            if (column.type !== 'AggregateFunction') {
                return;
            }

            if (column.argument.type === 'Wildcard' && column.functionName !== 'COUNT') {
                throw new Error('Only COUNT supports wildcard argument');
            }
        });
    }

    private hasAggregateColumns(columns: SelectColumn[]): boolean {
        return columns.some(column => column.type === 'AggregateFunction');
    }

    private applyWhereFilter(rows: Record<string, any>[], where?: ExpressionNode): Record<string, any>[] {
        if (!where) {
            return rows;
        }

        return rows.filter(row => this.evaluateWhereExpression(where, row));
    }

    private evaluateWhereExpression(expression: ExpressionNode, row: Record<string, any>): boolean {
        switch (expression.type) {
            case 'LogicalExpression':
                if (expression.operator === 'AND') {
                    return this.evaluateWhereExpression(expression.left, row) && this.evaluateWhereExpression(expression.right, row);
                }
                return this.evaluateWhereExpression(expression.left, row) || this.evaluateWhereExpression(expression.right, row);
            case 'NotExpression':
                return !this.evaluateWhereExpression(expression.expression, row);
            case 'ComparisonExpression': {
                const left = this.evaluateValueExpression(expression.left, row);
                const right = this.evaluateValueExpression(expression.right, row);
                return this.compareValues(left, right, expression.operator);
            }
            case 'NullCheckExpression': {
                const value = this.resolveIdentifierValue(row, expression.left);
                const isNullish = value === null || value === undefined;
                return expression.isNegated ? !isNullish : isNullish;
            }
            case 'InExpression': {
                const leftValue = this.resolveIdentifierValue(row, expression.left);
                const values = expression.values.map(valueNode => this.evaluateValueExpression(valueNode, row));
                return values.some(value => value === leftValue);
            }
            default:
                return false;
        }
    }

    private evaluateValueExpression(expression: ValueExpressionNode, row: Record<string, any>): any {
        switch (expression.type) {
            case 'Identifier':
                return this.resolveIdentifierValue(row, expression);
            case 'Literal':
                return expression.value;
            case 'ArithmeticExpression': {
                const left = this.evaluateValueExpression(expression.left, row);
                const right = this.evaluateValueExpression(expression.right, row);
                return this.applyArithmetic(left, right, expression.operator);
            }
            default:
                return undefined;
        }
    }

    private resolveIdentifierValue(row: Record<string, any>, identifier: IdentifierNode): any {
        const path = identifier.name.split('.');
        let current: any = row;

        for (const segment of path) {
            if (current === null || current === undefined) {
                return undefined;
            }

            if (typeof current !== 'object') {
                return undefined;
            }

            if (segment in current) {
                current = current[segment];
                continue;
            }

            const key = Object.keys(current).find(existingKey => existingKey.toUpperCase() === segment.toUpperCase());
            if (!key) {
                return undefined;
            }

            current = current[key];
        }

        return current;
    }

    private applyArithmetic(left: any, right: any, operator: '+' | '-' | '*' | '/'): number {
        if (typeof left !== 'number' || typeof right !== 'number') {
            throw new Error(`Invalid arithmetic operands: ${left} ${operator} ${right}`);
        }

        switch (operator) {
            case '+':
                return left + right;
            case '-':
                return left - right;
            case '*':
                return left * right;
            case '/':
                return left / right;
            default:
                throw new Error(`Unsupported arithmetic operator: ${operator}`);
        }
    }

    private compareValues(left: any, right: any, operator: '=' | '>' | '<' | '>=' | '<=' | '!='): boolean {
        switch (operator) {
            case '=':
                return left === right;
            case '!=':
                return left !== right;
            case '>':
                return left > right;
            case '<':
                return left < right;
            case '>=':
                return left >= right;
            case '<=':
                return left <= right;
            default:
                return false;
        }
    }

    private computeAggregateRow(columns: SelectColumn[], rows: Record<string, any>[]): Record<string, any> {
        const aggregateRow: Record<string, any> = {};

        columns.forEach(column => {
            if (column.type !== 'AggregateFunction') {
                return;
            }

            const key = this.getAggregateOutputKey(column);
            aggregateRow[key] = this.computeAggregateValue(column, rows);
        });

        return aggregateRow;
    }

    private getAggregateOutputKey(column: AggregateFunctionNode): string {
        if (column.argument.type === 'Wildcard') {
            return `${column.functionName}(*)`;
        }

        return `${column.functionName}(${column.argument.name})`;
    }

    private computeAggregateValue(column: AggregateFunctionNode, rows: Record<string, any>[]): number | string | null {
        if (column.argument.type === 'Wildcard') {
            if (column.functionName !== 'COUNT') {
                throw new Error('Only COUNT supports wildcard argument');
            }
            return rows.length;
        }

        const identifierArgument = column.argument;

        const values = rows
            .map(row => this.resolveIdentifierValue(row, identifierArgument))
            .filter(value => value !== null && value !== undefined);

        switch (column.functionName) {
            case 'COUNT':
                return values.length;
            case 'SUM': {
                this.assertAllNumeric(values, column.functionName, identifierArgument.name);
                if (values.length === 0) {
                    return null;
                }
                return (values as number[]).reduce((sum, value) => sum + value, 0);
            }
            case 'AVG': {
                this.assertAllNumeric(values, column.functionName, identifierArgument.name);
                if (values.length === 0) {
                    return null;
                }
                const total = (values as number[]).reduce((sum, value) => sum + value, 0);
                return total / values.length;
            }
            case 'MIN':
                return values.length === 0 ? null : values.reduce((min, value) => (value < min ? value : min));
            case 'MAX':
                return values.length === 0 ? null : values.reduce((max, value) => (value > max ? value : max));
            default:
                return null;
        }
    }

    private assertAllNumeric(values: any[], functionName: string, identifierName: string): void {
        const hasNonNumeric = values.some(value => typeof value !== 'number');
        if (hasNonNumeric) {
            throw new Error(`${functionName} requires numeric values for ${identifierName}`);
        }
    }
}
