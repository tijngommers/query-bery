//@author Tijn Gommers
//@date 2026-03-30

import { ASTNode, DeleteStatement, InsertStatement, SelectStatement, UpdateStatement } from '../types/index.mjs';
import { Parser } from '../parser/index.mjs';
import { Lexer } from '../lexer/index.mjs';
import { SelectExecutor } from '../executors/select/index.mjs';
import { DeleteExecutor } from '../executors/delete/index.mjs';
import { InsertExecutor } from '../executors/insert/index.mjs';
import { UpdateExecutor } from '../executors/update/index.mjs';
import { StorageAdapter } from '../../storage-adapter/storage-adapter.mjs';

/**
 * Parses a query string and dispatches execution to the correct statement executor.
 * @class Interpreter
 */
export class Interpreter {
    private ast: ASTNode;
    private selectExecutor: SelectExecutor;
    private deleteExecutor: DeleteExecutor;
    private insertExecutor: InsertExecutor;
    private updateExecutor: UpdateExecutor;

    /**
     * Creates an interpreter for a single query.
     * @param query Query-language statement string.
     * @param storageAdapter Optional storage adapter for persistent operations.
     * @throws {Error} When lexing or parsing the query fails.
     */
    constructor(query: string, storageAdapter?: StorageAdapter) {
        const lexer = new Lexer(query);
        const parser = new Parser(lexer);
        this.ast = parser.parse();
        this.selectExecutor = new SelectExecutor(storageAdapter);
        this.deleteExecutor = new DeleteExecutor(storageAdapter);
        this.insertExecutor = new InsertExecutor(storageAdapter);
        this.updateExecutor = new UpdateExecutor(storageAdapter);
    }

    /**
     * Executes the parsed statement by dispatching on AST node type.
     * @returns Statement result object or a Promise-backed result for adapter operations.
     * @throws {Error} When the AST node type is unsupported.
     */
    execute(): any {
        switch (this.ast.type) {
            case 'SelectStatement':
                return this.executeSelectStatement(this.ast as SelectStatement);
            case 'DeleteStatement':
                return this.executeDeleteStatement(this.ast as DeleteStatement);
            case 'InsertStatement':
                return this.executeInsertStatement(this.ast as InsertStatement);
            case 'UpdateStatement':
                return this.executeUpdateStatement(this.ast as UpdateStatement);
            default:
                return this.assertNever(this.ast);
        }
    }

    /**
     * Executes a parsed SELECT statement.
     * @param ast Parsed SELECT AST node.
     * @returns SELECT execution result.
     */
    private executeSelectStatement(ast: SelectStatement): any {
        return this.selectExecutor.executeSelect(ast);
    }

    /**
     * Executes a parsed DELETE statement.
     * @param ast Parsed DELETE AST node.
     * @returns DELETE execution result.
     */
    private executeDeleteStatement(ast: DeleteStatement): any {
        return this.deleteExecutor.executeDelete(ast);
    }

    /**
     * Executes a parsed INSERT statement.
     * @param ast Parsed INSERT AST node.
     * @returns INSERT execution result.
     */
    private executeInsertStatement(ast: InsertStatement): any {
        return this.insertExecutor.executeInsert(ast);
    }

    /**
     * Executes a parsed UPDATE statement.
     * @param ast Parsed UPDATE AST node.
     * @returns UPDATE execution result.
     */
    private executeUpdateStatement(ast: UpdateStatement): any {
        return this.updateExecutor.executeUpdate(ast);
    }

    /**
     * Exhaustiveness guard for AST node dispatch.
     * @param value Unexpected AST value.
     * @returns Never returns; always throws.
     * @throws {Error} Always thrown to signal unsupported AST node types.
     */
    private assertNever(value: never): never {
        throw new Error(`Unknown AST node: ${JSON.stringify(value)}`);
    }
}
