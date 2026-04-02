//@author Tijn Gommers
//@date 2026-04-02

import {
    ComparisonNode,
    ExpressionNode,
    FromNode,
    IdentifierNode,
    JoinNode,
    SelectColumn,
    SelectStatement,
    TableNode,
    ValueExpressionNode,
} from '../../types/index.mjs';

export interface SelectOptimizationResult {
    cascadedSelections: ExpressionNode[];
    orderedSelections: ExpressionNode[];
    pushedSelectionsByTable: Record<string, ExpressionNode[]>;
    residualSelections: ExpressionNode[];
    projectionByTable: Record<string, string[]>;
    introducedJoins: JoinNode[];
    optimizedFrom: FromNode[];
    optimizedWhere?: ExpressionNode;
}

export class SelectOptimizer {
    optimize(statement: SelectStatement): SelectOptimizationResult {
        const cascadedSelections = this.cascadeSelections(statement.where);
        const orderedSelections = this.commutateSelections(cascadedSelections);

        const { optimizedFrom, introducedJoins, remainingSelections } = this.introduceJoins(statement.from, orderedSelections);
        const { pushedSelectionsByTable, residualSelections } = this.pushSelections(optimizedFrom, remainingSelections);
        const projectionByTable = this.pushProjection(statement.columns, optimizedFrom, pushedSelectionsByTable, residualSelections, introducedJoins);

        return {
            cascadedSelections,
            orderedSelections,
            pushedSelectionsByTable,
            residualSelections,
            projectionByTable,
            introducedJoins,
            optimizedFrom,
            optimizedWhere: this.composeAndExpression(remainingSelections),
        };
    }

    private cascadeSelections(where?: ExpressionNode): ExpressionNode[] {
        if (!where) {
            return [];
        }

        if (where.type === 'LogicalExpression' && where.operator === 'AND') {
            return [
                ...this.cascadeSelections(where.left),
                ...this.cascadeSelections(where.right),
            ];
        }

        return [where];
    }

    private commutateSelections(selections: ExpressionNode[]): ExpressionNode[] {
        return [...selections].sort((left, right) => {
            const leftTables = this.getReferencedTables(left).size;
            const rightTables = this.getReferencedTables(right).size;

            if (leftTables !== rightTables) {
                return leftTables - rightTables;
            }

            return this.expressionComplexity(left) - this.expressionComplexity(right);
        });
    }

    private pushSelections(from: FromNode[], selections: ExpressionNode[]): {
        pushedSelectionsByTable: Record<string, ExpressionNode[]>;
        residualSelections: ExpressionNode[];
    } {
        const tableNames = this.extractTableNames(from);
        const pushedSelectionsByTable: Record<string, ExpressionNode[]> = {};
        tableNames.forEach(table => {
            pushedSelectionsByTable[table] = [];
        });

        const residualSelections: ExpressionNode[] = [];

        selections.forEach(selection => {
            const referencedTables = Array.from(this.getReferencedTables(selection));

            if (referencedTables.length === 1 && tableNames.includes(referencedTables[0])) {
                pushedSelectionsByTable[referencedTables[0]].push(selection);
                return;
            }

            residualSelections.push(selection);
        });

        return { pushedSelectionsByTable, residualSelections };
    }

    private pushProjection(
        columns: SelectColumn[],
        from: FromNode[],
        pushedSelectionsByTable: Record<string, ExpressionNode[]>,
        residualSelections: ExpressionNode[],
        introducedJoins: JoinNode[],
    ): Record<string, string[]> {
        const tableNames = this.extractTableNames(from);
        const projectionByTable: Record<string, Set<string>> = {};

        tableNames.forEach(table => {
            projectionByTable[table] = new Set<string>();
        });

        if (columns.some(column => column.type === 'Identifier' && column.name === '*')) {
            return this.materializeWildcardProjection(tableNames);
        }

        columns.forEach(column => {
            if (column.type === 'Identifier') {
                this.addIdentifierToProjection(column, projectionByTable, tableNames);
                return;
            }

            if (column.argument.type === 'Wildcard') {
                tableNames.forEach(table => projectionByTable[table].add('*'));
                return;
            }

            this.addIdentifierToProjection(column.argument, projectionByTable, tableNames);
        });

        Object.entries(pushedSelectionsByTable).forEach(([table, selections]) => {
            selections.forEach(selection => {
                this.collectIdentifiersFromExpression(selection).forEach(identifier => {
                    this.addIdentifierToProjection(identifier, projectionByTable, tableNames, table);
                });
            });
        });

        residualSelections.forEach(selection => {
            this.collectIdentifiersFromExpression(selection).forEach(identifier => {
                this.addIdentifierToProjection(identifier, projectionByTable, tableNames);
            });
        });

        introducedJoins.forEach(join => {
            this.collectIdentifiersFromExpression(join.on).forEach(identifier => {
                this.addIdentifierToProjection(identifier, projectionByTable, tableNames);
            });
        });

        const materialized: Record<string, string[]> = {};
        tableNames.forEach(table => {
            materialized[table] = Array.from(projectionByTable[table]);
        });

        return materialized;
    }

    private introduceJoins(from: FromNode[], selections: ExpressionNode[]): {
        optimizedFrom: FromNode[];
        introducedJoins: JoinNode[];
        remainingSelections: ExpressionNode[];
    } {
        const workingFrom: FromNode[] = [...from];
        const introducedJoins: JoinNode[] = [];
        const remainingSelections: ExpressionNode[] = [];

        selections.forEach(selection => {
            const joinCandidate = this.toJoinCandidate(selection, workingFrom);
            if (!joinCandidate) {
                remainingSelections.push(selection);
                return;
            }

            const { rightTable, joinNode } = joinCandidate;
            const rightIndex = workingFrom.findIndex(node => node.type === 'Table' && node.name === rightTable);

            if (rightIndex === -1) {
                remainingSelections.push(selection);
                return;
            }

            workingFrom.splice(rightIndex, 1);
            workingFrom.push(joinNode);
            introducedJoins.push(joinNode);
        });

        return {
            optimizedFrom: workingFrom,
            introducedJoins,
            remainingSelections,
        };
    }

    private toJoinCandidate(selection: ExpressionNode, from: FromNode[]): { rightTable: string; joinNode: JoinNode } | undefined {
        if (selection.type !== 'ComparisonExpression' || selection.operator !== '=') {
            return undefined;
        }

        if (selection.left.type !== 'Identifier' || selection.right.type !== 'Identifier') {
            return undefined;
        }

        const leftTable = this.identifierTable(selection.left.name);
        const rightTable = this.identifierTable(selection.right.name);

        if (!leftTable || !rightTable || leftTable === rightTable) {
            return undefined;
        }

        const tablesInFrom = this.extractTableNames(from);
        if (!tablesInFrom.includes(leftTable) || !tablesInFrom.includes(rightTable)) {
            return undefined;
        }

        return {
            rightTable,
            joinNode: {
                type: 'Join',
                joinType: 'INNER',
                table: { type: 'Table', name: rightTable },
                on: selection as ComparisonNode,
            },
        };
    }

    private composeAndExpression(expressions: ExpressionNode[]): ExpressionNode | undefined {
        if (expressions.length === 0) {
            return undefined;
        }

        return expressions.reduce((left, right) => {
            return {
                type: 'LogicalExpression',
                operator: 'AND',
                left,
                right,
            };
        });
    }

    private collectIdentifiersFromExpression(expression: ExpressionNode): IdentifierNode[] {
        switch (expression.type) {
            case 'ComparisonExpression':
                return [
                    ...this.collectIdentifiersFromValueExpression(expression.left),
                    ...this.collectIdentifiersFromValueExpression(expression.right),
                ];
            case 'LogicalExpression':
                return [
                    ...this.collectIdentifiersFromExpression(expression.left),
                    ...this.collectIdentifiersFromExpression(expression.right),
                ];
            case 'NotExpression':
                return this.collectIdentifiersFromExpression(expression.expression);
            case 'NullCheckExpression':
                return [expression.left];
            case 'InExpression':
                return [expression.left];
            default:
                return [];
        }
    }

    private collectIdentifiersFromValueExpression(expression: ValueExpressionNode): IdentifierNode[] {
        switch (expression.type) {
            case 'Identifier':
                return [expression];
            case 'ArithmeticExpression':
                return [
                    ...this.collectIdentifiersFromValueExpression(expression.left),
                    ...this.collectIdentifiersFromValueExpression(expression.right),
                ];
            case 'AggregateFunction':
                return expression.argument.type === 'Identifier' ? [expression.argument] : [];
            default:
                return [];
        }
    }

    private addIdentifierToProjection(
        identifier: IdentifierNode,
        projectionByTable: Record<string, Set<string>>,
        tableNames: string[],
        fallbackTable?: string,
    ): void {
        const explicitTable = this.identifierTable(identifier.name);
        if (explicitTable && projectionByTable[explicitTable]) {
            projectionByTable[explicitTable].add(this.identifierColumn(identifier.name));
            return;
        }

        if (fallbackTable && projectionByTable[fallbackTable]) {
            projectionByTable[fallbackTable].add(this.identifierColumn(identifier.name));
            return;
        }

        if (tableNames.length === 1) {
            projectionByTable[tableNames[0]].add(this.identifierColumn(identifier.name));
        }
    }

    private getReferencedTables(expression: ExpressionNode): Set<string> {
        const identifiers = this.collectIdentifiersFromExpression(expression);
        const tables = new Set<string>();

        identifiers.forEach(identifier => {
            const table = this.identifierTable(identifier.name);
            if (table) {
                tables.add(table);
            }
        });

        return tables;
    }

    private extractTableNames(from: FromNode[]): string[] {
        const names: string[] = [];

        from.forEach(node => {
            if (node.type === 'Table') {
                names.push(node.name);
                return;
            }

            names.push(node.table.name);
        });

        return names;
    }

    private expressionComplexity(expression: ExpressionNode): number {
        switch (expression.type) {
            case 'ComparisonExpression':
                return 1;
            case 'NullCheckExpression':
            case 'InExpression':
                return 2;
            case 'NotExpression':
                return 3;
            case 'LogicalExpression':
                return 4;
            default:
                return 5;
        }
    }

    private identifierTable(name: string): string | undefined {
        const split = name.split('.');
        if (split.length < 2) {
            return undefined;
        }

        return split[0];
    }

    private identifierColumn(name: string): string {
        const split = name.split('.');
        return split[split.length - 1];
    }

    private materializeWildcardProjection(tableNames: string[]): Record<string, string[]> {
        const projection: Record<string, string[]> = {};
        tableNames.forEach(table => {
            projection[table] = ['*'];
        });
        return projection;
    }
}