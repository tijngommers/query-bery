//@author Tijn Gommers
//@date 2026-03-24

import { ASTNode, DeleteStatement, SelectStatement } from "./types.mts";
import { Parser } from "./parser.mts";
import { Lexer } from "./lexer.mts";

export class Interpreter {
    private ast: ASTNode;

    constructor(query: string) {
        const lexer = new Lexer(query);
        const parser = new Parser(lexer);
        this.ast = parser.parse();
    }

    execute(): any {
        switch (this.ast.type) {
            case 'SelectStatement':
                return this.executeSelect(this.ast);
            case 'DeleteStatement':
                return this.executeDelete(this.ast);
            default:
                return this.assertNever(this.ast);
        }
    }

    private assertNever(value: never): never {
        throw new Error(`Unknown AST node: ${JSON.stringify(value)}`);
    }

    private executeSelect(node: SelectStatement): any {
        const columns = node.columns;
        const from = node.from;
        const where = node.where;
        const orderBy = node.orderBy;

        //pass here your own function to execute the query on your data source, for example:
        // return database.query({ type: 'select', columns, from, where, orderBy });
        return {
            type: 'SelectResult',
            columns,
            from,
            where,
            orderBy
        };
    }

    private executeDelete(node: DeleteStatement): any {
        const from = node.from;
        const where = node.where;
        
        //pass here your own function to execute the query on your data source, for example:
        // return database.query({ type: 'delete', from, where });
        return {
            type: 'DeleteResult',
            from,
            where
        };
    }
}