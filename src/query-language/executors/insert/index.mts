//@author Tijn Gommers
//@date 2026-04-02

import { InsertStatement, ValueNode } from '../../types/index.mjs';
import { StorageAdapter } from '../../../storage-adapter/storage-adapter.mts';

export class InsertExecutor {
    private storageAdapter?: StorageAdapter;

    constructor(storageAdapter?: StorageAdapter) {
        this.storageAdapter = storageAdapter;
    }

    executeInsert(node: InsertStatement, inputRows: Record<string, any>[] = []): any {
        this.validateInsert(node);

        const insertedRows = this.buildInsertedRows(node);

        if (!this.storageAdapter || inputRows.length > 0) {
            inputRows.push(...insertedRows);

            return {
                type: 'InsertResult',
                table: node.table,
                columns: node.columns,
                values: node.values,
                insertedCount: insertedRows.length,
                rows: insertedRows,
            };
        }

        return (async () => {
            await this.storageAdapter!.write(node.table.name, insertedRows);

            return {
                type: 'InsertResult',
                table: node.table,
                columns: node.columns,
                values: node.values,
                insertedCount: insertedRows.length,
                rows: insertedRows,
            };
        })();
    }

    private validateInsert(node: InsertStatement): void {
        if (!node.table) {
            throw new Error('Invalid INSERT: no table specified');
        }

        if (!node.columns || node.columns.length === 0) {
            throw new Error('Invalid INSERT: no columns specified');
        }

        if (!node.values || node.values.length === 0) {
            throw new Error('Invalid INSERT: no values specified');
        }

        node.values.forEach(tuple => {
            if (tuple.length !== node.columns.length) {
                throw new Error(`Invalid INSERT: column count ${node.columns.length} does not match values count ${tuple.length}`);
            }
        });
    }

    private buildInsertedRows(node: InsertStatement): Record<string, any>[] {
        return node.values.map(tuple => {
            const row: Record<string, any> = {};

            node.columns.forEach((column, index) => {
                row[column.name] = this.resolveValueNode(tuple[index]);
            });

            return row;
        });
    }

    private resolveValueNode(value: ValueNode): string | number | null {
        if (value.type === 'Literal') {
            return value.value;
        }

        return value.name;
    }
}
