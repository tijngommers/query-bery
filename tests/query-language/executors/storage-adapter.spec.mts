//@author Tijn Gommers
//@date 2026-04-02

import { describe, expect, it, vi } from 'vitest';
import { SelectExecutor } from '../../../src/query-language/executors/select/index.mts';
import { DeleteExecutor } from '../../../src/query-language/executors/delete/index.mts';
import { UpdateExecutor } from '../../../src/query-language/executors/update/index.mts';
import { InsertExecutor } from '../../../src/query-language/executors/insert/index.mts';
import { StorageAdapter } from '../../../src/storage-adapter/storage-adapter.mts';
import { SelectStatement, DeleteStatement, UpdateStatement, InsertStatement } from '../../../src/query-language/types/index.mjs';

describe('StorageAdapter-backed executors', () => {
    it('should read SELECT rows through the adapter', async () => {
        const read = vi.fn(async (table: string, columns: string[], where?: Record<string, any>) => {
            expect(table).toBe('USERS');
            expect(columns).toEqual(['NAME']);
            expect(where).toEqual({
                type: 'ComparisonExpression',
                operator: '=',
                left: 'ID',
                right: 1,
            });

            return [{ NAME: 'Alice' }];
        });

        const adapter: StorageAdapter = {
            read,
            write: async () => undefined,
            filter: async () => [],
            project: async () => [],
            delete: async () => undefined,
            update: async () => undefined,
        };

        const selectExecutor = new SelectExecutor(adapter);
        const node: SelectStatement = {
            type: 'SelectStatement',
            distinct: false,
            columns: [{ type: 'Identifier', name: 'NAME' }],
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ID' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 1 },
            },
            orderBy: undefined,
            limit: undefined,
        };

        const result = await selectExecutor.executeSelect(node);

        expect(result.rows).toEqual([{ NAME: 'Alice' }]);
        expect(read).toHaveBeenCalledTimes(1);
    });

    it('should delete rows through the adapter', async () => {
        const filter = vi.fn(async () => [{ ID: 1 }, { ID: 2 }]);
        const deleteRows = vi.fn(async () => undefined);

        const adapter: StorageAdapter = {
            read: async () => [],
            write: async () => undefined,
            filter,
            project: async () => [],
            delete: deleteRows,
            update: async () => undefined,
        };

        const deleteExecutor = new DeleteExecutor(adapter);
        const node: DeleteStatement = {
            type: 'DeleteStatement',
            from: [{ type: 'Table', name: 'USERS' }],
            where: {
                type: 'ComparisonExpression',
                left: { type: 'Identifier', name: 'ACTIVE' },
                operator: '=',
                right: { type: 'Literal', valueType: 'number', value: 0 },
            },
        };

        const result = await deleteExecutor.executeDelete(node);

        expect(result.deletedCount).toBe(2);
        expect(filter).toHaveBeenCalledTimes(1);
        expect(deleteRows).toHaveBeenCalledWith('USERS', {
            type: 'ComparisonExpression',
            operator: '=',
            left: 'ACTIVE',
            right: 0,
        });
    });

    it('should update rows through the adapter', async () => {
        const filter = vi.fn(async () => [{ ID: 1, STATUS: 'INACTIVE' }]);
        const updateRows = vi.fn(async () => undefined);

        const adapter: StorageAdapter = {
            read: async () => [],
            write: async () => undefined,
            filter,
            project: async () => [],
            delete: async () => undefined,
            update: updateRows,
        };

        const updateExecutor = new UpdateExecutor(adapter);
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
                right: { type: 'Literal', valueType: 'number', value: 1 },
            },
        };

        const result = await updateExecutor.executeUpdate(node);

        expect(result.updatedCount).toBe(1);
        expect(result.rows).toEqual([{ ID: 1, STATUS: 'ACTIVE' }]);
        expect(updateRows).toHaveBeenCalledWith('USERS', { STATUS: 'ACTIVE' }, {
            type: 'ComparisonExpression',
            operator: '=',
            left: 'ID',
            right: 1,
        });
    });

    it('should write rows through the adapter on INSERT', async () => {
        const write = vi.fn(async () => undefined);

        const adapter: StorageAdapter = {
            read: async () => [],
            write,
            filter: async () => [],
            project: async () => [],
            delete: async () => undefined,
            update: async () => undefined,
        };

        const insertExecutor = new InsertExecutor(adapter);
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

        const result = await insertExecutor.executeInsert(node);

        expect(result.insertedCount).toBe(1);
        expect(write).toHaveBeenCalledWith('USERS', [{ ID: 1, NAME: 'Alice' }]);
    });
});