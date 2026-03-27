//@author Tijn Gommers
// @date 2026-03-24

import { Parser } from "./parser.mjs";
import { Lexer } from "./lexer.mjs";
import { describe, it, expect } from "vitest";

describe("Parser", () => {

    it("should parse a simple SELECT statement without WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '>=',
                right: { type: 'Literal', valueType: 'number', value: 18 }
            }
        });
    });

    it("should parse a SELECT statement with != in WHERE clause", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age != 18");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '!=',
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
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined
        });
    });

    it("should parse a DELETE statement with a WHERE clause", () => {
        const lexer = new Lexer("DELETE FROM users WHERE age > 20");
        const parser = new Parser(lexer);
        const ast = parser.parse();
        expect(ast).toEqual({
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
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

    it("should parse a where clause with != and AND", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age != 18 AND city = 'AMS'");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'LogicalExpression',
                operator: 'AND',
                left: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'AGE' },
                    operator: '!=',
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

    it("should parse a where clause with IS NULL", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city IS NULL");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'NullCheckExpression',
                left: { type: 'Identifier', name: 'CITY' },
                isNegated: false
            }
        });
    });

    it("should parse a where clause with IS NOT NULL", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city IS NOT NULL");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'NullCheckExpression',
                left: { type: 'Identifier', name: 'CITY' },
                isNegated: true
            }
        });
    });

    it("should throw an error for invalid syntax", () => {
        const lexer = new Lexer("SELECT name users");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected token FROM but got IDENTIFIER");
    });

    it("should throw when SELECT has no columns", () => {
        const lexer = new Lexer("SELECT FROM users");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected at least one column after SELECT but got FROM");
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

    it("should throw when IS is not followed by NULL", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city IS 10");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected NULL after IS (NOT) but got NUMBER");
    });

    it("should throw an error for unexpected token in WHERE clause (non-identifier)", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE 10 = 20");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected identifier in WHERE clause but got NUMBER");
    });

    it("should throw an error for unexpected comparison operator token", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE id NULL");
        const parser = new Parser(lexer);
        expect(() => parser.parse()).toThrow("Expected comparison operator but got NULL");
    });

    it("should parse a comparison with NULL as right operand", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE city = NULL");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'CITY' },
                operator: '=',
                right: { type: 'Literal', valueType: 'null', value: null }
            }
        });
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
            from: [{ type: 'Table', name: 'USERS' }],
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
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '<=',
                right: { type: 'Literal', valueType: 'number', value: 65 }
            }
        });
    });

    it("should parse ORDER BY with multiple columns", () => {
        const lexer = new Lexer("SELECT name FROM users ORDER BY age, city DESC");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [
                    { type: 'Identifier', name: 'AGE' },
                    { type: 'Identifier', name: 'CITY' }
                ],
                direction: 'DESC'
            }
        });
    });

    it("should parse ORDER BY with ASC directly after the first column", () => {
        const lexer = new Lexer("SELECT name FROM users ORDER BY age ASC, city");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [
                    { type: 'Identifier', name: 'AGE' },
                    { type: 'Identifier', name: 'CITY' }
                ],
                direction: 'ASC'
            }
        });
    });

    it("should parse ORDER BY with ASC after the full column list", () => {
        const lexer = new Lexer("SELECT name FROM users ORDER BY age, city ASC");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [
                    { type: 'Identifier', name: 'AGE' },
                    { type: 'Identifier', name: 'CITY' }
                ],
                direction: 'ASC'
            }
        });
    });

    it("should default ORDER BY direction to ASC when omitted", () => {
        const lexer = new Lexer("SELECT name FROM users ORDER BY age, city");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [
                    { type: 'Identifier', name: 'AGE' },
                    { type: 'Identifier', name: 'CITY' }
                ],
                direction: 'ASC'
            }
        });
    });

    it("should parse SELECT with WHERE and ORDER BY", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age >= 18 ORDER BY age DESC, city");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'NAME' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '>=',
                right: { type: 'Literal', valueType: 'number', value: 18 }
            },
            orderBy: {
                type: 'OrderByStatement',
                columns: [
                    { type: 'Identifier', name: 'AGE' },
                    { type: 'Identifier', name: 'CITY' }
                ],
                direction: 'DESC'
            }
        });
    });

    it("should throw when ORDER BY has no columns", () => {
        const lexer = new Lexer("SELECT name FROM users ORDER BY");
        const parser = new Parser(lexer);

        expect(() => parser.parse()).toThrow("Expected at least one column after ORDER BY but got EOF");
    });

    it("should throw when ORDER BY has trailing comma", () => {
        const lexer = new Lexer("SELECT name FROM users ORDER BY age,");
        const parser = new Parser(lexer);

        expect(() => parser.parse()).toThrow("Expected column name after COMMA but got EOF");
    });

    it("should parse CROSS JOIN with two tables", () => {
        const lexer = new Lexer("SELECT * FROM users CROSS JOIN orders");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' }
            ],
            columns: [{ type: 'Identifier', name: '*' }],
            where: undefined,
            orderBy: undefined
        });
    });

    it("should parse comma-separated tables", () => {
        const lexer = new Lexer("SELECT * FROM users, orders, products");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' },
                { type: 'Table', name: 'PRODUCTS' }
            ],
            columns: [{ type: 'Identifier', name: '*' }],
            where: undefined,
            orderBy: undefined
        });
    });

    it("should parse multiple CROSS JOINs", () => {
        const lexer = new Lexer("SELECT * FROM users CROSS JOIN orders CROSS JOIN products");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast.from).toEqual([
            { type: 'Table', name: 'USERS' },
            { type: 'Table', name: 'ORDERS' },
            { type: 'Table', name: 'PRODUCTS' }
        ]);
    });

    it("should throw error for CROSS without JOIN", () => {
        const lexer = new Lexer("SELECT * FROM users CROSS orders");
        const parser = new Parser(lexer);

        expect(() => parser.parse()).toThrow("Expected JOIN after CROSS but got IDENTIFIER");
    });

    it("should parse JOIN with ON clause", () => {
        const lexer = new Lexer("SELECT * FROM users JOIN orders ON users.id = orders.user_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [
                { type: 'Table', name: 'USERS' },
                {
                    type: 'Join',
                    table: { type: 'Table', name: 'ORDERS' },
                    joinType: 'INNER',
                    on: {
                        type: 'ComparisonExpression',
                        left: { type: 'Identifier', name: 'USERS.ID' },
                        operator: '=',
                        right: { type: 'Identifier', name: 'ORDERS.USER_ID' },
                    },
                },
            ],
            columns: [{ type: 'Identifier', name: '*' }],
            where: undefined,
            orderBy: undefined,
        });
    });

    it("should parse multiple JOIN ... ON clauses", () => {
        const lexer = new Lexer("SELECT * FROM users JOIN orders ON users.id = orders.user_id JOIN payments ON orders.id = payments.order_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [
                { type: 'Table', name: 'USERS' },
                {
                    type: 'Join',
                    table: { type: 'Table', name: 'ORDERS' },
                    joinType: 'INNER',
                    on: {
                        type: 'ComparisonExpression',
                        left: { type: 'Identifier', name: 'USERS.ID' },
                        operator: '=',
                        right: { type: 'Identifier', name: 'ORDERS.USER_ID' },
                    },
                },
                {
                    type: 'Join',
                    table: { type: 'Table', name: 'PAYMENTS' },
                    joinType: 'INNER',
                    on: {
                        type: 'ComparisonExpression',
                        left: { type: 'Identifier', name: 'ORDERS.ID' },
                        operator: '=',
                        right: { type: 'Identifier', name: 'PAYMENTS.ORDER_ID' },
                    },
                },
            ],
            columns: [{ type: 'Identifier', name: '*' }],
            where: undefined,
            orderBy: undefined,
        });
    });

    it("should throw when JOIN is missing ON", () => {
        const lexer = new Lexer("SELECT * FROM users JOIN orders");
        const parser = new Parser(lexer);

        expect(() => parser.parse()).toThrow(/Expected ON/);
    });

    it("should parse dot notation in SELECT columns", () => {
        const lexer = new Lexer("SELECT users.id FROM users");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: 'USERS.ID' }],
            where: undefined,
            orderBy: undefined,
        });
    });

    it("should parse dot notation on both sides of comparison", () => {
        const lexer = new Lexer("SELECT * FROM users, orders WHERE users.id = orders.user_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' },
            ],
            columns: [{ type: 'Identifier', name: '*' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' },
            },
            orderBy: undefined,
        });
    });

    it("should throw when dot is not followed by identifier", () => {
        const lexer = new Lexer("SELECT users. FROM users");
        const parser = new Parser(lexer);

        expect(() => parser.parse()).toThrow("Expected identifier after dot but got FROM");
    });

    it("should parse INNER JOIN with ON clause", () => {
        const lexer = new Lexer("SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast.from[1]).toEqual({
            type: "Join",
            table: { type: "Table", name: "ORDERS" },
            joinType: "INNER",
            on: {
                type: "ComparisonExpression",
                left: { type: "Identifier", name: "USERS.ID" },
                operator: "=",
                right: { type: "Identifier", name: "ORDERS.USER_ID" }
            }
        });
    });

    it("should parse LEFT JOIN with ON clause", () => {
        const lexer = new Lexer("SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast.from[1]).toEqual({
            type: "Join",
            table: { type: "Table", name: "ORDERS" },
            joinType: "LEFT",
            on: {
                type: "ComparisonExpression",
                left: { type: "Identifier", name: "USERS.ID" },
                operator: "=",
                right: { type: "Identifier", name: "ORDERS.USER_ID" }
            }
        });
    });

    it("should parse LEFT OUTER JOIN with ON clause", () => {
        const lexer = new Lexer("SELECT * FROM users LEFT OUTER JOIN orders ON users.id = orders.user_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast.from[1]).toEqual({
            type: "Join",
            table: { type: "Table", name: "ORDERS" },
            joinType: "LEFT",
            on: {
                type: "ComparisonExpression",
                left: { type: "Identifier", name: "USERS.ID" },
                operator: "=",
                right: { type: "Identifier", name: "ORDERS.USER_ID" }
            }
        });
    });

    it("should parse RIGHT JOIN with ON clause", () => {
        const lexer = new Lexer("SELECT * FROM users RIGHT JOIN orders ON users.id = orders.user_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast.from[1]).toEqual({
            type: "Join",
            table: { type: "Table", name: "ORDERS" },
            joinType: "RIGHT",
            on: {
                type: "ComparisonExpression",
                left: { type: "Identifier", name: "USERS.ID" },
                operator: "=",
                right: { type: "Identifier", name: "ORDERS.USER_ID" }
            }
        });
    });

    it("should parse RIGHT OUTER JOIN with ON clause", () => {
        const lexer = new Lexer("SELECT * FROM users RIGHT OUTER JOIN orders ON users.id = orders.user_id");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast.from[1]).toEqual({
            type: "Join",
            table: { type: "Table", name: "ORDERS" },
            joinType: "RIGHT",
            on: {
                type: "ComparisonExpression",
                left: { type: "Identifier", name: "USERS.ID" },
                operator: "=",
                right: { type: "Identifier", name: "ORDERS.USER_ID" }
            }
        });
    });

    it("should parse SELECT with LIMIT clause", () => {
        const lexer = new Lexer("SELECT * FROM users LIMIT 10");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: '*' }],
            where: undefined,
            orderBy: undefined,
            limit: {
                type: 'LimitOffset',
                limit: 10,
                offset: undefined
            }
        });
    });

    it("should parse SELECT with LIMIT and OFFSET clause", () => {
        const lexer = new Lexer("SELECT * FROM users LIMIT 10 OFFSET 5");
        const parser = new Parser(lexer);
        const ast = parser.parse();

        expect(ast).toEqual({
            type: 'SelectStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            columns: [{ type: 'Identifier', name: '*' }],
            where: undefined,
            orderBy: undefined,
            limit: {
                type: 'LimitOffset',
                limit: 10,
                offset: 5
            }
        });
    });

    it("should parse SELECT with WHERE, ORDER BY and LIMIT OFFSET", () => {
        const lexer = new Lexer("SELECT name FROM users WHERE age > 30 ORDER BY name ASC LIMIT 20 OFFSET 10");
        const parser = new Parser(lexer);
        const ast = parser.parse() as any;

        expect(ast.limit).toEqual({
            type: 'LimitOffset',
            limit: 20,
            offset: 10
        });
    });
});

