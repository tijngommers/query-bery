//@author Tijn Gommers
//@date 2026-03-30

import { JoinNode } from '../../types/index.mjs';

export class JoinExecutor {
    executeJoin(joinNode: JoinNode): any {
        return this.processJoin(joinNode);
    }

    executeMultipleJoins(joinNodes: JoinNode[]): any[] {
        return joinNodes.map(join => this.processJoin(join));
    }

    private processJoin(node: JoinNode): any {
        const { table, joinType, on } = node;

        return {
            type: 'Join',
            table,
            joinType,
            on,
        };
    }

    validateJoin(joinNode: JoinNode): void {
        if (!joinNode.table || !joinNode.on) {
            throw new Error('Invalid JOIN: missing table or ON condition');
        }
    }
}
