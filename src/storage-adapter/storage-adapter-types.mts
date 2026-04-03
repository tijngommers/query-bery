// @author Tijn Gommers
// @date 2026-04-03

import { ArithmeticOperator, ComparisonOperator } from '../query-language/types/index.mjs';

/**
 * Primitive value types supported by storage adapter payloads.
 */
export type StorageScalar = string | number | boolean | null;

/**
 * Recursive row value accepted by adapters.
 */
export type StorageValue = StorageScalar | StorageRow | StorageValue[];

/**
 * Generic row shape used by adapters.
 */
export interface StorageRow {
    [key: string]: StorageValue;
}

/**
 * Storage adapter operand for query predicate pushdown.
 */
export type StorageOperand =
    | string
    | number
    | null
    | {
        type: 'AggregateFunction';
        functionName: string;
        argument: string;
    }
    | {
        type: 'ArithmeticExpression';
        operator: ArithmeticOperator;
        left: StorageOperand;
        right: StorageOperand;
    };

/**
 * Storage adapter predicate tree produced from query WHERE clauses.
 */
export type StoragePredicate =
    | {
        type: 'LogicalExpression';
        operator: 'AND' | 'OR';
        left?: StoragePredicate;
        right?: StoragePredicate;
    }
    | {
        type: 'NotExpression';
        operator: 'NOT';
        expression?: StoragePredicate;
    }
    | {
        type: 'ComparisonExpression';
        operator: ComparisonOperator;
        left: StorageOperand;
        right: StorageOperand;
    }
    | {
        type: 'NullCheckExpression';
        column: string;
        isNegated: boolean;
    }
    | {
        type: 'InExpression';
        column: string;
        values: Array<string | number | null>;
    };