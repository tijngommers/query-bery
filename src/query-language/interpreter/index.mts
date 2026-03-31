//@author Tijn Gommers
//@date 2026-03-30

import { ASTNode, DeleteStatement, InsertStatement, SelectStatement, UpdateStatement } from '../types/index.mjs';
import { Parser } from '../parser/index.mjs';
import { Lexer } from '../lexer/index.mjs';
import { SelectExecutor } from '../executors/select/index.mjs';
import { DeleteExecutor } from '../executors/delete/index.mjs';
import { InsertExecutor } from '../executors/insert/index.mjs';
import { UpdateExecutor } from '../executors/update/index.mjs';

export class Interpreter {
    private ast: ASTNode;
    private selectExecutor: SelectExecutor;
    private deleteExecutor: DeleteExecutor;
    private insertExecutor: InsertExecutor;
    private updateExecutor: UpdateExecutor;

    constructor(query: string) {
        const lexer = new Lexer(query);
        const parser = new Parser(lexer);
        this.ast = parser.parse();
        this.selectExecutor = new SelectExecutor();
        this.deleteExecutor = new DeleteExecutor();
        this.insertExecutor = new InsertExecutor();
        this.updateExecutor = new UpdateExecutor();
    }

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

    private executeSelectStatement(ast: SelectStatement): any {
        return this.selectExecutor.executeSelect(ast);
    }

    private executeDeleteStatement(ast: DeleteStatement): any {
        return this.deleteExecutor.executeDelete(ast);
    }

    private executeInsertStatement(ast: InsertStatement): any {
        return this.insertExecutor.executeInsert(ast);
    }

    private executeUpdateStatement(ast: UpdateStatement): any {
        return this.updateExecutor.executeUpdate(ast);
    }

    private assertNever(value: never): never {
        throw new Error(`Unknown AST node: ${JSON.stringify(value)}`);
    }
}
