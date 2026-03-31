// @author Tijn Gommers
// @date 2026-03-31

import {
    ExpressionNode,
    FromNode,
    IdentifierNode,
    SelectColumn,
    TableNode,
    ValueNode,
} from './ast-nodes.mts';

export interface OrderByStatement {
    type: 'OrderByStatement';
    columns: IdentifierNode[];
    direction?: 'ASC' | 'DESC';
}

export interface LimitOffsetNode {
    type: 'LimitOffset';
    limit: number;
    offset?: number;
}

export interface SelectStatement {
    type: 'SelectStatement';
    distinct: boolean;
    columns: SelectColumn[];
    groupBy?: IdentifierNode[];
    from: FromNode[];
    where?: ExpressionNode;
    having?: ExpressionNode;
    orderBy?: OrderByStatement;
    limit?: LimitOffsetNode;
}

export interface DeleteStatement {
    type: 'DeleteStatement';
    from: TableNode[];
    where?: ExpressionNode;
}

export interface InsertStatement {
    type: 'InsertStatement';
    table: TableNode;
    columns: IdentifierNode[];
    values: ValueNode[][];
}

export interface UpdateStatement {
    type: 'UpdateStatement';
    table: TableNode;
    set: { column: IdentifierNode; value: ValueNode }[];
    where?: ExpressionNode;
}

export type ASTNode = SelectStatement | DeleteStatement | InsertStatement | UpdateStatement;
