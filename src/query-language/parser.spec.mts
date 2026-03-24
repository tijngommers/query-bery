//@author Tijn Gommers
// @date 2026-03-24

import { Parser } from "./parser.mts";
import { Lexer } from "./lexer.mts";
import { describe, it, expect } from "vitest";

describe("Parser", () => {

    it("should parse a simple SELECT statement without WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            table: 'USERS',
            columns: ['NAME'],
            where: undefined
        });
    });

    it("should parse a SELECT statement with a WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE id = 10");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            table: 'USERS',
            columns: ['NAME'],
            where: {
                type: 'BinaryExpression',
                left: 'ID',
                operator: '=',
                right: 10
            }
        });
    });

    it("should parse a DELETE statement without WHERE clause", () => {
        const lexer = new Lexer("DELETE FROM users");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'DeleteStatement',
            table: 'USERS',
            where: undefined
        });
    });

    it("should parse a DELETE statement with a WHERE clause", () => {
        const lexer = new Lexer("DELETE FROM users WHERE age > 20");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'DeleteStatement',
            table: 'USERS',
            where: {
                type: 'BinaryExpression',
                left: 'AGE',
                operator: '>',
                right: 20
            }
        });
    });

    it("should parse a where clause with a string value", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city = 'New York'");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            table: 'USERS',
            columns: ['NAME'],
            where: {
                type: 'BinaryExpression',
                left: 'CITY',
                operator: '=',
                right: 'New York'
            }
        });
    });

    it("should parse a where clause with an identifier as right operand", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city = hometown");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            table: 'USERS',
            columns: ['NAME'],
            where: {
                type: 'BinaryExpression',
                left: 'CITY',
                operator: '=',
                right: 'HOMETOWN'
            }
        });
    });

    it("should throw an error for invalid syntax", () => {
        const lexer = new Lexer("SELECT name users");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected token FROM but got EOF");
    });

    it("should throw an error for unexpected token in WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE id =");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Unexpected token in WHERE clause: EOF");
    });

    it("should throw an error for unexpected token in WHERE clause (non-identifier)", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE 10 = 20");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected identifier in WHERE clause but got NUMBER");
    });

    it("Should throw an error for unexpected first token", () => {
        const lexer = new Lexer("RANDOM users SET name = 'John' WHERE id = 1");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Unexpected token: IDENTIFIER");
    });
});