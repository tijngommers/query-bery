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
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: undefined
        });
    });

    it("should parse a SELECT statement with a WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE id = 10");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ID' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 10 }
            }
        });
    });

    it("should parse multiple columns separated by commas", () => {
        const lexer = new Lexer("SELECT name, age FROM users");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [
                { type: 'Identifier', name: 'NAME' },
                { type: 'Identifier', name: 'AGE' }
            ],
            where: undefined
        });
    });

    it("should parse SELECT * as all columns", () => {
        const lexer = new Lexer("SELECT * FROM users");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: '*' }],
            where: undefined
        });
    });

    it("should parse a SELECT statement with >= in WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age >= 18");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '>=',
                right: { type: 'Literal', valueType: 'number', value: 18 }
            }
        });
    });

    it("should parse a DELETE statement without WHERE clause", () => {
        const lexer = new Lexer("DELETE FROM users");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'DeleteStatement',
            from: { type: 'Table', name: 'USERS' },
            where: undefined
        });
    });

    it("should parse a DELETE statement with a WHERE clause", () => {
        const lexer = new Lexer("DELETE FROM users WHERE age > 20");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'DeleteStatement',
            from: { type: 'Table', name: 'USERS' },
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '>',
                right: { type: 'Literal', valueType: 'number', value: 20 }
            }
        });
    });

    it("should parse a where clause with a string value", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city = 'New York'");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'CITY' },
                operator: '=',
                right: { type: 'Literal', valueType: 'string', value: 'New York' }
            }
        });
    });

    it("should parse a where clause with an identifier as right operand", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city = hometown");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'CITY' },
                operator: '=',
                right: { type: 'Identifier', name: 'HOMETOWN' }
            }
        });
    });

    it("should parse a where clause with AND", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age >= 18 AND city = 'AMS'");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'LogicalExpression',
                operator: 'AND',
                left: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'AGE' },
                    operator: '>=',
                    right: { type: 'Literal', valueType: 'number', value: 18 }
                },
                right: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'CITY' },
                    operator: '=',
                    right: { type: 'Literal', valueType: 'string', value: 'AMS' }
                }
            }
        });
    });

    it("should parse a where clause with NOT", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE NOT age = 18");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'NotExpression',
                operator: 'NOT',
                expression: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'AGE' },
                    operator: '=',
                    right: { type: 'Literal', valueType: 'number', value: 18 }
                }
            }
        });
    });

    it("should parse chained NOT expressions", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE NOT NOT age = 18");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'NotExpression',
                operator: 'NOT',
                expression: {
                    type: 'NotExpression',
                    operator: 'NOT',
                    expression: {
                        type: 'ComparisonExpression',
                        left: { type: 'Identifier', name: 'AGE' },
                        operator: '=',
                        right: { type: 'Literal', valueType: 'number', value: 18 }
                    }
                }
            }
        });
    });

    it("should parse NOT on the right side of AND", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age = 18 AND NOT city = 'AMS'");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'LogicalExpression',
                operator: 'AND',
                left: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'AGE' },
                    operator: '=',
                    right: { type: 'Literal', valueType: 'number', value: 18 }
                },
                right: {
                    type: 'NotExpression',
                    operator: 'NOT',
                    expression: {
                        type: 'ComparisonExpression',
                        left: { type: 'Identifier', name: 'CITY' },
                        operator: '=',
                        right: { type: 'Literal', valueType: 'string', value: 'AMS' }
                    }
                }
            }
        });
    });

    it("should throw an error for invalid syntax", () => {
        const lexer = new Lexer("SELECT name users");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected token FROM but got IDENTIFIER");
    });

    it("should throw an error for trailing comma in select list", () => {
        const lexer = new Lexer("SELECT name, FROM users");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected column name after COMMA but got FROM");
    });

    it("should throw an error for unexpected token in WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE id =");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected value in WHERE clause but got EOF");
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

    it("should correctly parse a < operator in WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age < 30");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '<',
                right: { type: 'Literal', valueType: 'number', value: 30 }
            }
        });
    });

    it("should correctly parse a <= operator in WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age <= 65");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '<=',
                right: { type: 'Literal', valueType: 'number', value: 65 }
            }
        });
    });
});