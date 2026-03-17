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
    LESS_THAN = 'LESS_THAN',
    EOF = 'EOF',
    STRING = 'STRING',

}

export interface Token {
    type: TokenType;
    value: string;
}

export type ASTNode = 
  | { type: 'SelectStatement'; table: string; columns: string[]; where?: BinaryExpression }
    | { type: 'DeleteStatement'; table: string; where?: BinaryExpression };


export interface BinaryExpression {
    left: string;
    operator: string;
    right: string | number;
}