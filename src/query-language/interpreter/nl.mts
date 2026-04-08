//@author Tijn Gommers
//@date 2026-04-02

import OpenAI from 'openai';
import { Interpreter } from './index.mjs';
import { StorageAdapter } from '../../storage-adapter/storage-adapter.mjs';
import { Lexer } from '../lexer/index.mjs';
import { Parser } from '../parser/index.mjs';
import { QueryExecutionResult } from '../types/index.mjs';

type QueryStatementType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface NaturalLanguagePromptContext {
    model: string;
    schemaContext?: string;
    allowedStatements: readonly QueryStatementType[];
}

export interface NaturalLanguagePromptOutput {
    systemPrompt: string;
    userPrompt: string;
}

export type NaturalLanguagePromptBuilder = (
    nlQuery: string,
    context: NaturalLanguagePromptContext,
) => NaturalLanguagePromptOutput;

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
    schemaContext?: string;
    allowedStatements?: QueryStatementType[];
    systemPrompt?: string;
    promptBuilder?: NaturalLanguagePromptBuilder;
    validateSql?: (sql: string) => void;
}

/**
 * Converts natural-language prompts to query-language SQL via OpenAI and executes them.
 * @class NaturalLanguageExecutor
 */
export class NaturalLanguageExecutor {
    private model: string;
    private client: OpenAIClientLike;
    private storageAdapter?: StorageAdapter;
    private schemaContext?: string;
    private allowedStatements: QueryStatementType[];
    private systemPrompt: string;
    private promptBuilder?: NaturalLanguagePromptBuilder;
    private validateSql?: (sql: string) => void;

    /**
     * Creates a natural-language executor.
     * @param options Configuration including model, API key, optional injected client, and optional storage adapter.
     * @throws {Error} When no API key is provided and no client is injected.
     */
    constructor(options: NaturalLanguageExecutorOptions = {}) {
        const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
        this.model = options.model ?? 'gpt-5.4-mini';
        if (!options.client && !apiKey) {
            throw new Error('OPENAI_API_KEY is required to use the natural language executor');
        }

        this.client = options.client ?? new OpenAI({ apiKey });
        this.storageAdapter = options.storageAdapter;
        this.schemaContext = options.schemaContext;
        this.allowedStatements = options.allowedStatements ?? ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
        this.systemPrompt = options.systemPrompt ?? 'Translate the user request into one SQL query for this query language. Return only the SQL query text, with no markdown and no explanation.';
        this.promptBuilder = options.promptBuilder;
        this.validateSql = options.validateSql;
    }

    /**
     * Converts a natural-language prompt into SQL and executes it through the interpreter.
     * @param nlQuery Natural-language prompt describing the intended query.
     * @returns {QueryExecutionResult | Promise<QueryExecutionResult>} Interpreter execution result.
     * @throws {Error} When model output is invalid or interpreter execution fails.
     */
    async executeNaturalLanguageQuery(nlQuery: string): Promise<QueryExecutionResult | Promise<QueryExecutionResult>> {
        const sqlQuery = await this.convertNaturalLanguageToSql(nlQuery);
        const cleanedSql = this.cleanSql(sqlQuery);
        this.validateGeneratedSql(cleanedSql);
        const interpreter = new Interpreter(cleanedSql, this.storageAdapter);
        return await interpreter.execute();
    }

    /**
     * Calls the OpenAI chat-completions API to translate natural language into SQL text.
     * @param nlQuery Natural-language prompt to translate.
     * @returns {Promise<string>} SQL string suitable for the query-language parser.
     * @throws {Error} When the response does not contain usable SQL text.
     */
    private async convertNaturalLanguageToSql(nlQuery: string): Promise<string> {
        const prompt = this.buildPrompt(nlQuery);
        const payload = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: prompt.systemPrompt,
                },
                {
                    role: 'user',
                    content: prompt.userPrompt,
                },
            ],
        });
        const content = payload?.choices?.[0]?.message?.content;

        if (typeof content !== 'string' || content.trim().length === 0) {
            throw new Error('OpenAI response did not contain SQL text');
        }

        return content;
    }

    /**
     * Builds the system and user prompts for the OpenAI request, optionally using a custom prompt builder.
     * @param nlQuery Natural-language query string from the user.
     * @returns {NaturalLanguagePromptOutput} Object containing system and user prompts for the OpenAI API.
     */
    private buildPrompt(nlQuery: string): NaturalLanguagePromptOutput {
        if (this.promptBuilder) {
            return this.promptBuilder(nlQuery, {
                model: this.model,
                schemaContext: this.schemaContext,
                allowedStatements: this.allowedStatements,
            });
        }

        const promptParts = [this.systemPrompt];

        if (this.schemaContext) {
            promptParts.push(`Schema context:\n${this.schemaContext.trim()}`);
        }

        promptParts.push(`Allowed statements: ${this.allowedStatements.join(', ')}`);

        return {
            systemPrompt: promptParts.join('\n\n'),
            userPrompt: nlQuery,
        };
    }

    /**
     * Removes optional code fences and trailing statement delimiters from model output.
     * @param content Raw model content containing SQL text.
     * @returns {string} Sanitized SQL string.
     */
    private cleanSql(content: string): string {
        const trimmedContent = content.trim();
        const fencedMatch = trimmedContent.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
        const rawSql = fencedMatch ? fencedMatch[1] : trimmedContent;
        return rawSql.replace(/^sql\s*:\s*/i, '').replace(/;\s*$/, '').trim();
    }


    /**
     * Validates the generated SQL string for basic correctness and adherence to allowed statement types, throwing errors for any issues found.
     * @param sql SQL string generated by the model to validate before execution.
     * @throws {Error} When validation fails due to disallowed statement types, multiple statements, or parsing errors.
     * @returns {void}
     */
    private validateGeneratedSql(sql: string): void {
        if (typeof this.validateSql === 'function') {
            this.validateSql(sql);
        }

        if (sql.includes(';')) {
            throw new Error('OpenAI response must contain exactly one SQL statement');
        }

        const statementType = sql.split(/\s+/, 1)[0]?.toUpperCase() as QueryStatementType | undefined;

        if (!statementType || !this.allowedStatements.includes(statementType)) {
            throw new Error(`OpenAI response used an unsupported statement type: ${statementType ?? 'unknown'}`);
        }

        try {
            new Parser(new Lexer(sql)).parse();
        } catch (error) {
            throw new Error(`OpenAI response did not produce a valid query: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
        
