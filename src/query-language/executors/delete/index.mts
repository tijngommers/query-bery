//@author Tijn Gommers
//@date 2026-03-30

import { DeleteStatement, ExpressionNode } from '../../types/index.mjs';

export class DeleteExecutor {
    executeDelete(node: DeleteStatement): any {
        this.validateDelete(node);

        const from = node.from;
        const where = this.normalizeWhereExpression(node.where);

        return {
            type: 'DeleteResult',
            from,
            where,
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

    private validateDelete(node: DeleteStatement): void {
        if (!node.from || node.from.length === 0) {
            throw new Error('Invalid DELETE: no FROM clause');
        }
    }

    isSafeDelete(node: DeleteStatement): boolean {
        return node.where !== undefined;
    }
}
