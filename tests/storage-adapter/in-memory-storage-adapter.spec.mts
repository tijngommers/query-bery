//@author Tijn Gommers
//@date 2026-04-02

import { describe, expect, it } from 'vitest';
import { InMemoryStorageAdapter } from '../../src/storage-adapter/in-memory-storage-adapter.mts';
import { Interpreter } from '../../src/query-language/interpreter/index.mts';

describe('InMemoryStorageAdapter', () => {
    it('should read with projection and comparison predicate', async () => {
        const adapter = new InMemoryStorageAdapter({
            USERS: [
                { ID: 1, NAME: 'Alice', AGE: 29 },
                { ID: 2, NAME: 'Bob', AGE: 18 },
            ],
        });

        const rows = await adapter.read('users', ['NAME'], {
            type: 'ComparisonExpression',
            operator: '>',
            left: 'AGE',
            right: 20,
        });

        expect(rows).toEqual([{ NAME: 'Alice' }]);
    });

    it('should update and delete rows with predicates', async () => {
        const adapter = new InMemoryStorageAdapter({
            USERS: [
                { ID: 1, STATUS: 'INACTIVE' },
                { ID: 2, STATUS: 'INACTIVE' },
            ],
        });

        await adapter.update('USERS', { STATUS: 'ACTIVE' }, {
            type: 'ComparisonExpression',
            operator: '=',
            left: 'ID',
            right: 1,
        });

        await adapter.delete('USERS', {
            type: 'ComparisonExpression',
            operator: '=',
            left: 'ID',
            right: 2,
        });

        const snapshot = adapter.getSnapshot();
        expect(snapshot.USERS).toEqual([{ ID: 1, STATUS: 'ACTIVE' }]);
    });

    it('should support identifier set payloads during update', async () => {
        const adapter = new InMemoryStorageAdapter({
            USERS: [{ ID: 1, AGE: 32 }],
        });

        await adapter.update('USERS', {
            COPY_AGE: { type: 'Identifier', name: 'AGE' },
        }, {});

        const snapshot = adapter.getSnapshot();
        expect(snapshot.USERS[0].COPY_AGE).toBe(32);
    });

    it('should integrate with interpreter for in-memory query testing', async () => {
        const adapter = new InMemoryStorageAdapter({
            USERS: [
                { ID: 1, NAME: 'Alice', ACTIVE: 1 },
                { ID: 2, NAME: 'Bob', ACTIVE: 0 },
            ],
        });

        const selectInterpreter = new Interpreter('SELECT name FROM users WHERE active = 1', adapter);
        const selectResult = await selectInterpreter.execute();

        expect(selectResult.rows).toEqual([{ NAME: 'Alice', ACTIVE: 1 }]);

        const insertInterpreter = new Interpreter("INSERT INTO users (id, name, active) VALUES (3, 'Cara', 1)", adapter);
        const insertResult = await insertInterpreter.execute();

        expect(insertResult.insertedCount).toBe(1);

        const snapshot = adapter.getSnapshot();
        expect(snapshot.USERS).toHaveLength(3);
    });

    it('should support logical, null-check, and IN predicates', async () => {
        const adapter = new InMemoryStorageAdapter({
            USERS: [
                { ID: 1, NAME: 'Alice', ACTIVE: 1, CITY: null },
                { ID: 2, NAME: 'Bob', ACTIVE: 0, CITY: 'AMS' },
                { ID: 3, NAME: 'Cara', ACTIVE: 1, CITY: 'RTM' },
            ],
        });

        const rows = await adapter.filter('USERS', {
            type: 'LogicalExpression',
            operator: 'OR',
            left: {
                type: 'NullCheckExpression',
                column: 'CITY',
                isNegated: false,
            },
            right: {
                type: 'InExpression',
                column: 'ID',
                values: [2],
            },
        });

        expect(rows.map(row => row.ID).sort()).toEqual([1, 2]);
    });

    it('should update all rows when where is empty and support arithmetic predicates', async () => {
        const adapter = new InMemoryStorageAdapter({
            USERS: [
                { ID: 1, AGE: 20, ACTIVE: 0 },
                { ID: 2, AGE: 30, ACTIVE: 0 },
            ],
        });

        await adapter.update('USERS', { ACTIVE: 1 }, {});

        const rows = await adapter.filter('USERS', {
            type: 'ComparisonExpression',
            operator: '=',
            left: {
                type: 'ArithmeticExpression',
                operator: '+',
                left: 'AGE',
                right: 1,
            },
            right: 21,
        });

        expect(rows).toHaveLength(1);
        expect(rows[0].ID).toBe(1);
        expect((await adapter.read('USERS', ['*'])).every(row => row.ACTIVE === 1)).toBe(true);
    });

    it('should throw on unknown table and invalid arithmetic operand', async () => {
        const adapter = new InMemoryStorageAdapter({ USERS: [{ ID: 1, AGE: 'x' }] });

        await expect(adapter.read('UNKNOWN', ['*'])).rejects.toThrow('Unknown table: UNKNOWN');

        await expect(
            adapter.filter('USERS', {
                type: 'ComparisonExpression',
                operator: '=',
                left: {
                    type: 'ArithmeticExpression',
                    operator: '+',
                    left: 'AGE',
                    right: 1,
                },
                right: 2,
            }),
        ).rejects.toThrow('Invalid arithmetic operands');
    });

    it('should clear all rows when delete predicate is empty', async () => {
        const adapter = new InMemoryStorageAdapter({
            USERS: [{ ID: 1 }, { ID: 2 }],
        });

        await adapter.delete('USERS', {});

        const snapshot = adapter.getSnapshot();
        expect(snapshot.USERS).toEqual([]);
    });
});
