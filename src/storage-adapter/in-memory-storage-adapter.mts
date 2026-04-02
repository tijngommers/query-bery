//@author Tijn Gommers
//@date 2026-04-02

import { StorageAdapter } from './storage-adapter.mts';

type Row = Record<string, any>;
type TableStore = Map<string, Row[]>;

/**
 * In-memory implementation of the StorageAdapter contract for testing and local execution.
 * @class InMemoryStorageAdapter
 */
export class InMemoryStorageAdapter implements StorageAdapter {
    private tables: TableStore;

    /**
     * Creates an in-memory adapter initialized with optional seed data.
     * @param {Record<string, Row[]>} [initialData={}] Seed rows keyed by table name.
     */
    constructor(initialData: Record<string, Row[]> = {}) {
        this.tables = new Map<string, Row[]>();

        Object.entries(initialData).forEach(([tableName, rows]) => {
            this.tables.set(tableName, rows.map(row => this.cloneRow(row)));
        });
    }

    /**
     * Reads rows from a table and optionally applies predicate and projection.
     * @param {string} table Target table name.
     * @param {string[]} columns Projected columns or wildcard projection.
     * @param {Record<string, any>} [where] Optional predicate.
     * @returns {Promise<Row[]>} Matching rows.
     * @throws {Error} When the table does not exist.
     */
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

    /**
     * Appends rows to a table.
     * @param {string} table Target table name.
     * @param {Row[]} rows Rows to append.
     * @returns {Promise<void>} Resolves when rows are written.
     */
    async write(table: string, rows: Row[]): Promise<void> {
        const existingRows = this.getTableRows(table, false);
        rows.forEach(row => existingRows.push(this.cloneRow(row)));
    }

    /**
     * Filters rows in a table using a predicate.
     * @param {string} table Target table name.
     * @param {Record<string, any>} where Predicate object.
     * @returns {Promise<Row[]>} Filtered rows.
     * @throws {Error} When the table does not exist.
     */
    async filter(table: string, where: Record<string, any>): Promise<Row[]> {
        const rows = this.getTableRows(table, true);
        return this.applyPredicate(rows, where).map(row => this.cloneRow(row));
    }

    /**
     * Projects only selected columns from all rows in a table.
     * @param {string} table Target table name.
     * @param {string[]} columns Columns to project.
     * @returns {Promise<Row[]>} Projected rows.
     * @throws {Error} When the table does not exist.
     */
    async project(table: string, columns: string[]): Promise<Row[]> {
        return this.read(table, columns);
    }

    /**
     * Deletes rows matching a predicate.
     * @param {string} table Target table name.
     * @param {Record<string, any>} where Predicate object.
     * @returns {Promise<void>} Resolves when deletion completes.
     * @throws {Error} When the table does not exist.
     */
    async delete(table: string, where: Record<string, any>): Promise<void> {
        const rows = this.getTableRows(table, true);

        if (this.isEmptyPredicate(where)) {
            this.tables.set(table, []);
            return;
        }

        const remainingRows = rows.filter(row => !this.evaluatePredicate(where, row));
        this.tables.set(table, remainingRows);
    }

    /**
     * Updates rows matching a predicate with values from a set payload.
     * @param {string} table Target table name.
     * @param {Record<string, any>} set Partial row payload to apply.
     * @param {Record<string, any>} where Predicate object.
     * @returns {Promise<void>} Resolves when updates complete.
     * @throws {Error} When the table does not exist.
     */
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

    /**
     * Returns a deep-cloned snapshot of all tables.
     * @returns {Record<string, Row[]>} Snapshot keyed by table name.
     */
    getSnapshot(): Record<string, Row[]> {
        const snapshot: Record<string, Row[]> = {};

        this.tables.forEach((rows, tableName) => {
            snapshot[tableName] = rows.map(row => this.cloneRow(row));
        });

        return snapshot;
    }

    /**
     * Applies a predicate to an array of rows.
     * @param {Row[]} rows Candidate rows.
     * @param {Record<string, any>} [where] Optional predicate.
     * @returns {Row[]} Filtered row list.
     */
    private applyPredicate(rows: Row[], where?: Record<string, any>): Row[] {
        if (!where || this.isEmptyPredicate(where)) {
            return rows;
        }

        return rows.filter(row => this.evaluatePredicate(where, row));
    }

    /**
     * Evaluates a storage predicate against one row.
     * @param {Record<string, any>} predicate Predicate object.
     * @param {Row} row Row under evaluation.
     * @returns {boolean} True when row matches predicate.
     */
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

    /**
     * Resolves an operand into a primitive value for predicate evaluation.
     * @param {any} operand Predicate operand.
     * @param {Row} row Current row.
     * @returns {any} Resolved operand value.
     * @throws {Error} When arithmetic operands are invalid.
     */
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

    /**
     * Resolves a SET payload value for update operations.
     * @param {any} value Raw set value.
     * @param {Row} row Current row context.
     * @returns {any} Resolved set value.
     */
    private resolveSetValue(value: any, row: Row): any {
        if (value && typeof value === 'object' && value.type === 'Identifier' && typeof value.name === 'string') {
            return this.resolveIdentifierValue(row, value.name);
        }

        return value;
    }

    /**
     * Resolves an identifier path from a row, case-insensitively.
     * @param {Row} row Source row.
     * @param {string} identifier Identifier path.
     * @returns {any} Resolved value or undefined.
     */
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

    /**
     * Compares two values using a comparison operator.
     * @param {any} left Left value.
     * @param {any} right Right value.
     * @param {string} operator Comparison operator.
     * @returns {boolean} Comparison result.
     */
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

    /**
     * Applies an arithmetic operation to numeric operands.
     * @param {any} left Left operand.
     * @param {any} right Right operand.
     * @param {string} operator Arithmetic operator.
     * @returns {number} Arithmetic result.
     * @throws {Error} When operands are non-numeric or operator is unsupported.
     */
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

    /**
     * Resolves table storage by name, optionally enforcing existence.
     * @param {string} table Requested table name.
     * @param {boolean} mustExist Whether missing table names should throw.
     * @returns {Row[]} Mutable table row array.
     * @throws {Error} When table is missing and mustExist is true.
     */
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

    /**
     * Finds an existing table name using exact or case-insensitive matching.
     * @param {string} table Requested table name.
     * @returns {string | undefined} Matched table name, if found.
     */
    private findTableName(table: string): string | undefined {
        if (this.tables.has(table)) {
            return table;
        }

        const matched = Array.from(this.tables.keys()).find(existing => existing.toUpperCase() === table.toUpperCase());
        return matched;
    }

    /**
     * Checks whether a predicate object is empty.
     * @param {Record<string, any>} [where] Predicate object.
     * @returns {boolean} True when predicate is absent or empty.
     */
    private isEmptyPredicate(where?: Record<string, any>): boolean {
        return !where || Object.keys(where).length === 0;
    }

    /**
     * Deep-clones a row using JSON serialization.
     * @param {Row} row Source row.
     * @returns {Row} Deep-cloned row.
     */
    private cloneRow(row: Row): Row {
        return JSON.parse(JSON.stringify(row));
    }
}
