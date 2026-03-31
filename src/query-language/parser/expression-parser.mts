// @author Tijn Gommers
// @date 2026-03-30

import {
    AggregateFunctionName,
    AggregateFunctionNode,
    ArithmeticExpressionNode,
    ComparisonNode,
    ExpressionNode,
    IdentifierNode,
    InExpressionNode,
    NullCheckExpressionNode,
    TokenType,
    ValueExpressionNode,
    ValueNode,
    WildcardNode,
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
        return this.parseOrExpression(false);
    }

    parseHavingExpression(): ExpressionNode {
        return this.parseOrExpression(true);
    }

    private parseOrExpression(allowAggregateFunctions: boolean): ExpressionNode {
        let left = this.parseAndExpression(allowAggregateFunctions);

        while (this.cursor.currentType() === TokenType.OR) {
            this.cursor.eat(TokenType.OR);
            const right = this.parseAndExpression(allowAggregateFunctions);
            left = this.buildLogicalExpression('OR', left, right);
        }

        return left;
    }

    private parseAndExpression(allowAggregateFunctions: boolean): ExpressionNode {
        let left = this.parseUnaryExpression(allowAggregateFunctions);

        while (this.cursor.currentType() === TokenType.AND) {
            this.cursor.eat(TokenType.AND);
            const right = this.parseUnaryExpression(allowAggregateFunctions);
            left = this.buildLogicalExpression('AND', left, right);
        }

        return left;
    }

    private parseUnaryExpression(allowAggregateFunctions: boolean): ExpressionNode {
        if (this.cursor.currentType() === TokenType.NOT) {
            this.cursor.eat(TokenType.NOT);
            const expression = this.parseUnaryExpression(allowAggregateFunctions);
            return {
                type: 'NotExpression',
                operator: 'NOT',
                expression,
            };
        }

        if (this.cursor.currentType() === TokenType.LEFT_PAREN) {
            this.cursor.eat(TokenType.LEFT_PAREN);
            const expression = this.parseOrExpression(allowAggregateFunctions);
            this.cursor.eat(TokenType.RIGHT_PAREN);
            return expression;
        }

        return this.parseComparisonExpression(allowAggregateFunctions);
    }

    private parseComparisonExpression(allowAggregateFunctions: boolean): ComparisonNode | NullCheckExpressionNode | InExpressionNode {
        const left = this.parseAdditiveExpression(allowAggregateFunctions);

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
        const right = this.parseAdditiveExpression(allowAggregateFunctions);

        return {
            type: 'ComparisonExpression',
            left,
            operator,
            right,
        };
    }

    private parseAdditiveExpression(allowAggregateFunctions: boolean): ValueExpressionNode {
        let expression = this.parseMultiplicativeExpression(allowAggregateFunctions);

        while (this.cursor.currentType() === TokenType.PLUS || this.cursor.currentType() === TokenType.MINUS) {
            const operator = this.cursor.currentType() === TokenType.PLUS ? '+' : '-';
            this.cursor.eat(this.cursor.currentType());
            const right = this.parseMultiplicativeExpression(allowAggregateFunctions);
            expression = this.buildArithmeticExpression(expression, operator, right);
        }

        return expression;
    }

    private parseMultiplicativeExpression(allowAggregateFunctions: boolean): ValueExpressionNode {
        let expression = this.parseValuePrimaryExpression(allowAggregateFunctions);

        while (this.cursor.currentType() === TokenType.STAR || this.cursor.currentType() === TokenType.DIVIDE) {
            const operator = this.cursor.currentType() === TokenType.STAR ? '*' : '/';
            this.cursor.eat(this.cursor.currentType());
            const right = this.parseValuePrimaryExpression(allowAggregateFunctions);
            expression = this.buildArithmeticExpression(expression, operator, right);
        }

        return expression;
    }

    private parseValuePrimaryExpression(allowAggregateFunctions: boolean): ValueExpressionNode {
        if (this.cursor.currentType() === TokenType.LEFT_PAREN) {
            this.cursor.eat(TokenType.LEFT_PAREN);
            const expression = this.parseAdditiveExpression(allowAggregateFunctions);
            this.cursor.eat(TokenType.RIGHT_PAREN);
            return expression;
        }

        if (allowAggregateFunctions && this.isAggregateFunctionToken(this.cursor.currentType())) {
            return this.parseAggregateFunctionValue();
        }

        return this.valueParser.parseValueNode();
    }

    private parseAggregateFunctionValue(): AggregateFunctionNode {
        const functionName = this.parseAggregateFunctionName();
        this.cursor.eat(TokenType.LEFT_PAREN);

        let argument: IdentifierNode | WildcardNode;
        if (this.cursor.currentType() === TokenType.STAR) {
            if (functionName !== 'COUNT') {
                throw new Error('Only COUNT supports wildcard argument');
            }

            this.cursor.eat(TokenType.STAR);
            argument = { type: 'Wildcard', value: '*' };
        } else if (this.cursor.currentType() === TokenType.IDENTIFIER) {
            argument = this.valueParser.parseIdentifierNode('HAVING clause');
        } else {
            throw new Error(`Expected aggregate argument but got ${this.cursor.currentType()}`);
        }

        this.cursor.eat(TokenType.RIGHT_PAREN);
        return { type: 'AggregateFunction', functionName, argument };
    }

    private parseAggregateFunctionName(): AggregateFunctionName {
        switch (this.cursor.currentType()) {
            case TokenType.COUNT:
                this.cursor.eat(TokenType.COUNT);
                return 'COUNT';
            case TokenType.SUM:
                this.cursor.eat(TokenType.SUM);
                return 'SUM';
            case TokenType.AVG:
                this.cursor.eat(TokenType.AVG);
                return 'AVG';
            case TokenType.MIN:
                this.cursor.eat(TokenType.MIN);
                return 'MIN';
            case TokenType.MAX:
                this.cursor.eat(TokenType.MAX);
                return 'MAX';
            default:
                throw new Error(`Unsupported function in HAVING clause: ${this.cursor.currentValue()}`);
        }
    }

    private isAggregateFunctionToken(tokenType: TokenType): boolean {
        return (
            tokenType === TokenType.COUNT ||
            tokenType === TokenType.SUM ||
            tokenType === TokenType.AVG ||
            tokenType === TokenType.MIN ||
            tokenType === TokenType.MAX
        );
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
