// @author Tijn Gommers
// @date 2026-03-30

export type ASTNode = SelectStatement | DeleteStatement | InsertStatement | UpdateStatement;

export interface SelectStatement {
    type: 'SelectStatement';
    distinct: boolean;
    columns: SelectColumn[];
    groupBy?: IdentifierNode[];
    from: FromNode[];
    where?: ExpressionNode;
    having?: ExpressionNode;
    orderBy?: OrderByStatement;
    limit?: LimitOffsetNode;
}

export interface DeleteStatement {
    type: 'DeleteStatement';
    from: TableNode[];
    where?: ExpressionNode;
}

export interface InsertStatement {
    type: 'InsertStatement';
    table: TableNode;
    columns: IdentifierNode[];
    values: ValueNode[][];
}
    
export interface UpdateStatement {
    type: 'UpdateStatement';
    table: TableNode;
    set: { column: IdentifierNode; value: ValueNode }[];
    where?: ExpressionNode;
}

export interface OrderByStatement {
    type: 'OrderByStatement';
    columns: IdentifierNode[];
    direction?: 'ASC' | 'DESC';
}

export interface LimitOffsetNode {
    type: 'LimitOffset';
    limit: number;
    offset?: number;
}

export interface TableNode {
    type: 'Table';
    name: string;
}

export type FromNode = TableNode | JoinNode;

export interface IdentifierNode {
    type: 'Identifier';
    name: string;
}

export interface LiteralNode {
    type: 'Literal';
    valueType: 'number' | 'string' | 'null';
    value: string | number | null;
}

export type ExpressionNode = ComparisonNode | LogicalNode | NotExpressionNode | NullCheckExpressionNode | InExpressionNode;
export type ComparisonOperator = '=' | '>' | '<' | '>=' | '<=' | '!=';
export type ArithmeticOperator = '+' | '-' | '*' | '/';
export type AggregateFunctionName = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
export type SelectColumn = IdentifierNode | AggregateFunctionNode;

export interface WildcardNode {
    type: 'Wildcard';
    value: '*';
}

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

export interface JoinNode {
    type: 'Join';
    table: TableNode;
    joinType: 'CROSS' | 'INNER' | 'LEFT' | 'RIGHT' | 'OUTER';
    on: ComparisonNode;
}

export interface InExpressionNode {
    type: 'InExpression';
    left: IdentifierNode;
    values: ValueNode[];
}

export interface AggregateFunctionNode {
    type: 'AggregateFunction';
    functionName: AggregateFunctionName;
    argument: IdentifierNode | WildcardNode;
}