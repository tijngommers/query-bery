//@author Tijn Gommers
//@date 2026-04-02

/**
 * Public entrypoint for Querylib.
 *
 * This file exposes the small user-facing API surface:
 * - Interpreter for direct query execution
 * - NaturalLanguageExecutor for prompt-to-query execution
 * - StorageAdapter and InMemoryStorageAdapter for backing data access
 */
export { Interpreter } from './src/query-language/interpreter/index.mjs';
export { NaturalLanguageExecutor } from './src/query-language/interpreter/nl.mjs';
export { StorageAdapter } from './src/storage-adapter/storage-adapter.mjs';
export { InMemoryStorageAdapter } from './src/storage-adapter/in-memory-storage-adapter.mjs';