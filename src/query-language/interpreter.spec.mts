//@author Tijn Gommers
// @date 2026-03-25

import { Interpreter } from "./interpreter.mts";
import { describe, it, expect } from "vitest";

describe('Interpreter', () => {
    it('should execute a simple SELECT query', () => {
        const query = "SELECT name, age FROM users WHERE age > 30 AND city = 'New York'";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();
        expect(result).toEqual({
            type: 'SelectResult',
            distinct: false,
            columns: [
                { type: 'Identifier', name: 'NAME' },
                { type: 'Identifier', name: 'AGE' }
            ],
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'LogicalExpression',
                operator: 'AND',
                left: {
                    type: 'ComparisonExpression',
                    operator: '>',
                    left: { type: 'Identifier', name: 'AGE' },
                    right: { type: 'Literal', valueType: 'number', value: 30 }
                },
                right: {
                    type: 'ComparisonExpression',
                    operator: '=',
                    left: { type: 'Identifier', name: 'CITY' },
                    right: { type: 'Literal', valueType: 'string', value: 'New York' }
                }
            },
            orderBy: undefined,
            limit: undefined
        });
    });

    it('should execute a simple DELETE query', () => {
        const query = "DELETE FROM users WHERE id = 10";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();
        expect(result).toEqual({
            type: 'DeleteResult',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                operator: '=',
                left: { type: 'Identifier', name: 'ID' },
                right: { type: 'Literal', valueType: 'number', value: 10 }
            }
        });
    });

    it('should execute a SELECT query with IS NOT NULL', () => {
        const query = "SELECT name FROM users WHERE city IS NOT NULL";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'SelectResult',
            distinct: false,
            columns: [
                { type: 'Identifier', name: 'NAME' }
            ],
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'NullCheckExpression',
                left: { type: 'Identifier', name: 'CITY' },
                isNegated: true
            },
            orderBy: undefined,
            limit: undefined
        });
    });

    it('should execute a SELECT query with ORDER BY multiple columns', () => {
        const query = "SELECT name FROM users ORDER BY age DESC, city";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'SelectResult',
            distinct: false,
            columns: [
                { type: 'Identifier', name: 'NAME' }
            ],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [
                    { type: 'Identifier', name: 'AGE' },
                    { type: 'Identifier', name: 'CITY' }
                ],
                direction: 'DESC'
            },
            limit: undefined
        });
    });

    it('should execute a SELECT with CROSS JOIN', () => {
        const query = "SELECT * FROM users CROSS JOIN orders";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'SelectResult',
            distinct: false,
            columns: [{ type: 'Identifier', name: '*' }],
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' }
            ],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        });
    });

    it('should execute a SELECT with comma-separated tables', () => {
        const query = "SELECT * FROM users, orders, products";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'SelectResult',
            distinct: false,
            columns: [{ type: 'Identifier', name: '*' }],
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' },
                { type: 'Table', name: 'PRODUCTS' }
            ],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        });
    });

    it('should execute a DELETE with multiple comma-separated tables', () => {
        const query = "DELETE FROM users, orders WHERE active = 1";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'DeleteResult',
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' }
            ],
            where: {
                type: 'ComparisonExpression',
                operator: '=',
                left: { type: 'Identifier', name: 'ACTIVE' },
                right: { type: 'Literal', valueType: 'number', value: 1 }
            }
        });
    });

    it('should execute a SELECT with JOIN ... ON', () => {
        const query = "SELECT * FROM users JOIN orders ON users.id = orders.user_id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'SelectResult',
            distinct: false,
            columns: [{ type: 'Identifier', name: '*' }],
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
                        right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
                    }
                }
            ],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        });
    });

    it('should execute a SELECT with INNER JOIN ... ON', () => {
        const query = "SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from[1]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'ORDERS' },
            joinType: 'INNER',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
            }
        });
    });

    it('should execute a SELECT with LEFT JOIN ... ON', () => {
        const query = "SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from[1]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'ORDERS' },
            joinType: 'LEFT',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
            }
        });
    });

    it('should execute a SELECT with RIGHT JOIN ... ON', () => {
        const query = "SELECT * FROM users RIGHT JOIN orders ON users.id = orders.user_id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from[1]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'ORDERS' },
            joinType: 'RIGHT',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
            }
        });
    });

    it('should execute a SELECT with LIMIT clause', () => {
        const query = "SELECT * FROM users LIMIT 10";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.limit).toEqual({
            type: 'LimitOffset',
            limit: 10,
            offset: undefined
        });
    });

    it('should execute a SELECT with LIMIT and OFFSET', () => {
        const query = "SELECT * FROM users LIMIT 10 OFFSET 5";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.limit).toEqual({
            type: 'LimitOffset',
            limit: 10,
            offset: 5
        });
    });

    it('should execute a SELECT with LEFT OUTER JOIN ... ON', () => {
        const query = "SELECT * FROM users LEFT OUTER JOIN orders ON users.id = orders.user_id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from[1]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'ORDERS' },
            joinType: 'LEFT',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
            }
        });
    });

    it('should execute a SELECT with RIGHT OUTER JOIN ... ON', () => {
        const query = "SELECT * FROM users RIGHT OUTER JOIN orders ON users.id = orders.user_id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from[1]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'ORDERS' },
            joinType: 'RIGHT',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
            }
        });
    });

    it('should execute a SELECT with multiple JOINs', () => {
        const query = "SELECT * FROM users JOIN orders ON users.id = orders.user_id JOIN products ON orders.product_id = products.id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from.length).toBe(3);
        expect(result.from[0]).toEqual({ type: 'Table', name: 'USERS' });
        expect(result.from[1]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'ORDERS' },
            joinType: 'INNER',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
            }
        });
        expect(result.from[2]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'PRODUCTS' },
            joinType: 'INNER',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ORDERS.PRODUCT_ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'PRODUCTS.ID' }
            }
        });
    });

    it('should execute a SELECT with JOIN and WHERE clause', () => {
        const query = "SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE orders.status = 'completed'";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from[1]).toEqual({
            type: 'Join',
            table: { type: 'Table', name: 'ORDERS' },
            joinType: 'INNER',
            on: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'USERS.ID' },
                operator: '=',
                right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
            }
        });
        expect(result.where).toEqual({
            type: 'ComparisonExpression',
            operator: '=',
            left: { type: 'Identifier', name: 'ORDERS.STATUS' },
            right: { type: 'Literal', valueType: 'string', value: 'completed' }
        });
    });

    it('should execute a SELECT with JOIN, WHERE and ORDER BY', () => {
        const query = "SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE users.active = 1 ORDER BY orders.created_at DESC";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.from[0]).toEqual({ type: 'Table', name: 'USERS' });
        expect(result.from[1].type).toBe('Join');
        expect(result.where).toBeDefined();
        expect(result.orderBy).toBeDefined();
        expect(result.orderBy?.direction).toBe('DESC');
    });

    it('should execute SELECT DISTINCT', () => {
        const query = "SELECT DISTINCT name FROM users";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.columns).toEqual([{ type: 'Identifier', name: 'NAME' }]);
    });

    it('should execute SELECT without DISTINCT', () => {
        const query = "SELECT name FROM users";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(false);
    });

    it('should execute SELECT DISTINCT with multiple columns', () => {
        const query = "SELECT DISTINCT name, email FROM users";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.columns).toHaveLength(2);
        expect(result.columns[0].name).toBe('NAME');
        expect(result.columns[1].name).toBe('EMAIL');
    });

    it('should execute SELECT DISTINCT * FROM users', () => {
        const query = "SELECT DISTINCT * FROM users";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.columns[0].name).toBe('*');
    });

    it('should execute SELECT DISTINCT with WHERE clause', () => {
        const query = "SELECT DISTINCT email FROM users WHERE active = 1";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.where).toBeDefined();
    });

    it('should execute SELECT DISTINCT with ORDER BY', () => {
        const query = "SELECT DISTINCT name FROM users ORDER BY name DESC";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.orderBy?.direction).toBe('DESC');
    });

    it('should execute SELECT DISTINCT with LIMIT', () => {
        const query = "SELECT DISTINCT category FROM products LIMIT 5";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.limit?.limit).toBe(5);
    });

    it('should execute SELECT DISTINCT with WHERE, ORDER BY and LIMIT', () => {
        const query = "SELECT DISTINCT email FROM users WHERE verified = 1 ORDER BY email ASC LIMIT 100";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.where).toBeDefined();
        expect(result.orderBy).toBeDefined();
        expect(result.limit).toBeDefined();
    });

    it('should execute SELECT DISTINCT with JOIN', () => {
        const query = "SELECT DISTINCT users.name FROM users JOIN orders ON users.id = orders.user_id";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.from).toHaveLength(2);
    });
});