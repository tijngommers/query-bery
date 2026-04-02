//@author Tijn Gommers
//@date 2026-04-02

import { describe, expect, it, vi } from 'vitest';
import { NaturalLanguageExecutor } from '../../../src/query-language/interpreter/nl.mts';
import { InMemoryStorageAdapter } from '../../../src/storage-adapter/in-memory-storage-adapter.mts';

describe('NaturalLanguageExecutor', () => {
    it('should call OpenAI and execute the returned SQL', async () => {
        const createMock = vi.fn(async () => ({
                choices: [
                    {
                        message: {
                            content: 'SELECT NAME FROM USERS WHERE ACTIVE = 1',
                        },
                    },
                ],
            }));

        const openAiClientMock = {
            chat: {
                completions: {
                    create: createMock,
                },
            },
        };

        const adapter = new InMemoryStorageAdapter({
            USERS: [
                { ID: 1, NAME: 'Alice', ACTIVE: 1 },
                { ID: 2, NAME: 'Bob', ACTIVE: 0 },
            ],
        });

        const executor = new NaturalLanguageExecutor({
            client: openAiClientMock,
            storageAdapter: adapter,
        });

        const result = await executor.executeNaturalLanguageQuery('show active users');

        expect(createMock).toHaveBeenCalledTimes(1);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].NAME).toBe('Alice');
    });
});