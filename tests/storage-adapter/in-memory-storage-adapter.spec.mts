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
});
