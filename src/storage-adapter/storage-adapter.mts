//@author Tijn Gommers
//@date 2026-03-31

/**
 * Storage adapter contract for Querylib.
 *
 * This abstraction decouples query execution from the storage engine.
 * Implementations can be in-memory, file-backed, SQL-backed, or remote.
 *
 * Contract rules:
 * 1. All methods are asynchronous and return Promises.
 * 2. `table` refers to a logical collection name.
 * 3. Returned rows are plain key-value objects.
 * 4. `where` is an adapter-level predicate object (implementation-defined).
 * 5. Methods should throw on invalid table names or malformed input.
 *
 * @interface StorageAdapter
 */
export interface StorageAdapter {
    /**
     * Read rows from a table with optional pushdown filtering and projection.
     *
     * @param {string} table - Target table/collection name.
     * @param {string[]} columns - Column names to project. Use all known columns to emulate SELECT *.
     * @param {Record<string, any>} [where] - Optional filter predicate in adapter format.
     * @returns {Promise<Record<string, any>[]>} A list of rows matching the read criteria.
     */
    read(table: string, columns: string[], where?: Record<string, any>): Promise<Record<string, any>[]>;

    /**
     * Append rows to a table.
     *
     * @param {string} table - Target table/collection name.
     * @param {Record<string, any>[]} rows - Rows to insert.
     * @returns {Promise<void>} Resolves when write operation has completed.
     */
    write(table: string, rows: Record<string, any>[]): Promise<void>;

    /**
     * Filter rows in a table using adapter-native predicate pushdown.
     *
     * @param {string} table - Target table/collection name.
     * @param {Record<string, any>} where - Predicate object used by the adapter to filter rows.
     * @returns {Promise<Record<string, any>[]>} Matching rows.
     */
    filter(table: string, where: Record<string, any>): Promise<Record<string, any>[]>;

    /**
     * Project only the requested columns from a table.
     *
     * @param {string} table - Target table/collection name.
     * @param {string[]} columns - Columns to keep in each returned row.
     * @returns {Promise<Record<string, any>[]>} Rows containing only projected columns.
     */
    project(table: string, columns: string[]): Promise<Record<string, any>[]>;

    /**
     * Delete rows that match a predicate.
     *
     * @param {string} table - Target table/collection name.
     * @param {Record<string, any>} where - Predicate describing which rows to delete.
     * @returns {Promise<void>} Resolves when delete operation has completed.
     */
    delete(table: string, where: Record<string, any>): Promise<void>;

    /**
     * Update rows matching a predicate.
     *
     * @param {string} table - Target table/collection name.
     * @param {Record<string, any>} set - Partial row values to write onto matched rows.
     * @param {Record<string, any>} where - Predicate describing which rows to update.
     * @returns {Promise<void>} Resolves when update operation has completed.
     */
    update(table: string, set: Record<string, any>, where: Record<string, any>): Promise<void>;
}