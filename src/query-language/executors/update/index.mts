//@author Tijn Gommers
//@date 2026-04-02

import { ExpressionNode, IdentifierNode, UpdateStatement, ValueNode } from '../../types/index.mjs';
import { UpdateResult } from '../../types/execution-results.mjs';
import { StorageAdapter } from '../../../storage-adapter/storage-adapter.mjs';
import { compileStorageWherePredicate } from '../storage-adapter-helpers.mjs';

/**
 * Executes UPDATE statements with optional storage-adapter pushdown.
 */
export class UpdateExecutor {
	private storageAdapter?: StorageAdapter;

	/**
	 * Creates an UPDATE executor.
	 * @param storageAdapter Optional storage adapter for adapter-backed execution.
	 */
	constructor(storageAdapter?: StorageAdapter) {
		this.storageAdapter = storageAdapter;
	}

	/**
	 * Executes an UPDATE statement and returns updated row metadata.
	 * @param node The UPDATE statement AST node to execute.
	 * @param inputRows Optional input rows for in-memory execution (used when no storage adapter is available or when executing on a subquery result).
	 * @returns {UpdateResult | Promise<UpdateResult>} An object containing metadata about the update operation, including the number of rows updated and the updated row data. If a storage adapter is used, this method returns a promise that resolves to the update result after the asynchronous update operation completes.
	 * @throws {Error} If the UPDATE statement is invalid (e.g., missing table or SET assignments).
	 */
	executeUpdate(node: UpdateStatement, inputRows: Record<string, any>[] = []): UpdateResult | Promise<UpdateResult> {
		this.validateUpdate(node);

		if (!this.storageAdapter || inputRows.length > 0) {
			return this.executeInMemory(node, inputRows);
		}

		const where = this.normalizeWhereExpression(node.where);

		return (async () => {
			const predicate = compileStorageWherePredicate(where);
			const matchingRows = predicate
				? await this.storageAdapter!.filter(node.table.name, predicate)
				: await this.storageAdapter!.read(node.table.name, ['*']);
			const updatedRows = this.buildUpdatedRows(node, matchingRows);

			await this.storageAdapter!.update(node.table.name, this.buildStorageSet(node, matchingRows[0]), predicate);

			return {
				type: 'UpdateResult',
				table: node.table,
				set: node.set,
				where: node.where,
				updatedCount: updatedRows.length,
				rows: updatedRows,
			};
		})();
	}

	/**
	 * Executes UPDATE logic directly on provided in-memory rows.
	 * @param node Parsed UPDATE statement.
	 * @param inputRows Candidate rows to mutate.
	 * @returns {UpdateResult} Update metadata including mutated rows.
	 */
	private executeInMemory(node: UpdateStatement, inputRows: Record<string, any>[]): any {
		const updatedRows: Record<string, any>[] = [];

		inputRows.forEach(row => {
			if (!node.where || this.evaluateWhereExpression(node.where, row)) {
				node.set.forEach(assignment => {
					row[assignment.column.name] = this.resolveValueNode(assignment.value, row);
				});

				updatedRows.push(row);
			}
		});

		return {
			type: 'UpdateResult',
			table: node.table,
			set: node.set,
			where: node.where,
			updatedCount: updatedRows.length,
			rows: updatedRows,
		};
	}

	/**
	 * Computes updated row snapshots from source rows and SET assignments.
	 * @param node Parsed UPDATE statement.
	 * @param rows Rows that match the UPDATE predicate.
	 * @returns {Record<string, any>[]} Updated row snapshots.
	 */
	private buildUpdatedRows(node: UpdateStatement, rows: Record<string, any>[]): Record<string, any>[] {
		return rows.map(row => {
			const updatedRow = { ...row };

			node.set.forEach(assignment => {
				updatedRow[assignment.column.name] = this.resolveValueNode(assignment.value, row);
			});

			return updatedRow;
		});
	}

	/**
	 * Builds the payload passed to the storage adapter update call.
	 * @param node Parsed UPDATE statement.
	 * @param sampleRow Optional sample row used to resolve non-literal assignments.
	 * @returns {Record<string, any>} Column-value map for adapter update.
	 */
	private buildStorageSet(node: UpdateStatement, sampleRow?: Record<string, any>): Record<string, any> {
		const setPayload: Record<string, any> = {};

		node.set.forEach(assignment => {
			if (assignment.value.type === 'Literal') {
				setPayload[assignment.column.name] = assignment.value.value;
				return;
			}

			if (sampleRow) {
				setPayload[assignment.column.name] = this.resolveValueNode(assignment.value, sampleRow);
				return;
			}

			setPayload[assignment.column.name] = { type: 'Identifier', name: assignment.value.name };
		});

		return setPayload;
	}

	/**
	 * Validates basic UPDATE statement requirements.
	 * @param node Parsed UPDATE statement.
	 * @returns {void}
	 * @throws {Error} When table or SET assignments are missing.
	 */
	private validateUpdate(node: UpdateStatement): void {
		if (!node.table) {
			throw new Error('Invalid UPDATE: no table specified');
		}

		if (!node.set || node.set.length === 0) {
			throw new Error('Invalid UPDATE: no SET assignments specified');
		}
	}

	/**
	 * Normalizes nested WHERE expressions to a consistently cloned tree.
	 * @param where Optional WHERE expression.
	 * @returns {ExpressionNode | undefined} Normalized expression tree.
	 */
	private normalizeWhereExpression(where?: ExpressionNode): ExpressionNode | undefined {
		if (!where) {
			return undefined;
		}

		if (where.type === 'LogicalExpression') {
			return {
				...where,
				left: this.normalizeWhereExpression(where.left) as ExpressionNode,
				right: this.normalizeWhereExpression(where.right) as ExpressionNode,
			};
		}

		if (where.type === 'NotExpression') {
			return {
				...where,
				expression: this.normalizeWhereExpression(where.expression) as ExpressionNode,
			};
		}

		return where;
	}

	/**
	 * Resolves a value node to a concrete value for a specific row.
	 * @param value Value node from SET assignment.
	 * @param row Source row used for identifier resolution.
	 * @returns {string | number | null | undefined} Resolved assignment value.
	 */
	private resolveValueNode(value: ValueNode, row: Record<string, any>): string | number | null | undefined {
		if (value.type === 'Literal') {
			return value.value;
		}

		return this.resolveIdentifierValue(row, value);
	}

	/**
	 * Evaluates a WHERE expression against a row.
	 * @param expression WHERE expression AST node.
	 * @param row Row being tested.
	 * @returns {boolean} True when the row matches the expression.
	 */
	private evaluateWhereExpression(expression: ExpressionNode, row: Record<string, any>): boolean {
		switch (expression.type) {
			case 'LogicalExpression':
				if (expression.operator === 'AND') {
					return this.evaluateWhereExpression(expression.left, row) && this.evaluateWhereExpression(expression.right, row);
				}
				return this.evaluateWhereExpression(expression.left, row) || this.evaluateWhereExpression(expression.right, row);
			case 'NotExpression':
				return !this.evaluateWhereExpression(expression.expression, row);
			case 'ComparisonExpression': {
				const left = this.resolveExpressionValue(expression.left, row);
				const right = this.resolveExpressionValue(expression.right, row);
				return this.compareValues(left, right, expression.operator);
			}
			case 'NullCheckExpression': {
				const value = this.resolveIdentifierValue(row, expression.left);
				const isNullish = value === null || value === undefined;
				return expression.isNegated ? !isNullish : isNullish;
			}
			case 'InExpression': {
				const leftValue = this.resolveIdentifierValue(row, expression.left);
				const values = expression.values.map(valueNode => this.resolveExpressionValue(valueNode, row));
				return values.some(value => value === leftValue);
			}
			default:
				return false;
		}
	}

	/**
	 * Resolves an expression node to a runtime value.
	 * @param value Expression node or literal-compatible value.
	 * @param row Row context for identifier and arithmetic evaluation.
	 * @returns {any} Resolved expression value.
	 */
	private resolveExpressionValue(value: any, row: Record<string, any>): any {
		if (value.type === 'Literal') {
			return value.value;
		}

		if (value.type === 'Identifier') {
			return this.resolveIdentifierValue(row, value);
		}

		if (value.type === 'ArithmeticExpression') {
			const left = this.resolveExpressionValue(value.left, row);
			const right = this.resolveExpressionValue(value.right, row);
			return this.applyArithmetic(left, right, value.operator);
		}

		return undefined;
	}

	/**
	 * Resolves an identifier path against a row, including case-insensitive key fallback.
	 * @param row Row object containing source values.
	 * @param identifier Identifier to resolve.
	 * @returns {any} Resolved value, or undefined when not found.
	 */
	private resolveIdentifierValue(row: Record<string, any>, identifier: IdentifierNode): any {
		const path = identifier.name.split('.');
		let current: any = row;

		for (const segment of path) {
			if (current === null || current === undefined || typeof current !== 'object') {
				return undefined;
			}

			if (segment in current) {
				current = current[segment];
				continue;
			}

			const key = Object.keys(current).find(existingKey => existingKey.toUpperCase() === segment.toUpperCase());
			if (!key) {
				return undefined;
			}

			current = current[key];
		}

		return current;
	}

	/**
	 * Applies arithmetic to two operands.
	 * @param left Left operand.
	 * @param right Right operand.
	 * @param operator Arithmetic operator.
	 * @returns {number} Arithmetic result.
	 * @throws {Error} When operands are non-numeric or operator is unsupported.
	 */
	private applyArithmetic(left: any, right: any, operator: '+' | '-' | '*' | '/'): number {
		if (typeof left !== 'number' || typeof right !== 'number') {
			throw new Error(`Invalid arithmetic operands: ${left} ${operator} ${right}`);
		}

		switch (operator) {
			case '+':
				return left + right;
			case '-':
				return left - right;
			case '*':
				return left * right;
			case '/':
				return left / right;
			default:
				throw new Error(`Unsupported arithmetic operator: ${operator}`);
		}
	}

	/**
	 * Compares two values with a SQL-style comparison operator.
	 * @param left Left operand.
	 * @param right Right operand.
	 * @param operator Comparison operator.
	 * @returns {boolean} Comparison result.
	 */
	private compareValues(left: any, right: any, operator: '=' | '>' | '<' | '>=' | '<=' | '!='): boolean {
		switch (operator) {
			case '=':
				return left === right;
			case '!=':
				return left !== right;
			case '>':
				return left > right;
			case '<':
				return left < right;
			case '>=':
				return left >= right;
			case '<=':
				return left <= right;
			default:
				return false;
		}
	}
}
