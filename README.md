# Query-Bery

A lightweight, extensible query language interpreter that parses and executes SQL-like queries in JavaScript/TypeScript environments. Perfect for building query-based applications, data filters, and custom query languages.

## Features

### Currently Supported

- **SELECT statements** - Data retrieval with powerful filtering

  ```sql
  SELECT id, name, age FROM users WHERE age > 21
  ```

- **DELETE statements** - Safe data removal with conditional filtering

  ```sql
  DELETE FROM users WHERE status = 'inactive'
  ```

- **WHERE conditions** - Filter data with logical operators

  ```sql
  SELECT * FROM users WHERE age > 18 AND city = 'AMS' OR status = 'active'
  ```

- **JOIN operations** - Combine data from multiple sources

  ```sql
  SELECT u.name, o.total FROM users u
  INNER JOIN orders o ON u.id = o.user_id
  ```

  Supported: INNER, LEFT, RIGHT, CROSS joins

- **Comparison & Logical Operators**
  - `=`, `!=`, `>`, `>=`, `<`, `<=`
  - `AND`, `OR`, `NOT`
  - `IS NULL`, `IN`

- **Query Modifiers**
  - `DISTINCT` - Remove duplicate results
  - `ORDER BY ... ASC/DESC` - Sort results
  - `LIMIT` & `OFFSET` - Pagination support

- **Fully Tested** - Comprehensive test coverage with Vitest

### Roadmap

#### Version 1.1 - Core Enhancements

- [ ] **Parentheses** - Support for complex expressions

  ```sql
  WHERE (age > 18 AND city = 'AMS') OR status = 'active'
  ```

- [ ] **GROUP BY & HAVING** - Aggregation and conditional filtering

  ```sql
  SELECT city, COUNT(*) FROM users
  GROUP BY city
  HAVING COUNT(*) > 5
  ```

- [ ] **Aggregate Functions** - COUNT, SUM, AVG, MIN, MAX
  ```sql
  SELECT COUNT(*), AVG(age), MAX(salary) FROM employees
  ```

#### Version 1.2 - Advanced Features

- [ ] **Arithmetic Operators** - Mathematical operations in queries

  ```sql
  SELECT name, price * quantity as total FROM orders
  ```

- [ ] **UPDATE Statements** - Modify existing data

  ```sql
  UPDATE users SET status = 'active' WHERE created_at > '2025-01-01'
  ```

- [ ] **INSERT Statements** - Add new data
  ```sql
  INSERT INTO users (name, email) VALUES ('John', 'john@example.com')
  ```

#### Version 1.3 - Pattern Matching

- [ ] **LIKE Operator** - Flexible string pattern matching

  ```sql
  WHERE name LIKE '%John%'
  ```

- [ ] **BETWEEN Operator** - Range queries
  ```sql
  WHERE age BETWEEN 18 AND 65
  ```

#### Version 2.0 - Intelligence Layer

- [ ] **Query Optimizer** - Automatic query optimization and execution planning
- [ ] **NLP Translator** - Convert natural language to optimized queries
  ```
  User: "Show me all active users over 25 in Amsterdam"
  Optimized: SELECT * FROM users WHERE status = 'active' AND age > 25 AND city = 'AMS'
  ```

## Installation

```bash
npm install query-bery
```

Or clone and set up locally:

```bash
git clone https://github.com/tijngommers/query-bery.git
cd query-bery
npm install
```

## Usage

### Basic Query Execution

```typescript
import { Interpreter } from "./src/query-language/interpreter.mts";

// SELECT example
const selectQuery = "SELECT id, name FROM users WHERE age > 21";
const selectInterpreter = new Interpreter(selectQuery);
const results = selectInterpreter.execute();
console.log(results);

// DELETE example
const deleteQuery = "DELETE FROM users WHERE id = 5";
const deleteInterpreter = new Interpreter(deleteQuery);
deleteInterpreter.execute();
```

### Complex Queries

```typescript
// With JOINs
const joinQuery = `
  SELECT u.name, COUNT(o.id) as order_count 
  FROM users u 
  LEFT JOIN orders o ON u.id = o.user_id
  ORDER BY order_count DESC
  LIMIT 10
`;
const interpreter = new Interpreter(joinQuery);
const topCustomers = interpreter.execute();

// With DISTINCT and filtering
const distinctQuery = `
  SELECT DISTINCT city 
  FROM users 
  WHERE status = 'active'
  ORDER BY city ASC
`;
const interpreter = new Interpreter(distinctQuery);
const activeCities = interpreter.execute();
```

## Architecture

### Core Components

```
src/query-language/
├── lexer.mts           # Tokenization (string → tokens)
├── parser.mts          # AST generation (tokens → AST)
├── interpreter.mts     # Query execution orchestrator
├── types.mts           # Type definitions
└── executors/
    ├── select-executor.mts     # SELECT query execution
    ├── delete-executor.mts     # DELETE query execution
    ├── join-executor.mts       # JOIN operation handling
    └── *.spec.mts             # Unit tests
```

### Execution Flow

1. **Lexer** - Tokenizes the input query string into meaningful tokens
2. **Parser** - Builds an Abstract Syntax Tree (AST) from tokens
3. **Interpreter** - Orchestrates execution based on statement type
4. **Executors** - Specialized handlers for different query types

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

### Project Structure

- **Source** - TypeScript/JavaScript query language implementation
- **Tests** - Comprehensive Vitest suite with 100% coverage target
- **Coverage** - HTML coverage reports in `/coverage`

### Building

```bash
npm run build
```

## Contributing

We welcome contributions! Please ensure:

1. All tests pass: `npm test`
2. Coverage is maintained or improved
3. Code follows the existing style and architecture
4. New features include corresponding tests

## Roadmap & Vision

Query-Bery is building towards a complete data query ecosystem:

1. **Smart Query Parsing** (Current)
2. **Advanced Features**
3. **Query Optimization**
4. **AI-Powered Translation**

Our goal is to make querying data as natural as conversation while maintaining performance and security.

## Tech Stack

- **Language** - TypeScript / JavaScript (Node.js)
- **Testing** - Vitest with code coverage
- **ES Modules** - Modern module system
- **Type Safety** - Full TypeScript support

## License

ISC

## Repository

[GitHub: query-bery](https://github.com/tijngommers/query-bery)

---

**Created by** Tijn Gommers | **Last Updated** March 2026

_Query-Bery: Powerful, simple, extensible SQL for the modern web._
