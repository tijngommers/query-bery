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
    NullCheckExpressionNode,
    OrderByStatement,
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

        if (nextType === TokenType.ORDER) {
            const orderBy = this.parseOrderBy();
            return { type: 'SelectStatement', from, columns, where: undefined, orderBy };
        }


        return { type: 'SelectStatement', from, columns, where: undefined, orderBy: undefined };

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
        let left: ExpressionNode = this.parseUnaryExpression();

        while (this.currentToken.type === TokenType.AND || this.currentToken.type === TokenType.OR) {
            const operator = this.currentToken.type === TokenType.AND ? 'AND' : 'OR';
            this.eat(this.currentToken.type);
            const right = this.parseUnaryExpression();
            left = {
                type: 'LogicalExpression',
                operator,
                left,
                right,
            };
        }

        return left;
    }

    private parseUnaryExpression(): ExpressionNode {
        if (this.currentType() === TokenType.NOT) {
            this.eat(TokenType.NOT);
            const expression = this.parseUnaryExpression();
            return {
                type: 'NotExpression',
                operator: 'NOT',
                expression,
            };
        }
        return this.parseComparisonExpression();
    }

    private parseComparisonExpression(): ComparisonNode | NullCheckExpressionNode {
        const left = this.parseIdentifierNode();
        this.eat(TokenType.IDENTIFIER);

        if (this.currentType() === TokenType.IS) {
            this.eat(TokenType.IS);
            let isNegated = false;
            if (this.currentType() === TokenType.NOT) {
                this.eat(TokenType.NOT);
                isNegated = true;
            }
            if (this.currentType() !== TokenType.NULL) {
                throw new Error(`Expected NULL after IS (NOT) but got ${this.currentType()}`);
            }
            this.eat(TokenType.NULL);
            return {
                type: 'NullCheckExpression',
                left,
                isNegated,
            };
        }

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
            case TokenType.NOT_EQUALS:
                this.eat(TokenType.NOT_EQUALS);
                return '!=';
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

        if (token.type === TokenType.NULL) {
            this.eat(TokenType.NULL);
            return {
                type: 'Literal',
                valueType: 'null',
                value: null,
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

    private parseOrderBy(): OrderByStatement {
        this.eat(TokenType.ORDER);
        this.eat(TokenType.BY);

        const columns: IdentifierNode[] = [];

        if (this.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected at least one column after ORDER BY but got ${this.currentType()}`);
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

        let direction: 'ASC' | 'DESC' = 'ASC';
        if (this.currentType() === TokenType.DESC) {
            this.eat(TokenType.DESC);
            direction = 'DESC';
        }
        return { type: 'OrderByStatement', columns, direction };
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