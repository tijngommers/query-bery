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

            while (this.currentType() === TokenType.COMMA) {
                this.eat(TokenType.COMMA);
                if (this.currentType() !== TokenType.IDENTIFIER) {
                    throw new Error(`Expected column name after COMMA but got ${this.currentType()}`);
                }
                columns.push(this.parseIdentifierNode());
            }
        }

        const from = this.parseFrom();
        let where: ExpressionNode | undefined;
        let orderBy: OrderByStatement | undefined;

        if (this.currentType() === TokenType.WHERE) {
            where = this.parseWhere();
        }

        if (this.currentType() === TokenType.ORDER) {
            orderBy = this.parseOrderBy();
        }

        return { type: 'SelectStatement', from, columns, where, orderBy };

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

    private parseFrom(): { type: 'Table'; name: string }[] {
        this.eat(TokenType.FROM);
        const tables: { type: 'Table'; name: string }[] = [];
        
        // first table is mandatory
        if (this.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected table name after FROM but got ${this.currentType()}`);
        }
        tables.push({ type: 'Table', name: this.currentToken.value });
        this.eat(TokenType.IDENTIFIER);

        // comma separated additional tables (for JOINs)
        while (this.currentType() === TokenType.COMMA) {
            this.eat(TokenType.COMMA);
            if (this.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected table name after COMMA but got ${this.currentType()}`);
            }
            tables.push({ type: 'Table', name: this.currentToken.value });
            this.eat(TokenType.IDENTIFIER);
        }

        // cross join syntax: additional tables can also be specified with CROSS JOIN
        while (this.currentType() === TokenType.CROSS) {
            this.eat(TokenType.CROSS);
            if (this.currentType() !== TokenType.JOIN) {
                throw new Error(`Expected JOIN after CROSS but got ${this.currentType()}`);
            }
            this.eat(TokenType.JOIN);
            if (this.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected table name after CROSS JOIN but got ${this.currentType()}`);
            }
            tables.push({ type: 'Table', name: this.currentToken.value });
            this.eat(TokenType.IDENTIFIER);
        }

        return tables;
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
            return this.parseIdentifierNode();
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

        let name = this.currentToken.value;
        this.eat(TokenType.IDENTIFIER);

        while (this.currentType() === TokenType.DOT) {
            this.eat(TokenType.DOT);
            if (this.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected identifier after dot but got ${this.currentType()}`);
            }
            name = `${name}.${this.currentToken.value}`;
            this.eat(TokenType.IDENTIFIER);
        }

        return {
            type: 'Identifier',
            name,
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

        let direction: 'ASC' | 'DESC' | undefined;

        if (this.currentType() === TokenType.ASC) {
            this.eat(TokenType.ASC);
            direction = 'ASC';
        } else if (this.currentType() === TokenType.DESC) {
            this.eat(TokenType.DESC);
            direction = 'DESC';
        }

        while (this.currentType() === TokenType.COMMA) {
            this.eat(TokenType.COMMA);
            if (this.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected column name after COMMA but got ${this.currentType()}`);
            }
            columns.push(this.parseIdentifierNode());
        }

        if (direction === undefined && this.currentType() === TokenType.ASC) {
            this.eat(TokenType.ASC);
            direction = 'ASC';
        } else if (direction === undefined && this.currentType() === TokenType.DESC) {
            this.eat(TokenType.DESC);
            direction = 'DESC';
        }

        if (direction === undefined) {
            direction = 'ASC';
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