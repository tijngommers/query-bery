//@author Tijn Gommers
//@date 2026-03-24

import { ASTNode, DeleteStatement, SelectStatement } from "./types.mjs";
import { Parser } from "./parser.mjs";
import { Lexer } from "./lexer.mjs";
import { SelectExecutor } from "./executors/select-executor.mjs";
import { DeleteExecutor } from "./executors/delete-executor.mjs";

/**
 * Main Interpreter orchestrates query execution.
 * Delegates to specialized executors for each statement type:
 * - SelectExecutor: SELECT statements
 * - DeleteExecutor: DELETE statements
 * - JoinExecutor: JOIN operations (used by SelectExecutor)
 */
export class Interpreter {
    private ast: ASTNode;
    private selectExecutor: SelectExecutor;
    private deleteExecutor: DeleteExecutor;

    constructor(query: string) {
        const lexer = new Lexer(query);
        const parser = new Parser(lexer);
        this.ast = parser.parse();
        this.selectExecutor = new SelectExecutor();
        this.deleteExecutor = new DeleteExecutor();
    }

    execute(): any {
        switch (this.ast.type) {
            case 'SelectStatement':
                return this.executeSelectStatement(this.ast as SelectStatement);
            case 'DeleteStatement':
                return this.executeDeleteStatement(this.ast as DeleteStatement);
            default:
                return this.assertNever(this.ast);
        }
    }

    private executeSelectStatement(ast: SelectStatement): any {
        return this.selectExecutor.executeSelect(ast);
    }

    private executeDeleteStatement(ast: DeleteStatement): any {
        return this.deleteExecutor.executeDelete(ast);
    }

    private assertNever(value: never): never {
        throw new Error(`Unknown AST node: ${JSON.stringify(value)}`);
    }
}