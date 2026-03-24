// @author Tijn Gommers
// @date 2026-03-17

import { TokenType } from "./types.mjs";
import { Lexer } from "./lexer.mjs";
import { describe, it, expect } from "vitest";

describe("Lexer", () => {

    it("Tokenization should work for all common SQL keywords and operators", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE id = 10 AND age > 20 OR city = 'New York' AND score < 100");
        const tokens = [];
        let token = lexer.nextToken();
        while (token.type !== TokenType.EOF) {
            tokens.push(token);
            token = lexer.nextToken();
        }
        expect(tokens).toEqual([
            { type: TokenType.SELECT, value: "SELECT" },
            { type: TokenType.IDENTIFIER, value: "NAME" },
            { type: TokenType.FROM, value: "FROM" },
            { type: TokenType.IDENTIFIER, value: "USERS" },
            { type: TokenType.WHERE, value: "WHERE" },
            { type: TokenType.IDENTIFIER, value: "ID" },
            { type: TokenType.EQUALS, value: "=" },
            { type: TokenType.NUMBER, value: "10" },
            { type: TokenType.AND, value: "AND" },
            { type: TokenType.IDENTIFIER, value: "AGE" },
            { type: TokenType.GREATER_THAN, value: ">" },
            { type: TokenType.NUMBER, value: "20" },
            { type: TokenType.OR, value: "OR" },
            { type: TokenType.IDENTIFIER, value: "CITY" },
            { type: TokenType.EQUALS, value: "=" },
            { type: TokenType.STRING, value: "New York" },
            { type: TokenType.AND, value: "AND" },
            { type: TokenType.IDENTIFIER, value: "SCORE" },
            { type: TokenType.LESS_THAN, value: "<" },
            { type: TokenType.NUMBER, value: "100" },
        ]);
    });

    it("should correctly tokenize <= and >=", () => {
        const lexer = new Lexer("SELECT a FROM users WHERE age >= 18 AND age <= 30");
        const tokens = [];
        let token = lexer.nextToken();
        while (token.type !== TokenType.EOF) {
            tokens.push(token);
            token = lexer.nextToken();
        }
        expect(tokens).toEqual([
            { type: TokenType.SELECT, value: "SELECT" },
            { type: TokenType.IDENTIFIER, value: "A" },
            { type: TokenType.FROM, value: "FROM" },
            { type: TokenType.IDENTIFIER, value: "USERS" },
            { type: TokenType.WHERE, value: "WHERE" },
            { type: TokenType.IDENTIFIER, value: "AGE" },
            { type: TokenType.GREATER_THAN_OR_EQUALS, value: ">=" },
            { type: TokenType.NUMBER, value: "18" },
            { type: TokenType.AND, value: "AND" },
            { type: TokenType.IDENTIFIER, value: "AGE" },
            { type: TokenType.LESS_THAN_OR_EQUALS, value: "<=" },
            { type: TokenType.NUMBER, value: "30" }
        ]);
    });


    it("should handle whitespace correctly", () => {
        const lexer = new Lexer("   SELECT   name   FROM   users   ");
        const tokens = [];
        let token = lexer.nextToken();
        while (token.type !== TokenType.EOF) {
            tokens.push(token);
            token = lexer.nextToken();
        }
        expect(tokens).toEqual([
            { type: TokenType.SELECT, value: "SELECT" },
            { type: TokenType.IDENTIFIER, value: "NAME" },
            { type: TokenType.FROM, value: "FROM" },
            { type: TokenType.IDENTIFIER, value: "USERS" },
        ]);
    });

    it("should return EOF token at the end of input", () => {
        const lexer = new Lexer("SELECT name");
        let token = lexer.nextToken();
        while (token.type !== TokenType.EOF) {
            token = lexer.nextToken();
        }
        expect(token.type).toBe(TokenType.EOF);
    });

    it("should throw an error for unknown characters", () => {
        const lexer = new Lexer("@");
        expect(() => lexer.nextToken()).toThrow("Unexpected character: @");
    });

    it("should throw an error for unclosed string literals", () => {
        const lexer = new Lexer("'Unclosed string");
        expect(() => lexer.nextToken()).toThrow("Unterminated string literal");
    });
});