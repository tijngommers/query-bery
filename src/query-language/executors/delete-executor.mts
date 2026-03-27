//@author Tijn Gommers
//@date 2026-03-27

import { DeleteStatement } from "../types.mjs";

/**
 * DeleteExecutor handles the execution of DELETE statements.
 * This includes:
 * - FROM clause processing (tables only, no joins allowed)
 * - WHERE filtering
 * - Safety checks before deletion
 */
export class DeleteExecutor {
    /**
     * Execute a DELETE statement
     * @param node The DELETE statement AST node
     * @returns The DELETE result
     */
    executeDelete(node: DeleteStatement): any {
        this.validateDelete(node);

        const from = node.from;
        const where = node.where;

        // Future optimization points:
        // - Generate safe deletion plan
        // - Check for cascading deletes
        // - Validate referential integrity
        // - Apply deletion order for FK constraints

        return {
            type: 'DeleteResult',
            from,
            where
        };
    }

    /**
     * Validate DELETE statement before execution
     * @param node The DELETE statement to validate
     * @throws Error if validation fails
     */
    private validateDelete(node: DeleteStatement): void {
        if (!node.from || node.from.length === 0) {
            throw new Error('Invalid DELETE: no FROM clause');
        }

        // Future validations:
        // - Check table existence
        // - Validate WHERE conditions
        // - Check for dangerous deletes (DELETE without WHERE)
        // - Validate permissions
    }

    /**
     * Check if a DELETE statement is safe (has WHERE clause or limits)
     * @param node The DELETE statement
     * @returns True if the delete has safety constraints
     */
    isSafeDelete(node: DeleteStatement): boolean {
        return node.where !== undefined;
    }
}
