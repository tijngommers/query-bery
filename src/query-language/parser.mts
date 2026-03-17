// @author Tijn Gommers
// @date 2026-03-17

import { Token, TokenType, ASTNode, BinaryExpression } from "./types.mts";
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
        return { type: 'SelectStatement', table: '', columns, where: undefined };

    }

    private parseDelete(): ASTNode {
        this.eat(TokenType.DELETE);

        const table = this.currentToken.value;
        this.eat(TokenType.IDENTIFIER);

        return { type: 'DeleteStatement', table, where: undefined };
    }

    private eat(tokenType: TokenType) {
        if (this.currentToken.type === tokenType) {
            this.currentToken = this.lexer.nextToken();
        } else {
            throw new Error(`Expected token ${tokenType} but got ${this.currentToken.type}`);
        }
    }
    
}