//@author Tijn Gommers
//@date 2026-03-27

import { JoinNode } from "../types.mjs";

/**
 * JoinExecutor handles the execution of JOIN operations.
 * This is a separate executor to allow for future optimizations such as:
 * - JOIN-specific indexing and cardinality estimation
 * - Query planning for multi-table joins
 * - Caching of JOIN results
 * - Parallel JOIN execution
 */
export class JoinExecutor {
    /**
     * Execute a single JOIN operation
     * @param joinNode The JOIN node from the AST
     * @returns The JOIN result with metadata
     */
    executeJoin(joinNode: JoinNode): any {
        return this.processJoin(joinNode);
    }

    /**
     * Execute multiple sequential JOINs
     * @param joinNodes Array of JOIN nodes
     * @returns Array of JOIN results
     */
    executeMultipleJoins(joinNodes: JoinNode[]): any[] {
        return joinNodes.map(join => this.processJoin(join));
    }

    /**
     * Process a single JOIN node
     * @param node The JOIN node
     * @returns Processed JOIN node with execution context
     */
    private processJoin(node: JoinNode): any {
        const { table, joinType, on } = node;

        // Future optimization points:
        // - Validate join indexes
        // - Calculate join cardinality
        // - Choose optimal join algorithm (nested loop, hash join, merge join)
        // - Apply early filters

        return {
            type: 'Join',
            table,
            joinType,
            on,
            // Future fields:
            // estimatedRows: number,
            // joinStrategy: 'nested-loop' | 'hash' | 'merge',
            // cost: number,
        };
    }

    /**
     * Validate JOIN conditions before execution
     * @param joinNode The JOIN node to validate
     * @throws Error if validation fails
     */
    validateJoin(joinNode: JoinNode): void {
        if (!joinNode.table || !joinNode.on) {
            throw new Error('Invalid JOIN: missing table or ON condition');
        }

        // Future validations:
        // - Check if referenced columns exist
        // - Validate join type compatibility
        // - Check for circular dependencies in multi-joins
    }
}
