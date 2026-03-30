// @author Tijn Gommers
// @date 2026-03-30

import {
    ArithmeticExpressionNode,
    ComparisonNode,
    ExpressionNode,
    InExpressionNode,
    NullCheckExpressionNode,
    TokenType,
    ValueExpressionNode,
    ValueNode,
} from '../types/index.mts';
import { ParserCursor } from './parser-cursor.mts';
import { ValueParser } from './value-parser.mts';

export class ExpressionParser {
    private cursor: ParserCursor;
    private valueParser: ValueParser;

    constructor(cursor: ParserCursor, valueParser: ValueParser) {
        this.cursor = cursor;
        this.valueParser = valueParser;
    }

    parseWhereExpression(): ExpressionNode {
        return this.parseOrExpression();
    }

    private parseOrExpression(): ExpressionNode {
        let left = this.parseAndExpression();

        while (this.cursor.currentType() === TokenType.OR) {
            this.cursor.eat(TokenType.OR);
            const right = this.parseAndExpression();
            left = this.buildLogicalExpression('OR', left, right);
        }

        return left;
    }

    private parseAndExpression(): ExpressionNode {
        let left = this.parseUnaryExpression();

        while (this.cursor.currentType() === TokenType.AND) {
            this.cursor.eat(TokenType.AND);
            const right = this.parseUnaryExpression();
            left = this.buildLogicalExpression('AND', left, right);
        }

        return left;
    }

    private parseUnaryExpression(): ExpressionNode {
        if (this.cursor.currentType() === TokenType.NOT) {
            this.cursor.eat(TokenType.NOT);
            const expression = this.parseUnaryExpression();
            return {
                type: 'NotExpression',
                operator: 'NOT',
                expression,
            };
        }

        if (this.cursor.currentType() === TokenType.LEFT_PAREN) {
            this.cursor.eat(TokenType.LEFT_PAREN);
            const expression = this.parseOrExpression();
            this.cursor.eat(TokenType.RIGHT_PAREN);
            return expression;
        }

        return this.parseComparisonExpression();
    }

    private parseComparisonExpression(): ComparisonNode | NullCheckExpressionNode | InExpressionNode {
        const left = this.parseAdditiveExpression();

        if (this.cursor.currentType() === TokenType.IN) {
            if (left.type !== 'Identifier') {
                throw new Error('Expected identifier before IN operator');
            }

            this.cursor.eat(TokenType.IN);
            this.cursor.eat(TokenType.LEFT_PAREN);

            const values: ValueNode[] = [];
            while (this.cursor.currentType() !== TokenType.RIGHT_PAREN) {
                values.push(this.valueParser.parseValueNode());
                if (this.cursor.currentType() === TokenType.COMMA) {
                    this.cursor.eat(TokenType.COMMA);
                }
            }

            this.cursor.eat(TokenType.RIGHT_PAREN);
            return {
                type: 'InExpression',
                left,
                values,
            };
        }

        if (this.cursor.currentType() === TokenType.IS) {
            if (left.type !== 'Identifier') {
                throw new Error('Expected identifier before IS operator');
            }

            this.cursor.eat(TokenType.IS);
            let isNegated = false;

            if (this.cursor.currentType() === TokenType.NOT) {
                this.cursor.eat(TokenType.NOT);
                isNegated = true;
            }

            if (this.cursor.currentType() !== TokenType.NULL) {
                throw new Error(`Expected NULL after IS (NOT) but got ${this.cursor.currentType()}`);
            }

            this.cursor.eat(TokenType.NULL);
            return {
                type: 'NullCheckExpression',
                left,
                isNegated,
            };
        }

        if (!this.isComparisonOperator(this.cursor.currentType())) {
            throw new Error(`Expected comparison operator but got ${this.cursor.currentType()}`);
        }

        const operator = this.valueParser.parseComparisonOperator();
        const right = this.parseAdditiveExpression();

        return {
            type: 'ComparisonExpression',
            left,
            operator,
            right,
        };
    }

    private parseAdditiveExpression(): ValueExpressionNode {
        let expression = this.parseMultiplicativeExpression();

        while (this.cursor.currentType() === TokenType.PLUS || this.cursor.currentType() === TokenType.MINUS) {
            const operator = this.cursor.currentType() === TokenType.PLUS ? '+' : '-';
            this.cursor.eat(this.cursor.currentType());
            const right = this.parseMultiplicativeExpression();
            expression = this.buildArithmeticExpression(expression, operator, right);
        }

        return expression;
    }

    private parseMultiplicativeExpression(): ValueExpressionNode {
        let expression = this.parseValuePrimaryExpression();

        while (this.cursor.currentType() === TokenType.STAR || this.cursor.currentType() === TokenType.DIVIDE) {
            const operator = this.cursor.currentType() === TokenType.STAR ? '*' : '/';
            this.cursor.eat(this.cursor.currentType());
            const right = this.parseValuePrimaryExpression();
            expression = this.buildArithmeticExpression(expression, operator, right);
        }

        return expression;
    }

    private parseValuePrimaryExpression(): ValueExpressionNode {
        if (this.cursor.currentType() === TokenType.LEFT_PAREN) {
            this.cursor.eat(TokenType.LEFT_PAREN);
            const expression = this.parseAdditiveExpression();
            this.cursor.eat(TokenType.RIGHT_PAREN);
            return expression;
        }

        return this.valueParser.parseValueNode();
    }

    private buildLogicalExpression(operator: 'AND' | 'OR', left: ExpressionNode, right: ExpressionNode): ExpressionNode {
        return {
            type: 'LogicalExpression',
            operator,
            left,
            right,
        };
    }

    private buildArithmeticExpression(
        left: ValueExpressionNode,
        operator: '+' | '-' | '*' | '/',
        right: ValueExpressionNode,
    ): ArithmeticExpressionNode {
        return {
            type: 'ArithmeticExpression',
            left,
            operator,
            right,
        };
    }

    private isComparisonOperator(tokenType: TokenType): boolean {
        return (
            tokenType === TokenType.EQUALS ||
            tokenType === TokenType.GREATER_THAN ||
            tokenType === TokenType.LESS_THAN ||
            tokenType === TokenType.GREATER_THAN_OR_EQUALS ||
            tokenType === TokenType.LESS_THAN_OR_EQUALS ||
            tokenType === TokenType.NOT_EQUALS
        );
    }
}
