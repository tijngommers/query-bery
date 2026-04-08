//@author Tijn Gommers
//@date 2026-04-02

import type {
    AggregateFunctionNode,
    ExpressionNode,
    FromNode,
    IdentifierNode,
    JoinNode,
    SelectColumn,
    SelectStatement,
    ValueExpressionNode,
} from '../../types/index.mjs';
import type { SelectResult, SelectFromItem } from '../../types/execution-results.mjs';
import { JoinExecutor } from '../join/index.mjs';
import type { StorageAdapter } from '../../../storage-adapter/storage-adapter.mjs';
import {
    buildSelectProjection,
    compileStorageWherePredicate,
    getSingleTableName,
    hasJoinNodes,
} from '../storage-adapter-helpers.mjs';
import type { SelectOptimizationResult } from './select-optimizer.mjs';
import { SelectOptimizer } from './select-optimizer.mjs';

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
     * @returns {SelectResult | Promise<SelectResult>} The result of the SELECT execution, either synchronously or as a promise if storage adapter is used.
     */
    executeSelect(node: SelectStatement, inputRows: Record<string, any>[] = []): SelectResult | Promise<SelectResult> {
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

        const result: SelectResult = {
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
     * @param node Parsed SELECT statement AST node to optimize.
     * @returns {SelectOptimizationResult} The result of the optimization process, including transformed AST nodes and metadata for execution.
     */
    optimizeSelect(node: SelectStatement): SelectOptimizationResult {
        return this.selectOptimizer.optimize(node);
    }

    /**
     * Processes the FROM clause of a SELECT statement, normalizing JOIN nodes into executable metadata and validating their structure.
     * @param fromNodes fromNodes array of FROM clause nodes, which can include table references and JOIN nodes, to be processed into a normalized form for execution.
     * @returns {SelectFromItem[]} An array of normalized FROM clause items, where JOIN nodes have been transformed into executable metadata objects and table references are returned as-is.
     */
    private processFromClause(fromNodes: FromNode[]): SelectFromItem[] {
        return fromNodes.map(node => {
            if (node.type === 'Join') {
                return this.joinExecutor.executeJoin(node as JoinNode) as SelectFromItem;
            }
            return node;
        });
    }

    /**
     * Validates SELECT clause structure and aggregate usage rules.
     * @param node Parsed SELECT statement AST node.
     * @returns {void}
     * @throws {Error} When SELECT clause structure is invalid.
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

    /**
     * Validates that aggregate functions are used correctly in the SELECT clause.
     * @param columns Array of selected columns.
     * @returns {void}
     * @throws {Error} When aggregate usage rules are violated.
     */
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

    /**
     * Helper to check if any columns in the SELECT clause are aggregate functions.
     * @param columns columns to check for aggregate functions.
     * @returns {boolean} True if at least one column is an aggregate function, false otherwise.
     */
    private hasAggregateColumns(columns: SelectColumn[]): boolean {
        return columns.some(column => column.type === 'AggregateFunction');
    }

    /**
     * Applies the WHERE clause filter to a set of rows.
     * @param rows rows to filter based on the WHERE expression.
     * @param where where expression to evaluate for each row. If undefined, no filtering is applied.
     * @returns {Record<string, any>[]} Filtered rows that satisfy the WHERE condition.
     */
    private applyWhereFilter(rows: Record<string, any>[], where?: ExpressionNode): Record<string, any>[] {
        if (!where) {
            return rows;
        }

        return rows.filter(row => this.evaluateWhereExpression(where, row));
    }

    /**
     * Evaluates a WHERE clause expression against a single row of data.
     * @param expression expression node representing the WHERE clause condition to evaluate.
     * @param row row of data against which the expression should be evaluated, with column names as keys.
     * @returns {boolean} True if the row satisfies the expression condition, false otherwise.
     */
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

    /**
     * Evaluates a value expression (identifier, literal, arithmetic expression, or aggregate function) against a single row of data.
     * @param expression expression node representing the value to evaluate, which can be an identifier, literal, arithmetic expression, or aggregate function.
     * @param row row of data against which the expression should be evaluated, with column names as keys.
     * @returns {any} The evaluated value of the expression for the given row, which can be a primitive value or an aggregate result depending on the expression type.
     */
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

    /**
     * Resolves the value of an identifier from a row of data, supporting nested properties using dot notation.
     * @param row row of data with column names as keys, potentially containing nested objects for dot notation access.
     * @param identifier identifier node whose value should be resolved from the row, where the name can include dot notation for nested properties (e.g., "table.column").
     * @returns {any} The resolved value of the identifier from the row, or undefined if any part of the path does not exist.
     */
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

    /**
     * Applies an arithmetic operation to two values based on the specified operator.
     * @param left left operand value, expected to be a number for valid operations.
     * @param right right operand value, expected to be a number for valid operations.
     * @param operator one of the supported arithmetic operators: '+', '-', '*', or '/'.
     * @returns {number} The result of applying the arithmetic operator to the left and right operand values.
     * @throws {Error} When either operand is not a number or when an unsupported operator is provided.
     */
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

    /**
     * Compares two values based on a comparison operator.
     * @param left left operand value, which can be a number, string, or null.
     * @param right right operand value, which can be a number, string, or null.
     * @param operator one of the supported comparison operators: '=', '!=', '>', '<', '>=', or '<='.
     * @returns {boolean} The result of the comparison between the left and right operand values based on the specified operator.
     * @throws {Error} When an unsupported operator is provided.
     */
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
                throw new Error(`Unsupported comparison operator: ${operator}`);
        }
    }

    /**
     * Computes the result of aggregate functions for a set of rows based on the specified aggregate columns.
     * @param columns columns from the SELECT clause, which may include aggregate function nodes that specify the type of aggregation and the argument to aggregate.
     * @param rows rows of data to aggregate, where each row is an object with column names as keys and their corresponding values.
     * @returns {Record<string, any>} An object representing the computed aggregate values for each aggregate column, where the keys are derived from the aggregate function and its argument (e.g., "COUNT(columnName)") and the values are the results of the aggregation.
     */
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

    /**
     * generates a unique key for the output of an aggregate function based on its type and argument, which is used as the column name in the result set for the computed aggregate value.
     * @param column column node representing the aggregate function, which includes the function name (e.g., COUNT, SUM) and its argument (which can be an identifier or a wildcard).
     * @returns {string} A string key that uniquely identifies the aggregate function and its argument, formatted as "FUNCTION(argument)" (e.g., "COUNT(columnName)" or "SUM(columnName)"), which is used as the column name in the result set for the computed aggregate value.
     */
    private getAggregateOutputKey(column: AggregateFunctionNode): string {
        if (column.argument.type === 'Wildcard') {
            return `${column.functionName}(*)`;
        }

        return `${column.functionName}(${column.argument.name})`;
    }

    /**
     * Computes the value of an aggregate function for a set of rows based on the specified column and function.
     * @param column column node representing the aggregate function, which includes the function name (e.g., COUNT, SUM) and its argument (which can be an identifier or a wildcard).
     * @param rows rows of data to aggregate, where each row is an object with column names as keys and their corresponding values.
     * @returns {number | string | null} The computed aggregate value based on the specified function and argument.
     */
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

    /**
     * Asserts that all values in an array are numeric, throwing an error if any non-numeric value is found. This is used to validate arguments for aggregate functions like SUM and AVG that require numeric input.
     * @param values values to check for numeric type, which are the results of evaluating the argument of an aggregate function across all rows being aggregated.
     * @param functionName functionName is the name of the aggregate function for which the values are being validated (e.g., "SUM" or "AVG"), used in the error message if validation fails.
     * @param identifierName identifierName is the name of the identifier argument being aggregated (e.g., "columnName"), used in the error message if validation fails to indicate which column has non-numeric values.
     */
    private assertAllNumeric(values: any[], functionName: string, identifierName: string): void {
        const hasNonNumeric = values.some(value => typeof value !== 'number');
        if (hasNonNumeric) {
            throw new Error(`${functionName} requires numeric values for ${identifierName}`);
        }
    }
}
