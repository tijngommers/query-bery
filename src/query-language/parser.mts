// @author Tijn Gommers
// @date 2026-03-17

import {
    ASTNode,
    ComparisonNode,
    ComparisonOperator,
    DeleteStatement,
    ExpressionNode,
    IdentifierNode,
    LiteralNode,
    LogicalNode,
    SelectStatement,
    Token,
    TokenType,
} from "./types.mts";
import { Lexer } from "./lexer.mts";

export class Parser {
    private lexer: Lexer;
    private currentToken: Token;

    constructor(lexer: Lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.nextToken();
    }

    parse(): ASTNode {
        if (this.currentToken.type === TokenType.SELECT) {
            return this.parseSelect();
        } else if (this.currentToken.type === TokenType.DELETE) {
            return this.parseDelete();
        } else {
            throw new Error(`Unexpected token: ${this.currentToken.type}`);
        }
    }

    private parseSelect(): SelectStatement {
        this.eat(TokenType.SELECT);

        const columns: IdentifierNode[] = [];

        if (this.currentType() === TokenType.STAR) {
            columns.push({ type: 'Identifier', name: '*' });
            this.eat(TokenType.STAR);
        } else {
            if (this.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected at least one column after SELECT but got ${this.currentType()}`);
            }

            columns.push(this.parseIdentifierNode());
            this.eat(TokenType.IDENTIFIER);

            while (this.currentType() === TokenType.COMMA) {
                this.eat(TokenType.COMMA);
                if (this.currentType() !== TokenType.IDENTIFIER) {
                    throw new Error(`Expected column name after COMMA but got ${this.currentType()}`);
                }
                columns.push(this.parseIdentifierNode());
                this.eat(TokenType.IDENTIFIER);
            }
        }

        const from = this.parseFrom();
        const nextType = this.currentType();

        if (nextType === TokenType.WHERE) {
            const where = this.parseWhere();
            return { type: 'SelectStatement', from, columns, where };
        }
        return { type: 'SelectStatement', from, columns, where: undefined };

    }

    private parseDelete(): DeleteStatement {
        this.eat(TokenType.DELETE);

        const from = this.parseFrom();
        const nextType = this.currentType();

        if (nextType === TokenType.WHERE) {
            const where = this.parseWhere();
            return { type: 'DeleteStatement', from, where };
        }

        return { type: 'DeleteStatement', from, where: undefined };
    }

    private parseFrom(): { type: 'Table'; name: string } {
        this.eat(TokenType.FROM);
        const table = this.currentToken.value;
        this.eat(TokenType.IDENTIFIER);
        return { type: 'Table', name: table };
    }

    private parseWhere(): ExpressionNode {
        this.eat(TokenType.WHERE);
        return this.parseLogicalExpression();
    }

    private parseLogicalExpression(): ExpressionNode {
        let left: ExpressionNode = this.parseComparisonExpression();

        while (this.currentToken.type === TokenType.AND || this.currentToken.type === TokenType.OR) {
            const operator = this.currentToken.type === TokenType.AND ? 'AND' : 'OR';
            this.eat(this.currentToken.type);
            const right = this.parseComparisonExpression();
            left = {
                type: 'LogicalExpression',
                operator,
                left,
                right,
            };
        }

        return left;
    }

    private parseComparisonExpression(): ComparisonNode {
        const left = this.parseIdentifierNode();
        this.eat(TokenType.IDENTIFIER);

        const operator = this.parseComparisonOperator();
        const right = this.parseValueNode();

        return {
            type: 'ComparisonExpression',
            left,
            operator,
            right,
        };
    }

    private parseComparisonOperator(): ComparisonOperator {
        switch (this.currentToken.type) {
            case TokenType.EQUALS:
                this.eat(TokenType.EQUALS);
                return '=';
            case TokenType.GREATER_THAN:
                this.eat(TokenType.GREATER_THAN);
                return '>';
            case TokenType.LESS_THAN:
                this.eat(TokenType.LESS_THAN);
                return '<';
            case TokenType.GREATER_THAN_OR_EQUALS:
                this.eat(TokenType.GREATER_THAN_OR_EQUALS);
                return '>=';
            case TokenType.LESS_THAN_OR_EQUALS:
                this.eat(TokenType.LESS_THAN_OR_EQUALS);
                return '<=';
            default:
                throw new Error(`Expected comparison operator but got ${this.currentToken.type}`);
        }
    }

    private parseValueNode(): IdentifierNode | LiteralNode {
        const token = this.currentToken;

        if (token.type === TokenType.NUMBER) {
            this.eat(TokenType.NUMBER);
            return {
                type: 'Literal',
                valueType: 'number',
                value: Number(token.value),
            };
        }

        if (token.type === TokenType.STRING) {
            this.eat(TokenType.STRING);
            return {
                type: 'Literal',
                valueType: 'string',
                value: token.value,
            };
        }

        if (token.type === TokenType.IDENTIFIER) {
            this.eat(TokenType.IDENTIFIER);
            return {
                type: 'Identifier',
                name: token.value,
            };
        }

        throw new Error(`Expected value in WHERE clause but got ${token.type}`);
    }

    private parseIdentifierNode(): IdentifierNode {
        if (this.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected identifier in WHERE clause but got ${this.currentType()}`);
        }
        return {
            type: 'Identifier',
            name: this.currentToken.value,
        };
    }

    private currentType(): TokenType {
        return this.currentToken.type;
    }


    private eat(tokenType: TokenType) {
        if (this.currentToken.type === tokenType) {
            this.currentToken = this.lexer.nextToken();
        } else {
            throw new Error(`Expected token ${tokenType} but got ${this.currentToken.type}`);
        }
    }
    
}