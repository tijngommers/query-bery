//@author Tijn Gommers
//@date 2026-03-30

import { SelectStatement, FromNode, JoinNode, ExpressionNode } from '../../types/index.mjs';
import { JoinExecutor } from '../join/index.mjs';

export class SelectExecutor {
    private joinExecutor: JoinExecutor;

    constructor() {
        this.joinExecutor = new JoinExecutor();
    }

    executeSelect(node: SelectStatement): any {
        const columns = node.columns;
        const distinct = node.distinct;
        const from = this.processFromClause(node.from);
        const where = this.normalizeWhereExpression(node.where);
        const orderBy = node.orderBy;
        const limit = node.limit;

        return {
            type: 'SelectResult',
            columns,
            distinct,
            from,
            where,
            orderBy,
            limit,
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

        return where;
    }

    private processFromClause(fromNodes: FromNode[]): any[] {
        return fromNodes.map(node => {
            if (node.type === 'Join') {
                return this.joinExecutor.executeJoin(node as JoinNode);
            }
            return node;
        });
    }

    validateSelect(node: SelectStatement): void {
        if (!node.columns || node.columns.length === 0) {
            throw new Error('Invalid SELECT: no columns specified');
        }

        if (!node.from || node.from.length === 0) {
            throw new Error('Invalid SELECT: no FROM clause');
        }

        node.from.forEach(fromNode => {
            if (fromNode.type === 'Join') {
                this.joinExecutor.validateJoin(fromNode as JoinNode);
            }
        });
    }
}
