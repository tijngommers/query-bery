// @author Tijn Gommers
// @date 2026-03-30

import {
    ComparisonOperator,
    IdentifierNode,
    LiteralNode,
    TokenType,
} from '../types/index.mts';
import { ParserCursor } from './parser-cursor.mts';

export class ValueParser {
    private cursor: ParserCursor;

    constructor(cursor: ParserCursor) {
        this.cursor = cursor;
    }

    parseComparisonOperator(): ComparisonOperator {
        switch (this.cursor.currentType()) {
            case TokenType.EQUALS:
                this.cursor.eat(TokenType.EQUALS);
                return '=';
            case TokenType.GREATER_THAN:
                this.cursor.eat(TokenType.GREATER_THAN);
                return '>';
            case TokenType.LESS_THAN:
                this.cursor.eat(TokenType.LESS_THAN);
                return '<';
            case TokenType.GREATER_THAN_OR_EQUALS:
                this.cursor.eat(TokenType.GREATER_THAN_OR_EQUALS);
                return '>=';
            case TokenType.LESS_THAN_OR_EQUALS:
                this.cursor.eat(TokenType.LESS_THAN_OR_EQUALS);
                return '<=';
            case TokenType.NOT_EQUALS:
                this.cursor.eat(TokenType.NOT_EQUALS);
                return '!=';
            default:
                throw new Error(`Expected comparison operator but got ${this.cursor.currentType()}`);
        }
    }

    parseValueNode(): IdentifierNode | LiteralNode {
        const tokenType = this.cursor.currentType();
        const tokenValue = this.cursor.currentValue();

        if (tokenType === TokenType.NUMBER) {
            this.cursor.eat(TokenType.NUMBER);
            return {
                type: 'Literal',
                valueType: 'number',
                value: Number(tokenValue),
            };
        }

        if (tokenType === TokenType.STRING) {
            this.cursor.eat(TokenType.STRING);
            return {
                type: 'Literal',
                valueType: 'string',
                value: tokenValue,
            };
        }

        if (tokenType === TokenType.IDENTIFIER) {
            return this.parseIdentifierNode('WHERE clause');
        }

        if (tokenType === TokenType.NULL) {
            this.cursor.eat(TokenType.NULL);
            return {
                type: 'Literal',
                valueType: 'null',
                value: null,
            };
        }

        throw new Error(`Expected value in WHERE clause but got ${tokenType}`);
    }

    parseIdentifierNode(errorContext: string = 'WHERE clause'): IdentifierNode {
        if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected identifier in ${errorContext} but got ${this.cursor.currentType()}`);
        }

        let name = this.cursor.currentValue();
        this.cursor.eat(TokenType.IDENTIFIER);

        while (this.cursor.currentType() === TokenType.DOT) {
            this.cursor.eat(TokenType.DOT);
            if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected identifier after dot but got ${this.cursor.currentType()}`);
            }

            name = `${name}.${this.cursor.currentValue()}`;
            this.cursor.eat(TokenType.IDENTIFIER);
        }

        return {
            type: 'Identifier',
            name,
        };
    }
}
