//@author Tijn Gommers
//@date 2026-04-02

import { DeleteStatement, ExpressionNode } from '../../types/index.mjs';
import { StorageAdapter } from '../../../storage-adapter/storage-adapter.mts';
import { compileStorageWherePredicate, getSingleTableName } from '../storage-adapter-helpers.mts';

export class DeleteExecutor {
    private storageAdapter?: StorageAdapter;

    constructor(storageAdapter?: StorageAdapter) {
        this.storageAdapter = storageAdapter;
    }

    executeDelete(node: DeleteStatement): any {
        this.validateDelete(node);

        const from = node.from;
        const where = this.normalizeWhereExpression(node.where);
        const tableName = getSingleTableName(node.from);

        if (!this.storageAdapter || !tableName) {
            return {
                type: 'DeleteResult',
                from,
                where,
            };
        }

        return (async () => {
            const predicate = compileStorageWherePredicate(where);
            const matchingRows = predicate ? await this.storageAdapter!.filter(tableName, predicate) : await this.storageAdapter!.read(tableName, ['*']);

            await this.storageAdapter!.delete(tableName, predicate ?? {});

            return {
                type: 'DeleteResult',
                from,
                where,
                deletedCount: matchingRows.length,
            };
        })();
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
