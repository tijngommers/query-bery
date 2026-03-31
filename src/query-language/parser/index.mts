// @author Tijn Gommers
// @date 2026-03-30

import {
    AggregateFunctionName,
    ASTNode,
    DeleteStatement,
    ExpressionNode,
    FromNode,
    IdentifierNode,
    JoinNode,
    LimitOffsetNode,
    OrderByStatement,
    SelectColumn,
    SelectStatement,
    TableNode,
    TokenType,
    WildcardNode,
} from '../types/index.mts';
import { Lexer } from '../lexer/index.mts';
import { ParserCursor } from './parser-cursor.mts';
import { ValueParser } from './value-parser.mts';
import { ExpressionParser } from './expression-parser.mts';

export class Parser {
    private cursor: ParserCursor;
    private valueParser: ValueParser;
    private expressionParser: ExpressionParser;

    constructor(lexer: Lexer) {
        this.cursor = new ParserCursor(lexer);
        this.valueParser = new ValueParser(this.cursor);
        this.expressionParser = new ExpressionParser(this.cursor, this.valueParser);
    }

    parse(): ASTNode {
        if (this.cursor.currentType() === TokenType.SELECT) {
            return this.parseSelect();
        }

        if (this.cursor.currentType() === TokenType.DELETE) {
            return this.parseDelete();
        }

        throw new Error(`Unexpected token: ${this.cursor.currentType()}`);
    }

    private parseSelect(): SelectStatement {
        this.cursor.eat(TokenType.SELECT);

        let distinct = false;
        if (this.cursor.currentType() === TokenType.DISTINCT) {
            distinct = true;
            this.cursor.eat(TokenType.DISTINCT);
        }

        const columns = this.parseSelectColumns();

        const from = this.parseSelectFrom();
        let where: ExpressionNode | undefined;
        let groupBy: IdentifierNode[] | undefined;
        let having: ExpressionNode | undefined;

        let orderBy: OrderByStatement | undefined;
        let limit: LimitOffsetNode | undefined;

        if (this.cursor.currentType() === TokenType.WHERE) {
            where = this.parseWhere();
        }

        if (this.cursor.currentType() === TokenType.GROUP) {
            groupBy = this.parseGroupBy();
        }

        if (this.cursor.currentType() === TokenType.HAVING) {
            if (!groupBy) {
                throw new Error('HAVING clause requires GROUP BY');
            }
            having = this.parseHaving();
        }

        if (this.cursor.currentType() === TokenType.ORDER) {
            orderBy = this.parseOrderBy();
        }

        if (this.cursor.currentType() === TokenType.LIMIT) {
            limit = this.parseLimitOffset();
        }

        return { type: 'SelectStatement', distinct, from, columns, where, groupBy, having, orderBy, limit };
    }

    private parseDelete(): DeleteStatement {
        this.cursor.eat(TokenType.DELETE);

        const from = this.parseDeleteFrom();

        if (this.cursor.currentType() === TokenType.WHERE) {
            const where = this.parseWhere();
            return { type: 'DeleteStatement', from, where };
        }

        return { type: 'DeleteStatement', from, where: undefined };
    }

    private parseSelectColumns(): SelectColumn[] {
        const columns: SelectColumn[] = [];

        if (!this.isValidSelectColumnStart(this.cursor.currentType())) {
            throw new Error(`Expected at least one column after SELECT but got ${this.cursor.currentType()}`);
        }

        if (this.cursor.currentType() === TokenType.STAR) {
            columns.push({ type: 'Identifier', name: '*' });
            this.cursor.eat(TokenType.STAR);
            return columns;
        }

        columns.push(this.parseSelectColumn());

        while (this.cursor.currentType() === TokenType.COMMA) {
            this.cursor.eat(TokenType.COMMA);
            if (!this.isValidSelectColumnStart(this.cursor.currentType())) {
                throw new Error(`Expected column name after COMMA but got ${this.cursor.currentType()}`);
            }
            columns.push(this.parseSelectColumn());
        }

        return columns;
    }

    private parseSelectColumn(): SelectColumn {
        if (this.isAggregateFunctionToken(this.cursor.currentType())) {
            return this.parseAggregateFunction();
        }

        const identifier = this.valueParser.parseIdentifierNode('SELECT clause');

        if (this.cursor.currentType() === TokenType.LEFT_PAREN) {
            throw new Error(`Unsupported function in SELECT clause: ${identifier.name}`);
        }

        return identifier;
    }

    private parseAggregateFunction(): SelectColumn {
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
            argument = this.valueParser.parseIdentifierNode('Aggregate function argument');
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
                throw new Error(`Unsupported function in SELECT clause: ${this.cursor.currentValue()}`);
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

    private isValidSelectColumnStart(tokenType: TokenType): boolean {
        return tokenType === TokenType.STAR || tokenType === TokenType.IDENTIFIER || this.isAggregateFunctionToken(tokenType);
    }

    private parseDeleteFrom(): TableNode[] {
        this.cursor.eat(TokenType.FROM);
        const tables: TableNode[] = [];

        if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected table name after FROM but got ${this.cursor.currentType()}`);
        }

        tables.push({ type: 'Table', name: this.cursor.currentValue() });
        this.cursor.eat(TokenType.IDENTIFIER);

        while (this.cursor.currentType() === TokenType.COMMA) {
            this.cursor.eat(TokenType.COMMA);
            if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected table name after COMMA but got ${this.cursor.currentType()}`);
            }
            tables.push({ type: 'Table', name: this.cursor.currentValue() });
            this.cursor.eat(TokenType.IDENTIFIER);
        }

        if (this.cursor.currentType() === TokenType.JOIN || this.cursor.currentType() === TokenType.CROSS) {
            throw new Error('JOIN is not supported in DELETE statements');
        }

        return tables;
    }

    private parseSelectFrom(): FromNode[] {
        this.cursor.eat(TokenType.FROM);
        const tables: FromNode[] = [];

        if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected table name after FROM but got ${this.cursor.currentType()}`);
        }

        tables.push({ type: 'Table', name: this.cursor.currentValue() });
        this.cursor.eat(TokenType.IDENTIFIER);

        while (this.cursor.currentType() === TokenType.COMMA) {
            this.cursor.eat(TokenType.COMMA);
            if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected table name after COMMA but got ${this.cursor.currentType()}`);
            }
            tables.push({ type: 'Table', name: this.cursor.currentValue() });
            this.cursor.eat(TokenType.IDENTIFIER);
        }

        while (this.cursor.currentType() === TokenType.CROSS) {
            this.cursor.eat(TokenType.CROSS);
            if (this.cursor.currentType() !== TokenType.JOIN) {
                throw new Error(`Expected JOIN after CROSS but got ${this.cursor.currentType()}`);
            }
            this.cursor.eat(TokenType.JOIN);
            if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected table name after CROSS JOIN but got ${this.cursor.currentType()}`);
            }
            tables.push({ type: 'Table', name: this.cursor.currentValue() });
            this.cursor.eat(TokenType.IDENTIFIER);
        }

        while (
            this.cursor.currentType() === TokenType.JOIN ||
            this.cursor.currentType() === TokenType.INNER ||
            this.cursor.currentType() === TokenType.LEFT ||
            this.cursor.currentType() === TokenType.RIGHT ||
            this.cursor.currentType() === TokenType.OUTER
        ) {
            tables.push(this.parseJoin());
        }

        return tables;
    }

    private parseWhere(): ExpressionNode {
        this.cursor.eat(TokenType.WHERE);
        return this.expressionParser.parseWhereExpression();
    }

    private parseGroupBy(): IdentifierNode[] {
        this.cursor.eat(TokenType.GROUP);
        this.cursor.eat(TokenType.BY);

        const columns: IdentifierNode[] = [];

        if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected at least one column after GROUP BY but got ${this.cursor.currentType()}`);
        }
        columns.push(this.valueParser.parseIdentifierNode('GROUP BY clause'));

        while (this.cursor.currentType() === TokenType.COMMA) {
            this.cursor.eat(TokenType.COMMA);
            if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected column name after COMMA but got ${this.cursor.currentType()}`);
            }
            columns.push(this.valueParser.parseIdentifierNode('GROUP BY clause'));
        }
        return columns;
    }

    private parseHaving(): ExpressionNode {
        this.cursor.eat(TokenType.HAVING);
        return this.expressionParser.parseHavingExpression();
    }

    private parseOrderBy(): OrderByStatement {
        this.cursor.eat(TokenType.ORDER);
        this.cursor.eat(TokenType.BY);

        const columns: IdentifierNode[] = [];

        if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected at least one column after ORDER BY but got ${this.cursor.currentType()}`);
        }

        columns.push(this.valueParser.parseIdentifierNode('ORDER BY clause'));

        let direction: 'ASC' | 'DESC' | undefined;

        if (this.cursor.currentType() === TokenType.ASC) {
            this.cursor.eat(TokenType.ASC);
            direction = 'ASC';
        } else if (this.cursor.currentType() === TokenType.DESC) {
            this.cursor.eat(TokenType.DESC);
            direction = 'DESC';
        }

        while (this.cursor.currentType() === TokenType.COMMA) {
            this.cursor.eat(TokenType.COMMA);
            if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
                throw new Error(`Expected column name after COMMA but got ${this.cursor.currentType()}`);
            }
            columns.push(this.valueParser.parseIdentifierNode('ORDER BY clause'));
        }

        if (direction === undefined && this.cursor.currentType() === TokenType.ASC) {
            this.cursor.eat(TokenType.ASC);
            direction = 'ASC';
        } else if (direction === undefined && this.cursor.currentType() === TokenType.DESC) {
            this.cursor.eat(TokenType.DESC);
            direction = 'DESC';
        }

        if (direction === undefined) {
            direction = 'ASC';
        }

        return { type: 'OrderByStatement', columns, direction };
    }

    private parseLimitOffset(): LimitOffsetNode {
        this.cursor.eat(TokenType.LIMIT);

        if (this.cursor.currentType() !== TokenType.NUMBER) {
            throw new Error(`Expected number after LIMIT but got ${this.cursor.currentType()}`);
        }

        const limit = parseInt(this.cursor.currentValue(), 10);
        this.cursor.eat(TokenType.NUMBER);

        let offset: number | undefined;

        if (this.cursor.currentType() === TokenType.OFFSET) {
            this.cursor.eat(TokenType.OFFSET);

            if (this.cursor.currentType() !== TokenType.NUMBER) {
                throw new Error(`Expected number after OFFSET but got ${this.cursor.currentType()}`);
            }

            offset = parseInt(this.cursor.currentValue(), 10);
            this.cursor.eat(TokenType.NUMBER);
        }

        return { type: 'LimitOffset', limit, offset };
    }

    private parseJoin(): JoinNode {
        let joinType: 'CROSS' | 'INNER' | 'LEFT' | 'RIGHT' | 'OUTER' = 'INNER';

        switch (this.cursor.currentType()) {
            case TokenType.CROSS:
                this.cursor.eat(TokenType.CROSS);
                joinType = 'CROSS';
                break;
            case TokenType.INNER:
                this.cursor.eat(TokenType.INNER);
                joinType = 'INNER';
                break;
            case TokenType.LEFT:
                this.cursor.eat(TokenType.LEFT);
                joinType = 'LEFT';
                break;
            case TokenType.RIGHT:
                this.cursor.eat(TokenType.RIGHT);
                joinType = 'RIGHT';
                break;
            case TokenType.OUTER:
                this.cursor.eat(TokenType.OUTER);
                joinType = 'OUTER';
                break;
            default:
                break;
        }

        if (this.cursor.currentType() === TokenType.OUTER) {
            this.cursor.eat(TokenType.OUTER);
        }

        if (this.cursor.currentType() !== TokenType.JOIN) {
            throw new Error(`Expected JOIN after ${joinType} but got ${this.cursor.currentType()}`);
        }

        this.cursor.eat(TokenType.JOIN);

        if (this.cursor.currentType() !== TokenType.IDENTIFIER) {
            throw new Error(`Expected table name after JOIN but got ${this.cursor.currentType()}`);
        }

        const tableName = this.cursor.currentValue();
        this.cursor.eat(TokenType.IDENTIFIER);

        if (this.cursor.currentType() !== TokenType.ON) {
            throw new Error(`Expected ON after JOIN but got ${this.cursor.currentType()}`);
        }

        this.cursor.eat(TokenType.ON);

        const left = this.valueParser.parseIdentifierNode('JOIN ON clause');
        const operator = this.valueParser.parseComparisonOperator();
        const right = this.valueParser.parseValueNode();

        return {
            type: 'Join',
            table: { type: 'Table', name: tableName },
            joinType,
            on: { type: 'ComparisonExpression', left, operator, right },
        };
    }
}
