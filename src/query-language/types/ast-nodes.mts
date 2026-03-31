// @author Tijn Gommers
// @date 2026-03-31

export interface TableNode {
    type: 'Table';
    name: string;
}

export interface IdentifierNode {
    type: 'Identifier';
    name: string;
}

export interface LiteralNode {
    type: 'Literal';
    valueType: 'number' | 'string' | 'null';
    value: string | number | null;
}

export interface WildcardNode {
    type: 'Wildcard';
    value: '*';
}

export type ComparisonOperator = '=' | '>' | '<' | '>=' | '<=' | '!=';
export type ArithmeticOperator = '+' | '-' | '*' | '/';
export type AggregateFunctionName = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export interface AggregateFunctionNode {
    type: 'AggregateFunction';
    functionName: AggregateFunctionName;
    argument: IdentifierNode | WildcardNode;
}

export type SelectColumn = IdentifierNode | AggregateFunctionNode;

export interface ArithmeticExpressionNode {
    type: 'ArithmeticExpression';
    left: ValueExpressionNode;
    operator: ArithmeticOperator;
    right: ValueExpressionNode;
}

export type ValueExpressionNode = IdentifierNode | LiteralNode | ArithmeticExpressionNode | AggregateFunctionNode;
export type ValueNode = IdentifierNode | LiteralNode;

export interface ComparisonNode {
    type: 'ComparisonExpression';
    left: ValueExpressionNode;
    operator: ComparisonOperator;
    right: ValueExpressionNode;
}

export interface LogicalNode {
    type: 'LogicalExpression';
    operator: 'AND' | 'OR' | 'NOT';
    left: ExpressionNode;
    right: ExpressionNode;
}

export interface NotExpressionNode {
    type: 'NotExpression';
    operator: 'NOT';
    expression: ExpressionNode;
}

export interface NullCheckExpressionNode {
    type: 'NullCheckExpression';
    left: IdentifierNode;
    isNegated: boolean;
}

export interface InExpressionNode {
    type: 'InExpression';
    left: IdentifierNode;
    values: ValueNode[];
}

export type ExpressionNode =
    | ComparisonNode
    | LogicalNode
    | NotExpressionNode
    | NullCheckExpressionNode
    | InExpressionNode;

export interface JoinNode {
    type: 'Join';
    table: TableNode;
    joinType: 'CROSS' | 'INNER' | 'LEFT' | 'RIGHT' | 'OUTER';
    on: ComparisonNode;
}

export type FromNode = TableNode | JoinNode;
