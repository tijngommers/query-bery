# Querylib

Querylib is a lightweight SQL-like query language engine for JavaScript/TypeScript.
It tokenizes input, parses it into an AST, and executes statements through dedicated executors.

## What Is Implemented

### Statements

- SELECT
- DELETE
- INSERT
- UPDATE

### SQL Features

- WHERE expressions with precedence and parentheses
- Logical operators: AND, OR, NOT
- Comparison operators: =, !=, >, >=, <, <=
- IN lists
- IS NULL and IS NOT NULL
- Arithmetic in expressions: +, -, \*, /
- DISTINCT
- ORDER BY with ASC/DESC
- LIMIT and OFFSET
- JOIN parsing and execution metadata support: INNER, LEFT, RIGHT, OUTER, CROSS
- Aggregate functions in SELECT and HAVING parsing: COUNT, SUM, AVG, MIN, MAX

### Current Behavior Notes

- Aggregate computation is implemented for non-grouped aggregate queries.
- GROUP BY/HAVING is parsed, but grouped aggregate execution semantics are not fully implemented yet.
- INSERT and UPDATE executors currently operate on provided in-memory row arrays and return structured result payloads.

## Quick Examples

```sql
SELECT name, age FROM users WHERE age >= 18 ORDER BY age DESC LIMIT 10
```

```sql
DELETE FROM users WHERE status = 'inactive'
```

```sql
INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30), (2, 'Bob', 25)
```

```sql
UPDATE users SET status = 'active' WHERE id IN (1, 2, 3)
```

## Usage

```ts
import { Interpreter } from "./src/query-language/interpreter/index.mts";

const query = "SELECT COUNT(*), AVG(age) FROM users WHERE active = 1";
const interpreter = new Interpreter(query);
const result = interpreter.execute();

console.log(result);
```

## Architecture

```text
src/query-language/
  lexer/
    index.mts
  parser/
    index.mts
    parser-cursor.mts
    value-parser.mts
    expression-parser.mts
  interpreter/
    index.mts
  types/
    tokens.mts
    ast.mts
    index.mts
  executors/
    select/
      index.mts
    delete/
      index.mts
    insert/
      index.mts
    update/
      index.mts
    join/
      index.mts
```

Execution pipeline:

1. Lexer converts text into tokens.
2. Parser converts tokens into AST nodes.
3. Interpreter dispatches AST nodes by statement type.
4. Statement executors produce result objects.

## Testing

```bash
npm test
```

```bash
npm run test:coverage
```

The project is covered by a comprehensive Vitest suite, including parser/executor/interpreter tests for SELECT, DELETE, INSERT, UPDATE, and aggregate-related paths.

## Development Notes

- Keep parser changes grammar-focused and push execution behavior into executors.
- Add tests first for lexer/parser contracts and executor semantics.
- Preserve existing error-message style when adding new validations.

## Roadmap

- Full GROUP BY/HAVING execution semantics
- Additional SQL operators (LIKE, BETWEEN)
- Richer data-source integration for execution

## License

ISC

## Repository

[GitHub: querylib](https://github.com/tijngommers/querylib)
