//@author Tijn Gommers
//@date 2026-03-30

import { JoinNode } from '../../types/index.mjs';

/**
 * Normalizes and validates JOIN nodes used by SELECT execution.
 * @class JoinExecutor
 */
export class JoinExecutor {
    /**
     * Processes a single JOIN node into executable metadata.
     * @param joinNode Join node to normalize.
     * @returns Serializable join metadata used by select execution results.
     */
    executeJoin(joinNode: JoinNode): any {
        return this.processJoin(joinNode);
    }

    /**
     * Processes multiple JOIN nodes.
     * @param joinNodes Join nodes to normalize.
     * @returns Array of normalized join metadata objects.
     */
    executeMultipleJoins(joinNodes: JoinNode[]): any[] {
        return joinNodes.map(join => this.processJoin(join));
    }

    /**
     * Internal join-node normalizer.
     * @param node Join node to transform.
     * @returns Join metadata object.
     */
    private processJoin(node: JoinNode): any {
        const { table, joinType, on } = node;

        return {
            type: 'Join',
            table,
            joinType,
            on,
        };
    }

    /**
     * Validates that a JOIN node has both table and ON predicate.
     * @param joinNode Join node to validate.
     * @returns Nothing.
     * @throws {Error} When table or ON condition is missing.
     */
    validateJoin(joinNode: JoinNode): void {
        if (!joinNode.table || !joinNode.on) {
            throw new Error('Invalid JOIN: missing table or ON condition');
        }
    }
}
