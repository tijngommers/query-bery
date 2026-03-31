//@author Tijn Gommers
// @date 2026-03-31

import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateExecutor } from '../../../src/query-language/executors/update/index.mts';
import { UpdateStatement } from '../../../src/query-language/types/index.mjs';

describe('UpdateExecutor', () => {
    let updateExecutor: UpdateExecutor;

    beforeEach(() => {
        updateExecutor = new UpdateExecutor();
    });

    it('should update all rows when WHERE is omitted', () => {
        const node: UpdateStatement = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [
                {
                    column: { type: 'Identifier', name: 'STATUS' },
                    value: { type: 'Literal', valueType: 'string', value: 'ACTIVE' },
                },
            ],
            where: undefined,
        };

        const rows = [
            { ID: 1, STATUS: 'INACTIVE' },
            { ID: 2, STATUS: 'INACTIVE' },
        ];

        const result = updateExecutor.executeUpdate(node, rows);

        expect(result.type).toBe('UpdateResult');
        expect(result.updatedCount).toBe(2);
        expect(rows).toEqual([
            { ID: 1, STATUS: 'ACTIVE' },
            { ID: 2, STATUS: 'ACTIVE' },
        ]);
    });

    it('should update only matching rows with WHERE clause', () => {
        const node: UpdateStatement = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [
                {
                    column: { type: 'Identifier', name: 'STATUS' },
                    value: { type: 'Literal', valueType: 'string', value: 'ACTIVE' },
                },
            ],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ID' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 2 },
            },
        };

        const rows = [
            { ID: 1, STATUS: 'INACTIVE' },
            { ID: 2, STATUS: 'INACTIVE' },
        ];

        const result = updateExecutor.executeUpdate(node, rows);

        expect(result.updatedCount).toBe(1);
        expect(rows).toEqual([
            { ID: 1, STATUS: 'INACTIVE' },
            { ID: 2, STATUS: 'ACTIVE' },
        ]);
    });

    it('should resolve identifier assignments from current row', () => {
        const node: UpdateStatement = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [
                {
                    column: { type: 'Identifier', name: 'COPY_AGE' },
                    value: { type: 'Identifier', name: 'AGE' },
                },
            ],
            where: undefined,
        };

        const rows: Record<string, any>[] = [{ ID: 1, AGE: 35 }];

        updateExecutor.executeUpdate(node, rows);

        expect(rows[0].COPY_AGE).toBe(35);
    });

    it('should throw for missing SET assignments', () => {
        const node: any = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [],
            where: undefined,
        };

        expect(() => updateExecutor.executeUpdate(node, [{ ID: 1 }])).toThrow('Invalid UPDATE: no SET assignments specified');
    });

    it('should update rows matching AND logical where condition', () => {
        const node: UpdateStatement = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [
                {
                    column: { type: 'Identifier', name: 'STATUS' },
                    value: { type: 'Literal', valueType: 'string', value: 'ACTIVE' },
                },
            ],
            where: {
                type: 'LogicalExpression',
                operator: 'AND',
                left: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'AGE' },
                    operator: '>=',
                    right: { type: 'Literal', valueType: 'number', value: 18 },
                },
                right: {
                    type: 'ComparisonExpression',
                    left: { type: 'Identifier', name: 'COUNTRY' },
                    operator: '=',
                    right: { type: 'Literal', valueType: 'string', value: 'NL' },
                },
            },
        };

        const rows = [
            { ID: 1, AGE: 17, COUNTRY: 'NL', STATUS: 'INACTIVE' },
            { ID: 2, AGE: 20, COUNTRY: 'BE', STATUS: 'INACTIVE' },
            { ID: 3, AGE: 25, COUNTRY: 'NL', STATUS: 'INACTIVE' },
        ];

        const result = updateExecutor.executeUpdate(node, rows);

        expect(result.updatedCount).toBe(1);
        expect(rows[2].STATUS).toBe('ACTIVE');
    });

    it('should update rows matching IN expression', () => {
        const node: UpdateStatement = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [
                {
                    column: { type: 'Identifier', name: 'FLAGGED' },
                    value: { type: 'Literal', valueType: 'number', value: 1 },
                },
            ],
            where: {
                type: 'InExpression',
                left: { type: 'Identifier', name: 'ID' },
                values: [
                    { type: 'Literal', valueType: 'number', value: 1 },
                    { type: 'Literal', valueType: 'number', value: 3 },
                ],
            },
        };

        const rows: Record<string, any>[] = [
            { ID: 1 },
            { ID: 2 },
            { ID: 3 },
        ];

        const result = updateExecutor.executeUpdate(node, rows);

        expect(result.updatedCount).toBe(2);
        expect(rows).toEqual([
            { ID: 1, FLAGGED: 1 },
            { ID: 2 },
            { ID: 3, FLAGGED: 1 },
        ]);
    });

    it('should update rows matching IS NULL where condition', () => {
        const node: UpdateStatement = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [
                {
                    column: { type: 'Identifier', name: 'STATUS' },
                    value: { type: 'Literal', valueType: 'string', value: 'PENDING' },
                },
            ],
            where: {
                type: 'NullCheckExpression',
                left: { type: 'Identifier', name: 'DELETED_AT' },
                isNegated: false,
            },
        };

        const rows: Record<string, any>[] = [
            { ID: 1, DELETED_AT: null, STATUS: 'UNKNOWN' },
            { ID: 2, DELETED_AT: 100, STATUS: 'UNKNOWN' },
            { ID: 3, STATUS: 'UNKNOWN' },
        ];

        const result = updateExecutor.executeUpdate(node, rows);

        expect(result.updatedCount).toBe(2);
        expect(rows[0].STATUS).toBe('PENDING');
        expect(rows[1].STATUS).toBe('UNKNOWN');
        expect(rows[2].STATUS).toBe('PENDING');
    });

    it('should throw for invalid arithmetic operands in WHERE', () => {
        const node: UpdateStatement = {
            type: 'UpdateStatement',
            table: { type: 'Table', name: 'USERS' },
            set: [
                {
                    column: { type: 'Identifier', name: 'STATUS' },
                    value: { type: 'Literal', valueType: 'string', value: 'ACTIVE' },
                },
            ],
            where: {
                type: 'ComparisonExpression',
                left: {
                    type: 'ArithmeticExpression',
                    operator: '+',
                    left: { type: 'Identifier', name: 'AGE' },
                    right: { type: 'Literal', valueType: 'number', value: 2 },
                },
                operator: '>',
                right: { type: 'Literal', valueType: 'number', value: 10 },
            },
        };

        expect(() => updateExecutor.executeUpdate(node, [{ AGE: 'bad' }])).toThrow('Invalid arithmetic operands: bad + 2');
    });

    it('should throw for missing table', () => {
        const node: any = {
            type: 'UpdateStatement',
            table: null,
            set: [
                {
                    column: { type: 'Identifier', name: 'STATUS' },
                    value: { type: 'Literal', valueType: 'string', value: 'ACTIVE' },
                },
            ],
            where: undefined,
        };

        expect(() => updateExecutor.executeUpdate(node, [{ ID: 1 }])).toThrow('Invalid UPDATE: no table specified');
    });
});
