# Adding Features Guide

Use this checklist for every language feature.

## 1) Syntax and Tokenization

- Add keyword/operator token in `src/query-language/types/tokens.mts`.
- Add lexer behavior in `src/query-language/lexer/index.mts`.
- Add lexer tests first.

## 2) AST Contract

- Add or update AST nodes in `src/query-language/types/ast.mts`.
- Keep names explicit and composable.

## 3) Parsing

Choose the right module:

- Statement flow: `src/query-language/parser/index.mts`
- Value-level grammar: `src/query-language/parser/value-parser.mts`
- Expression precedence: `src/query-language/parser/expression-parser.mts`

Add parser tests for:

- Happy path
- Precedence edge cases
- Parenthesis behavior
- Invalid syntax and error messages

## 4) Execution

If the feature changes runtime semantics, update executors.

- `src/query-language/executors/select/index.mts`
- `src/query-language/executors/delete/index.mts`
- `src/query-language/executors/join/index.mts`

## 5) Regression Safety

- Run all tests: `npm test -- --run`
- Keep existing syntax behavior backward-compatible unless intentionally changed

## 6) Keep it Understandable

- Prefer small parser methods with one grammar concern each.
- Keep error messages specific (what was expected vs what was found).
- Do not mix token cursor state logic with business/execution logic.
