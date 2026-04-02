//@author Tijn Gommers
//@date 2026-04-02

import {
    ExpressionNode,
    FromNode,
    SelectColumn,
    ValueExpressionNode,
    ValueNode,
} from '../types/index.mjs';

export function compileStorageWherePredicate(expression?: ExpressionNode): Record<string, any> | undefined {
    if (!expression) {
        return undefined;
    }

    switch (expression.type) {
        case 'LogicalExpression':
            return {
                type: 'LogicalExpression',
                operator: expression.operator,
                left: compileStorageWherePredicate(expression.left),
                right: compileStorageWherePredicate(expression.right),
            };
        case 'NotExpression':
            return {
                type: 'NotExpression',
                operator: expression.operator,
                expression: compileStorageWherePredicate(expression.expression),
            };
        case 'ComparisonExpression':
            return {
                type: 'ComparisonExpression',
                operator: expression.operator,
                left: compileStorageValueExpression(expression.left),
                right: compileStorageValueExpression(expression.right),
            };
        case 'NullCheckExpression':
            return {
                type: 'NullCheckExpression',
                column: expression.left.name,
                isNegated: expression.isNegated,
            };
        case 'InExpression':
            return {
                type: 'InExpression',
                column: expression.left.name,
                values: expression.values.map(value => compileStorageValueNode(value)),
            };
        default:
            return undefined;
    }
}

export function compileStorageValueExpression(expression: ValueExpressionNode): Record<string, any> | string | number | null {
    switch (expression.type) {
        case 'Identifier':
            return expression.name;
        case 'Literal':
            return expression.value;
        case 'AggregateFunction':
            return {
                type: 'AggregateFunction',
                functionName: expression.functionName,
                argument: expression.argument.type === 'Wildcard' ? '*' : expression.argument.name,
            };
        case 'ArithmeticExpression':
            return {
                type: 'ArithmeticExpression',
                operator: expression.operator,
                left: compileStorageValueExpression(expression.left),
                right: compileStorageValueExpression(expression.right),
            };
        default:
            return undefined as never;
    }
}

export function compileStorageValueNode(value: ValueNode): string | number | null {
    if (value.type === 'Literal') {
        return value.value;
    }

    return value.name;
}

export function buildSelectProjection(columns: SelectColumn[]): string[] {
    const projection = new Set<string>();

    for (const column of columns) {
        if (column.type === 'Identifier') {
            if (column.name === '*') {
                return ['*'];
            }

            projection.add(column.name);
            continue;
        }

        if (column.argument.type === 'Wildcard') {
            return ['*'];
        }

        projection.add(column.argument.name);
    }

    return projection.size > 0 ? Array.from(projection) : ['*'];
}

export function getSingleTableName(from: FromNode[]): string | undefined {
    if (from.length !== 1) {
        return undefined;
    }

    const firstNode = from[0];
    if (firstNode.type !== 'Table') {
        return undefined;
    }

    return firstNode.name;
}

export function hasJoinNodes(from: FromNode[]): boolean {
    return from.some(node => node.type === 'Join');
}
