// @author Tijn Gommers
// @date 2026-03-30

import { Lexer } from '../lexer/index.mts';
import { Token, TokenType } from '../types/index.mts';

export class ParserCursor {
    private lexer: Lexer;
    private currentToken: Token;

    constructor(lexer: Lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.nextToken();
    }

    currentType(): TokenType {
        return this.currentToken.type;
    }

    currentValue(): string {
        return this.currentToken.value;
    }

    current(): Token {
        return this.currentToken;
    }

    eat(tokenType: TokenType): void {
        if (this.currentToken.type !== tokenType) {
            throw new Error(`Expected token ${tokenType} but got ${this.currentToken.type}`);
        }

        this.currentToken = this.lexer.nextToken();
    }
}
