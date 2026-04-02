//@author Tijn Gommers
//@date 2026-04-02

import OpenAI from 'openai';
import { Interpreter } from './index.mjs';
import { StorageAdapter } from '../../storage-adapter/storage-adapter.mts';

interface OpenAIClientLike {
    chat: {
        completions: {
            create: (request: {
                model: string;
                temperature: number;
                messages: { role: 'system' | 'user'; content: string }[];
            }) => Promise<{ choices?: Array<{ message?: { content?: string | null } }> }>;
        };
    };
}

export interface NaturalLanguageExecutorOptions {
    apiKey?: string;
    model?: string;
    client?: OpenAIClientLike;
    storageAdapter?: StorageAdapter;
}

export class NaturalLanguageExecutor {
    private model: string;
    private client: OpenAIClientLike;
    private storageAdapter?: StorageAdapter;

    constructor(options: NaturalLanguageExecutorOptions = {}) {
        const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
        this.model = options.model ?? 'gpt-5.4-mini';
        if (!options.client && !apiKey) {
            throw new Error('OPENAI_API_KEY is required to use the natural language executor');
        }

        this.client = options.client ?? new OpenAI({ apiKey });
        this.storageAdapter = options.storageAdapter;
    }

    async executeNaturalLanguageQuery(nlQuery: string): Promise<any> {
        const sqlQuery = await this.convertNaturalLanguageToSql(nlQuery);
        const interpreter = new Interpreter(sqlQuery, this.storageAdapter);
        return await interpreter.execute();
    }

    private async convertNaturalLanguageToSql(nlQuery: string): Promise<string> {
        const payload = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: 'Translate the user request into one SQL query for this query language. Return only the SQL query text, with no markdown and no explanation.',
                },
                {
                    role: 'user',
                    content: nlQuery,
                },
            ],
        });
        const content = payload?.choices?.[0]?.message?.content;

        if (typeof content !== 'string' || content.trim().length === 0) {
            throw new Error('OpenAI response did not contain SQL text');
        }

        return this.cleanSql(content);
    }

    private cleanSql(content: string): string {
        const trimmedContent = content.trim();
        const fencedMatch = trimmedContent.match(/^```(?:sql)?\s*([\s\S]*?)\s*```$/i);
        const rawSql = fencedMatch ? fencedMatch[1] : trimmedContent;
        return rawSql.replace(/^sql\s*:\s*/i, '').replace(/;\s*$/, '').trim();
    }
}
        
