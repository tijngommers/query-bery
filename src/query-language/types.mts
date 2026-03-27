// @author Tijn Gommers
// @date 2026-03-17

export enum TokenType {
    SELECT = 'SELECT',
    DELETE = 'DELETE',
    FROM = 'FROM',
    WHERE = 'WHERE',
    AND = 'AND',
    OR = 'OR',
    IDENTIFIER = 'IDENTIFIER',
    NUMBER = 'NUMBER',
    EQUALS = 'EQUALS',
    GREATER_THAN = 'GREATER_THAN',
    GREATER_THAN_OR_EQUALS = 'GREATER_THAN_OR_EQUALS',
    LESS_THAN = 'LESS_THAN',
    LESS_THAN_OR_EQUALS = 'LESS_THAN_OR_EQUALS',
    EOF = 'EOF',
    STRING = 'STRING',
    COMMA = 'COMMA',
    STAR = 'STAR',
    NOT = 'NOT',
    NOT_EQUALS = 'NOT_EQUALS',
    IS = 'IS',
    NULL = 'NULL',
    ORDER = 'ORDER',
    BY = 'BY',
    ASC = 'ASC',
    DESC = 'DESC',
    CROSS = 'CROSS',
    JOIN = 'JOIN',
    ON = 'ON',
    DOT = 'DOT',
    INNER = 'INNER',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    OUTER = 'OUTER',
    LIMIT = 'LIMIT',
    OFFSET = 'OFFSET',
    DISTINCT = 'DISTINCT',
    IN = 'IN',
    LEFT_PAREN = 'LEFT_PAREN',
    RIGHT_PAREN = 'RIGHT_PAREN'
}

export interface Token {
    type: TokenType;
    value: string;
}

export type ASTNode = SelectStatement | DeleteStatement;

export interface SelectStatement {
    type: 'SelectStatement';
    distinct: boolean;
    columns: IdentifierNode[];
    from: FromNode[];
    where?: ExpressionNode;
    orderBy?: OrderByStatement;
    limit?: LimitOffsetNode;
}

export interface DeleteStatement {
    type: 'DeleteStatement';
    from: TableNode[];
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
    type: "Literal";
    valueType: "number" | "string" | "null";
    value: string | number | null;
}

export type ExpressionNode = ComparisonNode | LogicalNode | NotExpressionNode |  NullCheckExpressionNode | InExpressionNode;
export type ComparisonOperator = '=' | '>' | '<' | '>=' | '<=' | '!=';
export type ValueNode = IdentifierNode | LiteralNode;

export interface ComparisonNode {
    type: "ComparisonExpression";
    left: IdentifierNode;
    operator: ComparisonOperator;
    right: ValueNode;
}

export interface LogicalNode {
    type: "LogicalExpression";
    operator: "AND" | "OR" | "NOT";
    left: ExpressionNode;
    right: ExpressionNode;
}

export interface NotExpressionNode {
    type: "NotExpression";
    operator: "NOT";
    expression: ExpressionNode;
}

export interface NullCheckExpressionNode {
    type: "NullCheckExpression";
    left: IdentifierNode;
    isNegated: boolean; // true for IS NOT NULL, false for IS NULL
}

export interface JoinNode {
    type: "Join";
    table: TableNode;
    joinType: "CROSS" | "INNER" | "LEFT" | "RIGHT" | "OUTER";
    on: ComparisonNode;
}

export interface InExpressionNode {
    type: "InExpression";
    left: IdentifierNode;
    values: ValueNode[];
}
    