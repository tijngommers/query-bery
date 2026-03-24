//@author Tijn Gommers
// @date 2026-03-24

import { ASTNode, ComparisonNode, ComparisonOperator, DeleteStatement, ExpressionNode, IdentifierNode, LiteralNode, LogicalNode, SelectStatement } from "./types.mts";
import { Parser } from "./parser.mts";

export class Interpreter {
    private ast: ASTNode;

    constructor(ast: ASTNode) {
        this.ast = ast;
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

        //pass here your own function to execute the query on your data source, for example:
        // return database.query({ type: 'select', columns, from, where });
        return {
            type: 'SelectResult',
            columns,
            from,
            where
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