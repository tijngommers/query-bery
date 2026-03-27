//@author Tijn Gommers
//@date 2026-03-27

import { SelectStatement, FromNode, JoinNode, ExpressionNode } from "../types.mjs";
import { JoinExecutor } from "./join-executor.mjs";

/**
 * SelectExecutor handles the execution of SELECT statements.
 * This includes:
 * - Column selection
 * - FROM clause processing (tables and joins)
 * - WHERE filtering
 * - ORDER BY sorting
 * - LIMIT/OFFSET pagination
 */
export class SelectExecutor {
    private joinExecutor: JoinExecutor;

    constructor() {
        this.joinExecutor = new JoinExecutor();
    }

    /**
     * Execute a SELECT statement
     * @param node The SELECT statement AST node
     * @returns The SELECT result with all clauses applied
     */
    executeSelect(node: SelectStatement): any {
        const columns = node.columns;
        const distinct = node.distinct;
        const from = this.processFromClause(node.from);
        const where = this.normalizeWhereExpression(node.where);
        const orderBy = node.orderBy;
        const limit = node.limit;

        // Future optimization points:
        // - Apply predicate pushdown (push WHERE conditions into FROM sources)
        // - Optimize column selection (projection pushdown)
        // - Generate execution plan
        // - Apply statistics-based optimization
        // - Implement DISTINCT efficiently (hash-based deduplication)

        return {
            type: 'SelectResult',
            columns,
            distinct,
            from,
            where,
            orderBy,
            limit
        };
    }

    private normalizeWhereExpression(where?: ExpressionNode): ExpressionNode | undefined {
        if (!where) {
            return undefined;
        }

        if (where.type === 'LogicalExpression') {
            return {
                ...where,
                left: this.normalizeWhereExpression(where.left) as ExpressionNode,
                right: this.normalizeWhereExpression(where.right) as ExpressionNode,
            };
        }

        if (where.type === 'NotExpression') {
            return {
                ...where,
                expression: this.normalizeWhereExpression(where.expression) as ExpressionNode,
            };
        }

        // ComparisonExpression, NullCheckExpression and InExpression are returned unchanged.
        return where;
    }

    /**
     * Process the FROM clause, handling tables and JOINs
     * @param fromNodes Array of table and join nodes
     * @returns Processed FROM nodes
     */
    private processFromClause(fromNodes: FromNode[]): any[] {
        return fromNodes.map(node => {
            if (node.type === 'Join') {
                return this.joinExecutor.executeJoin(node as JoinNode);
            }
            return node;
        });
    }

    /**
     * Validate SELECT statement before execution
     * @param node The SELECT statement to validate
     * @throws Error if validation fails
     */
    validateSelect(node: SelectStatement): void {
        if (!node.columns || node.columns.length === 0) {
            throw new Error('Invalid SELECT: no columns specified');
        }

        if (!node.from || node.from.length === 0) {
            throw new Error('Invalid SELECT: no FROM clause');
        }

        // Validate all JOIN nodes
        node.from.forEach(fromNode => {
            if (fromNode.type === 'Join') {
                this.joinExecutor.validateJoin(fromNode as JoinNode);
            }
        });

        // Future validations:
        // - Check column references exist
        // - Validate ORDER BY columns
        // - Check LIMIT/OFFSET values
    }
}
