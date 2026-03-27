//@author Tijn Gommers
//@date 2026-03-24

import { ASTNode, DeleteStatement, JoinNode, SelectStatement } from "./types.mjs";
import { Parser } from "./parser.mjs";
import { Lexer } from "./lexer.mjs";

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
        const limit = node.limit;

        //pass here your own function to execute the query on your data source, for example:
        // return database.query({ type: 'select', columns, from, where, orderBy, limit });
        return {
            type: 'SelectResult',
            columns,
            from,
            where,
            orderBy,
            limit
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

    private executeJoin(node: JoinNode): any {
        const table = node.table;
        const joinType = node.joinType;
        const on = node.on;
        //pass here your own function to execute the join on your data source, for example:
        // return database.join({ table, joinType, on });
        return {
            type: 'JoinResult',
            table,
            joinType,
            on
        };
    }
}