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

    it('should throw when no API key and no client are provided', () => {
        expect(() => new NaturalLanguageExecutor({ apiKey: '' })).toThrow('OPENAI_API_KEY is required');
    });

    it('should throw when OpenAI response has no SQL content', async () => {
        const createMock = vi.fn(async () => ({
            choices: [{ message: { content: '   ' } }],
        }));

        const executor = new NaturalLanguageExecutor({
            client: {
                chat: {
                    completions: {
                        create: createMock,
                    },
                },
            },
        });

        await expect(executor.executeNaturalLanguageQuery('show active users')).rejects.toThrow(
            'OpenAI response did not contain SQL text',
        );
    });

    it('should sanitize fenced SQL response before execution', async () => {
        const createMock = vi.fn(async () => ({
            choices: [
                {
                    message: {
                        content: "```sql\nsql: SELECT NAME FROM USERS WHERE ACTIVE = 1;\n```",
                    },
                },
            ],
        }));

        const adapter = new InMemoryStorageAdapter({
            USERS: [
                { ID: 1, NAME: 'Alice', ACTIVE: 1 },
                { ID: 2, NAME: 'Bob', ACTIVE: 0 },
            ],
        });

        const executor = new NaturalLanguageExecutor({
            client: {
                chat: {
                    completions: {
                        create: createMock,
                    },
                },
            },
            storageAdapter: adapter,
        });

        const result = await executor.executeNaturalLanguageQuery('show active users');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].NAME).toBe('Alice');
    });
});