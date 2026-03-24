// @author Tijn Gommers
// @date 2026-03-17

import { Token, TokenType, ASTNode, BinaryExpression} from "./types.mts";
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

    private parseSelect(): ASTNode {
        this.eat(TokenType.SELECT);

        const columns: string[] = [];
        while (this.currentToken.type === TokenType.IDENTIFIER) {
            columns.push(this.currentToken.value);
            this.eat(TokenType.IDENTIFIER);
        }
        const table = this.parseFrom();

        if (this.currentToken.type === TokenType.WHERE) {
            const where = this.parseWhere();
            return { type: 'SelectStatement', table, columns, where };
        }
        return { type: 'SelectStatement', table, columns, where: undefined };

    }

    private parseDelete(): ASTNode {
        this.eat(TokenType.DELETE);

        const table = this.parseFrom();

        if (this.currentToken.type === TokenType.WHERE) {
            const where = this.parseWhere();
            return { type: 'DeleteStatement', table, where };
        }

        return { type: 'DeleteStatement', table, where: undefined };
    }

    private parseFrom(): string {
        this.eat(TokenType.FROM);
        const table = this.currentToken.value;
        this.eat(TokenType.IDENTIFIER);
        return table;
    }

    private parseWhere(): BinaryExpression {
        this.eat(TokenType.WHERE);

        if (this.currentToken.type !== TokenType.IDENTIFIER) {
            throw new Error(`Expected identifier in WHERE clause but got ${this.currentToken.type}`);
        }
        const left = this.currentToken.value;
        this.eat(TokenType.IDENTIFIER);

        let operator: string;
        operator = this.currentToken.value;
        this.eat(this.currentToken.type);

        let right: string | number;
        const rightToken = this.currentToken;
        if (rightToken.type === TokenType.NUMBER) {
            right = Number(rightToken.value);
            this.eat(TokenType.NUMBER);
        } else if (rightToken.type === TokenType.STRING) {
            right = rightToken.value;
            this.eat(TokenType.STRING);
        } else if (rightToken.type === TokenType.IDENTIFIER) {
            right = rightToken.value;
            this.eat(TokenType.IDENTIFIER);
        } else {
            throw new Error(`Unexpected token in WHERE clause: ${rightToken.type}`);
        }

        return { type: 'BinaryExpression', left, operator, right };
    }


    private eat(tokenType: TokenType) {
        if (this.currentToken.type === tokenType) {
            this.currentToken = this.lexer.nextToken();
        } else {
            throw new Error(`Expected token ${tokenType} but got ${this.currentToken.type}`);
        }
    }
    
}