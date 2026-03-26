//@author Tijn Gommers
// @date 2026-03-25

import { Interpreter } from "./interpreter.mts";
import { describe, it, expect } from "vitest";

describe('Interpreter', () => {
    it('should execute a simple SELECT query', () => {
        const query = "SELECT name, age FROM users WHERE age > 30 AND city = 'New York'";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();
        expect(result).toEqual({
            type: 'SelectResult',
            columns: [
                { type: 'Identifier', name: 'NAME' },
                { type: 'Identifier', name: 'AGE' }
            ],
            from: { type: 'Table', name: 'USERS' },
            where: {
                type: 'LogicalExpression',
                operator: 'AND',
                left: {
                    type: 'ComparisonExpression',
                    operator: '>',
                    left: { type: 'Identifier', name: 'AGE' },
                    right: { type: 'Literal', valueType: 'number', value: 30 }
                },
                right: {
                    type: 'ComparisonExpression',
                    operator: '=',
                    left: { type: 'Identifier', name: 'CITY' },
                    right: { type: 'Literal', valueType: 'string', value: 'New York' }
                }
            }
        });
    });

    it('should execute a simple DELETE query', () => {
        const query = "DELETE FROM users WHERE id = 10";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();
        expect(result).toEqual({
            type: 'DeleteResult',
            from: { type: 'Table', name: 'USERS' },
            where: {
                type: 'ComparisonExpression',
                operator: '=',
                left: { type: 'Identifier', name: 'ID' },
                right: { type: 'Literal', valueType: 'number', value: 10 }
            }
        });
    });

    it('should execute a SELECT query with IS NOT NULL', () => {
        const query = "SELECT name FROM users WHERE city IS NOT NULL";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'SelectResult',
            columns: [
                { type: 'Identifier', name: 'NAME' }
            ],
            from: { type: 'Table', name: 'USERS' },
            where: {
                type: 'NullCheckExpression',
                left: { type: 'Identifier', name: 'CITY' },
                isNegated: true
            }
        });
    });

    it('should execute a SELECT query with ORDER BY multiple columns', () => {
        const query = "SELECT name FROM users ORDER BY age DESC, city";
        const interpreter = new Interpreter(query);
        const result = interpreter.execute();

        expect(result).toEqual({
            type: 'SelectResult',
            columns: [
                { type: 'Identifier', name: 'NAME' }
            ],
            from: { type: 'Table', name: 'USERS' },
            where: undefined,
            orderBy: {
                type: 'OrderByStatement',
                columns: [
                    { type: 'Identifier', name: 'AGE' },
                    { type: 'Identifier', name: 'CITY' }
                ],
                direction: 'DESC'
            }
        });
    });
});