//@author Tijn Gommers
//@date 2026-03-31

import { ExpressionNode, IdentifierNode, UpdateStatement, ValueNode } from '../../types/index.mjs';

export class UpdateExecutor {
	executeUpdate(node: UpdateStatement, inputRows: Record<string, any>[] = []): any {
		this.validateUpdate(node);

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

	private validateUpdate(node: UpdateStatement): void {
		if (!node.table) {
			throw new Error('Invalid UPDATE: no table specified');
		}

		if (!node.set || node.set.length === 0) {
			throw new Error('Invalid UPDATE: no SET assignments specified');
		}
	}

	private resolveValueNode(value: ValueNode, row: Record<string, any>): string | number | null | undefined {
		if (value.type === 'Literal') {
			return value.value;
		}

		return this.resolveIdentifierValue(row, value);
	}

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
