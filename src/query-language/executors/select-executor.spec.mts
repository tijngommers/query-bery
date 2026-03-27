//@author Tijn Gommers
// @date 2026-03-27

import { SelectExecutor } from "./select-executor.mts";
import { describe, it, expect, beforeEach } from "vitest";
import { SelectStatement, IdentifierNode, FromNode } from "../types.mjs";

describe('SelectExecutor', () => {
    let selectExecutor: SelectExecutor;

    beforeEach(() => {
        selectExecutor = new SelectExecutor();
    });

    it('should execute a simple SELECT statement', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.type).toBe('SelectResult');
        expect(result.columns).toEqual([{ type: 'Identifier', name: 'NAME' }]);
        expect(result.from).toEqual([{ type: 'Table', name: 'USERS' }]);
    });

    it('should execute SELECT with WHERE clause', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '>',
                right: { type: 'Literal', valueType: 'number', value: 30 }
            },
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.where).toBeDefined();
        expect(result.where?.operator).toBe('>');
    });

    it('should execute SELECT with ORDER BY clause', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [{ type: 'Identifier', name: 'NAME' }],
                direction: 'ASC'
            },
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.orderBy).toBeDefined();
        expect(result.orderBy?.direction).toBe('ASC');
    });

    it('should execute SELECT with LIMIT clause', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: '*' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: {
                type: 'LimitOffset',
                limit: 10,
                offset: undefined
            }
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.limit).toBeDefined();
        expect(result.limit?.limit).toBe(10);
    });

    it('should execute SELECT with LIMIT and OFFSET', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: '*' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: {
                type: 'LimitOffset',
                limit: 10,
                offset: 5
            }
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.limit?.limit).toBe(10);
        expect(result.limit?.offset).toBe(5);
    });

    it('should execute SELECT with JOIN', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
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
            ] as FromNode[],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.from).toHaveLength(2);
        expect(result.from[0]).toEqual({ type: 'Table', name: 'USERS' });
        expect(result.from[1].type).toBe('Join');
    });

    it('should execute SELECT with multiple JOINs', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
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
                },
                {
                    type: 'Join',
                    table: { type: 'Table', name: 'PRODUCTS' },
                    joinType: 'INNER',
                    on: {
                        type: 'ComparisonExpression',
                        left: { type: 'Identifier', name: 'ORDERS.PRODUCT_ID' },
                        operator: '=',
                        right: { type: 'Identifier', name: 'PRODUCTS.ID' }
                    }
                }
            ] as FromNode[],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.from).toHaveLength(3);
        expect(result.from[1].type).toBe('Join');
        expect(result.from[2].type).toBe('Join');
    });

    it('should execute SELECT with all clauses', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [
                { type: 'Identifier', name: 'NAME' },
                { type: 'Identifier', name: 'EMAIL' }
            ],
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ACTIVE' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 }
            },
            orderBy: {
                type: 'OrderByStatement',
                columns: [{ type: 'Identifier', name: 'NAME' }],
                direction: 'ASC'
            },
            limit: {
                type: 'LimitOffset',
                limit: 50,
                offset: 10
            }
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.type).toBe('SelectResult');
        expect(result.columns).toHaveLength(2);
        expect(result.where).toBeDefined();
        expect(result.orderBy).toBeDefined();
        expect(result.limit).toBeDefined();
    });

    it('should throw error for SELECT without columns', () => {
        const selectNode: any = {
            type: 'SelectStatement',
            columns: [],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined
        };

        expect(() => selectExecutor.validateSelect(selectNode)).toThrow('Invalid SELECT: no columns specified');
    });

    it('should throw error for SELECT without FROM', () => {
        const selectNode: any = {
            type: 'SelectStatement',
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [],
            where: undefined
        };

        expect(() => selectExecutor.validateSelect(selectNode)).toThrow('Invalid SELECT: no FROM clause');
    });

    it('should validate valid SELECT statement', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        expect(() => selectExecutor.validateSelect(selectNode)).not.toThrow();
    });

    it('should process FROM clause with tables only', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: '*' }],
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' }
            ],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.from).toHaveLength(2);
        expect(result.from[0]).toEqual({ type: 'Table', name: 'USERS' });
        expect(result.from[1]).toEqual({ type: 'Table', name: 'ORDERS' });
    });

    it('should handle LEFT JOIN in SELECT', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: '*' }],
            from: [
                { type: 'Table', name: 'USERS' },
                {
                    type: 'Join',
                    table: { type: 'Table', name: 'ORDERS' },
                    joinType: 'LEFT',
                    on: {
                        type: 'ComparisonExpression',
                        left: { type: 'Identifier', name: 'USERS.ID' },
                        operator: '=',
                        right: { type: 'Identifier', name: 'ORDERS.USER_ID' }
                    }
                }
            ] as FromNode[],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.from[1].joinType).toBe('LEFT');
    });

    it('should execute SELECT DISTINCT', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.type).toBe('SelectResult');
        expect(result.distinct).toBe(true);
        expect(result.columns).toEqual([{ type: 'Identifier', name: 'NAME' }]);
    });

    it('should execute SELECT without DISTINCT', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: 'EMAIL' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(false);
    });

    it('should execute SELECT DISTINCT with multiple columns', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [
                { type: 'Identifier', name: 'NAME' },
                { type: 'Identifier', name: 'EMAIL' }
            ],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(true);
        expect(result.columns).toHaveLength(2);
    });

    it('should execute SELECT DISTINCT * ', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [{ type: 'Identifier', name: '*' }],
            from: [{ type: 'Table', name: 'PRODUCTS' }],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(true);
        expect(result.columns[0].name).toBe('*');
    });

    it('should execute SELECT DISTINCT with WHERE clause', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [{ type: 'Identifier', name: 'EMAIL' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'VERIFIED' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 }
            },
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(true);
        expect(result.where).toBeDefined();
    });

    it('should execute SELECT DISTINCT with ORDER BY', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [{ type: 'Identifier', name: 'CATEGORY' }],
            from: [{ type: 'Table', name: 'PRODUCTS' }],
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [{ type: 'Identifier', name: 'CATEGORY' }],
                direction: 'ASC'
            },
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(true);
        expect(result.orderBy).toBeDefined();
        expect(result.orderBy?.direction).toBe('ASC');
    });

    it('should execute SELECT DISTINCT with LIMIT', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [{ type: 'Identifier', name: 'COUNTRY' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined,
            orderBy: undefined,
            limit: {
                type: 'LimitOffset',
                limit: 10,
                offset: undefined
            }
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(true);
        expect(result.limit?.limit).toBe(10);
    });

    it('should execute SELECT DISTINCT with all clauses', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [{ type: 'Identifier', name: 'DEPARTMENT' }],
            from: [{ type: 'Table', name: 'EMPLOYEES' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ACTIVE' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 }
            },
            orderBy: {
                type: 'OrderByStatement',
                columns: [{ type: 'Identifier', name: 'DEPARTMENT' }],
                direction: 'DESC'
            },
            limit: {
                type: 'LimitOffset',
                limit: 50,
                offset: 5
            }
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(true);
        expect(result.where).toBeDefined();
        expect(result.orderBy).toBeDefined();
        expect(result.limit).toBeDefined();
    });

    it('should preserve distinct flag in result', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: true,
            columns: [{ type: 'Identifier', name: 'ID' }],
            from: [{ type: 'Table', name: 'TRANSACTIONS' }],
            where: undefined,
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.distinct).toBe(true);
        expect(result.type).toBe('SelectResult');
    });

    it('should execute SELECT with IN expression in WHERE clause', () => {
        const selectNode: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'InExpression',
                left: { type: 'Identifier', name: 'ID' },
                values: [
                    { type: 'Literal', valueType: 'number', value: 1 },
                    { type: 'Literal', valueType: 'number', value: 2 },
                    { type: 'Literal', valueType: 'number', value: 3 }
                ]
            },
            orderBy: undefined,
            limit: undefined
        };

        const result = selectExecutor.executeSelect(selectNode);

        expect(result.where).toEqual({
            type: 'InExpression',
            left: { type: 'Identifier', name: 'ID' },
            values: [
                { type: 'Literal', valueType: 'number', value: 1 },
                { type: 'Literal', valueType: 'number', value: 2 },
                { type: 'Literal', valueType: 'number', value: 3 }
            ]
        });
    });
});
