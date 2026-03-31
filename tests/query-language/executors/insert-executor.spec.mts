//@author Tijn Gommers
// @date 2026-03-31

import { describe, it, expect, beforeEach } from 'vitest';
import { InsertExecutor } from '../../../src/query-language/executors/insert/index.mts';
import { InsertStatement } from '../../../src/query-language/types/index.mjs';

describe('InsertExecutor', () => {
    let insertExecutor: InsertExecutor;

    beforeEach(() => {
        insertExecutor = new InsertExecutor();
    });

    it('should execute INSERT with a single row', () => {
        const node: InsertStatement = {
            type: 'InsertStatement',
            table: { type: 'Table', name: 'USERS' },
            columns: [
                { type: 'Identifier', name: 'ID' },
                { type: 'Identifier', name: 'NAME' },
            ],
            values: [[
                { type: 'Literal', valueType: 'number', value: 1 },
                { type: 'Literal', valueType: 'string', value: 'Alice' },
            ]],
        };

        const result = insertExecutor.executeInsert(node);

        expect(result.type).toBe('InsertResult');
        expect(result.insertedCount).toBe(1);
        expect(result.rows).toEqual([{ ID: 1, NAME: 'Alice' }]);
    });

    it('should execute INSERT with multiple rows', () => {
        const node: InsertStatement = {
            type: 'InsertStatement',
            table: { type: 'Table', name: 'USERS' },
            columns: [
                { type: 'Identifier', name: 'ID' },
                { type: 'Identifier', name: 'NAME' },
            ],
            values: [
                [
                    { type: 'Literal', valueType: 'number', value: 1 },
                    { type: 'Literal', valueType: 'string', value: 'Alice' },
                ],
                [
                    { type: 'Literal', valueType: 'number', value: 2 },
                    { type: 'Literal', valueType: 'string', value: 'Bob' },
                ],
            ],
        };

        const result = insertExecutor.executeInsert(node);

        expect(result.insertedCount).toBe(2);
        expect(result.rows).toEqual([
            { ID: 1, NAME: 'Alice' },
            { ID: 2, NAME: 'Bob' },
        ]);
    });

    it('should append inserted rows to provided inputRows', () => {
        const existingRows = [{ ID: 99, NAME: 'Existing' }];

        const node: InsertStatement = {
            type: 'InsertStatement',
            table: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'ID' }],
            values: [[{ type: 'Literal', valueType: 'number', value: 1 }]],
        };

        insertExecutor.executeInsert(node, existingRows);

        expect(existingRows).toEqual([
            { ID: 99, NAME: 'Existing' },
            { ID: 1 },
        ]);
    });

    it('should throw for missing columns', () => {
        const node: any = {
            type: 'InsertStatement',
            table: { type: 'Table', name: 'USERS' },
            columns: [],
            values: [[{ type: 'Literal', valueType: 'number', value: 1 }]],
        };

        expect(() => insertExecutor.executeInsert(node)).toThrow('Invalid INSERT: no columns specified');
    });

    it('should throw for missing values', () => {
        const node: any = {
            type: 'InsertStatement',
            table: { type: 'Table', name: 'USERS' },
            columns: [{ type: 'Identifier', name: 'ID' }],
            values: [],
        };

        expect(() => insertExecutor.executeInsert(node)).toThrow('Invalid INSERT: no values specified');
    });

    it('should throw for column/value length mismatch', () => {
        const node: InsertStatement = {
            type: 'InsertStatement',
            table: { type: 'Table', name: 'USERS' },
            columns: [
                { type: 'Identifier', name: 'ID' },
                { type: 'Identifier', name: 'NAME' },
            ],
            values: [[{ type: 'Literal', valueType: 'number', value: 1 }]],
        };

        expect(() => insertExecutor.executeInsert(node)).toThrow('Invalid INSERT: column count 2 does not match values count 1');
    });
});
