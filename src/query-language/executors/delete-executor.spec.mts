//@author Tijn Gommers
// @date 2026-03-27

import { DeleteExecutor } from "./delete-executor.mts";
import { describe, it, expect, beforeEach } from "vitest";
import { DeleteStatement } from "../types.mjs";

describe('DeleteExecutor', () => {
    let deleteExecutor: DeleteExecutor;

    beforeEach(() => {
        deleteExecutor = new DeleteExecutor();
    });

    it('should execute a simple DELETE statement', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ID' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 }
            }
        };

        const result = deleteExecutor.executeDelete(deleteNode);

        expect(result.type).toBe('DeleteResult');
        expect(result.from).toEqual([{ type: 'Table', name: 'USERS' }]);
        expect(result.where).toBeDefined();
    });

    it('should execute DELETE with multiple tables', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [
                { type: 'Table', name: 'USERS' },
                { type: 'Table', name: 'ORDERS' }
            ],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ACTIVE' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 0 }
            }
        };

        const result = deleteExecutor.executeDelete(deleteNode);

        expect(result.from).toHaveLength(2);
        expect(result.from[0].name).toBe('USERS');
        expect(result.from[1].name).toBe('ORDERS');
    });

    it('should execute DELETE with WHERE clause', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'AGE' },
                operator: '<',
                right: { type: 'Literal', valueType: 'number', value: 18 }
            }
        };

        const result = deleteExecutor.executeDelete(deleteNode);

        expect(result.where?.operator).toBe('<');
        expect(result.where?.right?.value).toBe(18);
    });

    it('should throw error for DELETE without FROM', () => {
        const deleteNode: any = {
            type: 'DeleteStatement',
            from: [],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ID' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 }
            }
        };

        expect(() => deleteExecutor.executeDelete(deleteNode)).toThrow('Invalid DELETE: no FROM clause');
    });

    it('should throw error when FROM is null', () => {
        const deleteNode: any = {
            type: 'DeleteStatement',
            from: null,
            where: undefined
        };

        expect(() => deleteExecutor.executeDelete(deleteNode)).toThrow('Invalid DELETE: no FROM clause');
    });

    it('should identify safe DELETE (with WHERE clause)', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ID' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 5 }
            }
        };

        const isSafe = deleteExecutor.isSafeDelete(deleteNode);

        expect(isSafe).toBe(true);
    });

    it('should identify unsafe DELETE (without WHERE clause)', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: undefined
        };

        const isSafe = deleteExecutor.isSafeDelete(deleteNode);

        expect(isSafe).toBe(false);
    });

    it('should execute DELETE with complex WHERE condition', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'LogicalExpression',
                operator: 'AND',
                left: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'STATUS' },
                    operator: '=',
                    right: { type: 'Literal', valueType: 'string', value: 'inactive' }
                },
                right: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'DELETED_AT' },
                    operator: '!=',
                    right: { type: 'Literal', valueType: 'null', value: null }
                }
            }
        };

        const result = deleteExecutor.executeDelete(deleteNode);

        expect(result.where?.operator).toBe('AND');
        expect(result.type).toBe('DeleteResult');
    });

    it('should preserve FROM table names in result', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [
                { type: 'Table', name: 'ARCHIVED_USERS' },
                { type: 'Table', name: 'ARCHIVED_ORDERS' }
            ],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ARCHIVED' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 }
            }
        };

        const result = deleteExecutor.executeDelete(deleteNode);

        expect(result.from[0].name).toBe('ARCHIVED_USERS');
        expect(result.from[1].name).toBe('ARCHIVED_ORDERS');
    });

    it('should handle DELETE with IS NULL condition', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'NullCheckExpression',
                left: { type: 'Identifier', name: 'DELETED_AT' },
                isNegated: false
            }
        };

        const result = deleteExecutor.executeDelete(deleteNode);

        expect(result.where?.type).toBe('NullCheckExpression');
        expect(result.type).toBe('DeleteResult');
    });

    it('should validate DELETE statement correctly', () => {
        const validDeleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ID' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 }
            }
        };

        // Should not throw
        expect(() => deleteExecutor.executeDelete(validDeleteNode)).not.toThrow();
    });

    it('should execute DELETE from single table with safe WHERE', () => {
        const deleteNode: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'SESSIONS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'EXPIRES_AT' },
                operator: '<',
                right: { type: 'Literal', valueType: 'number', value: 1711699200 }
            }
        };

        const result = deleteExecutor.executeDelete(deleteNode);
        const isSafe = deleteExecutor.isSafeDelete(deleteNode);

        expect(result.type).toBe('DeleteResult');
        expect(isSafe).toBe(true);
    });
});
