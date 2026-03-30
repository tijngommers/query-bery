# Query-Bery Architecture

This project follows a layered pipeline:

1. Lexer: query text -> token stream
2. Parser: token stream -> AST
3. Interpreter: statement dispatch
4. Executors: statement-specific execution behavior

## Parser Structure

Parser logic is intentionally split into focused modules:

- `src/query-language/parser/index.mts`
  - Canonical statement-level parser implementation
- `src/query-language/parser/parser-cursor.mts`
  - Token stream cursor
  - Current token inspection and `eat(...)`
- `src/query-language/parser/value-parser.mts`
  - Identifier parsing (`a.b`)
  - Literal parsing (`number`, `string`, `null`)
  - Comparison operator parsing
- `src/query-language/parser/expression-parser.mts`
  - WHERE expression grammar and precedence
  - Supports logical and arithmetic expression trees

## Canonical Module Layout

- Lexer: `src/query-language/lexer/index.mts`
- Parser: `src/query-language/parser/index.mts`
- Interpreter: `src/query-language/interpreter/index.mts`
- Executors:
  - `src/query-language/executors/select/index.mts`
  - `src/query-language/executors/delete/index.mts`
  - `src/query-language/executors/join/index.mts`

## Types Structure

Modular type source files live in:

- `src/query-language/types/tokens.mts`
- `src/query-language/types/ast.mts`
- `src/query-language/types/index.mts`

## Extension Rules

When adding a feature, update in this order:

1. Token model (`types/tokens.mts`, `lexer/index.mts`)
2. AST shape (`types/ast.mts`)
3. Parser module (`parser/*.mts`)
4. Executor behavior (if runtime output changes)
5. Tests (`lexer.spec`, `parser.spec`, `interpreter.spec`, executor specs)
