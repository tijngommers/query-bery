// @author Tijn Gommers
// @date 2026-04-03

import { DeleteStatement, InsertStatement, LimitOffsetNode, OrderByStatement, UpdateStatement } from './ast-operations.mjs';
import { ExpressionNode, FromNode, JoinNode, SelectColumn } from './ast-nodes.mjs';

/**
 * Shared utility for synchronous or promise-backed execution results.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * SELECT execution result.
 */
export interface SelectResult {
    type: 'SelectResult';
    columns: SelectColumn[];
    distinct: boolean;
    from: SelectFromItem[];
    where?: ExpressionNode;
    orderBy?: OrderByStatement;
    limit?: LimitOffsetNode;
    rows?: Record<string, any>[];
}

/**
 * Normalized FROM item returned from SELECT execution.
 */
export type SelectFromItem =
    | FromNode
    | {
        type: 'Join';
        table: JoinNode['table'];
        joinType: JoinNode['joinType'];
        on: JoinNode['on'];
    };

/**
 * DELETE execution result.
 */
export interface DeleteResult {
    type: 'DeleteResult';
    from: DeleteStatement['from'];
    where?: ExpressionNode;
    deletedCount?: number;
}

/**
 * INSERT execution result.
 */
export interface InsertResult {
    type: 'InsertResult';
    table: InsertStatement['table'];
    columns: InsertStatement['columns'];
    values: InsertStatement['values'];
    insertedCount: number;
    rows: Record<string, any>[];
}

/**
 * UPDATE execution result.
 */
export interface UpdateResult {
    type: 'UpdateResult';
    table: UpdateStatement['table'];
    set: UpdateStatement['set'];
    where?: ExpressionNode;
    updatedCount: number;
    rows: Record<string, any>[];
}

/**
 * Root execution result union.
 */
export type QueryExecutionResult = SelectResult | DeleteResult | InsertResult | UpdateResult;