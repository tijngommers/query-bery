//@author Tijn Gommers
//@date 2026-04-02

import { StorageAdapter } from './storage-adapter.mts';

type Row = Record<string, any>;
type TableStore = Map<string, Row[]>;

export class InMemoryStorageAdapter implements StorageAdapter {
    private tables: TableStore;

    constructor(initialData: Record<string, Row[]> = {}) {
        this.tables = new Map<string, Row[]>();

        Object.entries(initialData).forEach(([tableName, rows]) => {
            this.tables.set(tableName, rows.map(row => this.cloneRow(row)));
        });
    }

    async read(table: string, columns: string[], where?: Record<string, any>): Promise<Row[]> {
        const rows = this.getTableRows(table, true);
        const filteredRows = this.applyPredicate(rows, where);

        if (columns.length === 0 || columns.includes('*')) {
            return filteredRows.map(row => this.cloneRow(row));
        }

        return filteredRows.map(row => {
            const projected: Row = {};

            columns.forEach(column => {
                projected[column] = this.resolveIdentifierValue(row, column);
            });

            return projected;
        });
    }

    async write(table: string, rows: Row[]): Promise<void> {
        const existingRows = this.getTableRows(table, false);
        rows.forEach(row => existingRows.push(this.cloneRow(row)));
    }

    async filter(table: string, where: Record<string, any>): Promise<Row[]> {
        const rows = this.getTableRows(table, true);
        return this.applyPredicate(rows, where).map(row => this.cloneRow(row));
    }

    async project(table: string, columns: string[]): Promise<Row[]> {
        return this.read(table, columns);
    }

    async delete(table: string, where: Record<string, any>): Promise<void> {
        const rows = this.getTableRows(table, true);

        if (this.isEmptyPredicate(where)) {
            this.tables.set(table, []);
            return;
        }

        const remainingRows = rows.filter(row => !this.evaluatePredicate(where, row));
        this.tables.set(table, remainingRows);
    }

    async update(table: string, set: Record<string, any>, where: Record<string, any>): Promise<void> {
        const rows = this.getTableRows(table, true);

        rows.forEach(row => {
            if (!this.isEmptyPredicate(where) && !this.evaluatePredicate(where, row)) {
                return;
            }

            Object.entries(set).forEach(([column, value]) => {
                row[column] = this.resolveSetValue(value, row);
            });
        });
    }

    getSnapshot(): Record<string, Row[]> {
        const snapshot: Record<string, Row[]> = {};

        this.tables.forEach((rows, tableName) => {
            snapshot[tableName] = rows.map(row => this.cloneRow(row));
        });

        return snapshot;
    }

    private applyPredicate(rows: Row[], where?: Record<string, any>): Row[] {
        if (!where || this.isEmptyPredicate(where)) {
            return rows;
        }

        return rows.filter(row => this.evaluatePredicate(where, row));
    }

    private evaluatePredicate(predicate: Record<string, any>, row: Row): boolean {
        switch (predicate.type) {
            case 'LogicalExpression':
                if (predicate.operator === 'AND') {
                    return this.evaluatePredicate(predicate.left, row) && this.evaluatePredicate(predicate.right, row);
                }
                return this.evaluatePredicate(predicate.left, row) || this.evaluatePredicate(predicate.right, row);
            case 'NotExpression':
                return !this.evaluatePredicate(predicate.expression, row);
            case 'ComparisonExpression': {
                const left = this.resolveOperand(predicate.left, row);
                const right = this.resolveOperand(predicate.right, row);
                return this.compareValues(left, right, predicate.operator);
            }
            case 'NullCheckExpression': {
                const value = this.resolveIdentifierValue(row, String(predicate.column));
                const isNullish = value === null || value === undefined;
                return predicate.isNegated ? !isNullish : isNullish;
            }
            case 'InExpression': {
                const left = this.resolveIdentifierValue(row, String(predicate.column));
                return Array.isArray(predicate.values) && predicate.values.some((value: any) => this.resolveOperand(value, row) === left);
            }
            default:
                return false;
        }
    }

    private resolveOperand(operand: any, row: Row): any {
        if (operand === null || operand === undefined || typeof operand === 'number') {
            return operand;
        }

        if (typeof operand === 'string') {
            const resolved = this.resolveIdentifierValue(row, operand);
            return resolved === undefined ? operand : resolved;
        }

        if (typeof operand !== 'object') {
            return operand;
        }

        if (operand.type === 'ArithmeticExpression') {
            const left = this.resolveOperand(operand.left, row);
            const right = this.resolveOperand(operand.right, row);
            return this.applyArithmetic(left, right, operand.operator);
        }

        if (operand.type === 'Identifier') {
            return this.resolveIdentifierValue(row, operand.name);
        }

        return operand;
    }

    private resolveSetValue(value: any, row: Row): any {
        if (value && typeof value === 'object' && value.type === 'Identifier' && typeof value.name === 'string') {
            return this.resolveIdentifierValue(row, value.name);
        }

        return value;
    }

    private resolveIdentifierValue(row: Row, identifier: string): any {
        const path = identifier.split('.');
        let current: any = row;

        for (const segment of path) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }

            if (segment in current) {
                current = current[segment];
                continue;
            }

            const key = Object.keys(current).find(existingKey => existingKey.toUpperCase() === segment.toUpperCase());
            if (!key) {
                return undefined;
            }

            current = current[key];
        }

        return current;
    }

    private compareValues(left: any, right: any, operator: string): boolean {
        switch (operator) {
            case '=':
                return left === right;
            case '!=':
                return left !== right;
            case '>':
                return left > right;
            case '<':
                return left < right;
            case '>=':
                return left >= right;
            case '<=':
                return left <= right;
            default:
                return false;
        }
    }

    private applyArithmetic(left: any, right: any, operator: string): number {
        if (typeof left !== 'number' || typeof right !== 'number') {
            throw new Error(`Invalid arithmetic operands: ${left} ${operator} ${right}`);
        }

        switch (operator) {
            case '+':
                return left + right;
            case '-':
                return left - right;
            case '*':
                return left * right;
            case '/':
                return left / right;
            default:
                throw new Error(`Unsupported arithmetic operator: ${operator}`);
        }
    }

    private getTableRows(table: string, mustExist: boolean): Row[] {
        const resolvedTableName = this.findTableName(table);

        if (resolvedTableName) {
            return this.tables.get(resolvedTableName)!;
        }

        if (mustExist) {
            throw new Error(`Unknown table: ${table}`);
        }

        const rows: Row[] = [];
        this.tables.set(table, rows);
        return rows;
    }

    private findTableName(table: string): string | undefined {
        if (this.tables.has(table)) {
            return table;
        }

        const matched = Array.from(this.tables.keys()).find(existing => existing.toUpperCase() === table.toUpperCase());
        return matched;
    }

    private isEmptyPredicate(where?: Record<string, any>): boolean {
        return !where || Object.keys(where).length === 0;
    }

    private cloneRow(row: Row): Row {
        return JSON.parse(JSON.stringify(row));
    }
}
