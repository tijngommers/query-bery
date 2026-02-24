// @author Wout Van Hemelrijck
// @date 2026-02-24
//
// Database compaction module.
// Implements a rebuild-based compaction strategy (similar to SQLite's VACUUM):
// 1. Extract all data (documents + index metadata) from the current database
// 2. Close the old database
// 3. Create a fresh database on the same files
// 4. Re-insert all data, producing a tightly-packed file with no free-list gaps
//
// This reduces the physical file size by eliminating accumulated empty space
// from deleted or updated records.

import { SimpleDBMS, type Document } from './simpledbms.mjs';
import { FBNodeStorage } from './node-storage/fb-node-storage.mjs';
import { type File } from './file/file.mjs';

/**
 * Snapshot of a single collection's data and index metadata.
 */
export interface CollectionSnapshot {
  name: string;
  documents: Document[];
  indexedFields: string[];
}

/**
 * Full snapshot of the database contents.
 */
export interface DatabaseSnapshot {
  collections: CollectionSnapshot[];
}

/**
 * Result returned after a compaction operation.
 */
export interface CompactionResult {
  success: boolean;
  collectionsCompacted: number;
  totalDocuments: number;
  sizeBefore: number;
  sizeAfter: number;
}

/**
 * Extracts a complete snapshot of all data from an open database.
 * This reads all collections, their documents, and index metadata.
 *
 * @param {SimpleDBMS} db - The open database instance to snapshot.
 * @returns {Promise<DatabaseSnapshot>} A snapshot containing all database data.
 */
export async function extractDatabaseSnapshot(db: SimpleDBMS): Promise<DatabaseSnapshot> {
  const collectionNames = await db.getCollectionNames();
  const collections: CollectionSnapshot[] = [];

  for (const name of collectionNames) {
    const collection = await db.getCollection(name);
    const documents = await collection.find();

    // Get indexed fields from both the loaded collection and the header metadata
    const loadedFields = collection.getIndexedFields();
    const headerFields = db.getCollectionIndexInfo(name);
    const indexedFields = [...new Set([...loadedFields, ...headerFields])];

    collections.push({ name, documents, indexedFields });
  }

  return { collections };
}

/**
 * Rebuilds a database from a snapshot, creating a fresh, compacted file.
 *
 * @param {DatabaseSnapshot} snapshot - The data to insert into the new database.
 * @param {File} dbFile - The file to use for the new database.
 * @param {File} walFile - The WAL file for the new database.
 * @returns {Promise<SimpleDBMS>} The newly created, compacted database instance.
 */
export async function rebuildFromSnapshot(
  snapshot: DatabaseSnapshot,
  dbFile: File,
  walFile: File,
): Promise<SimpleDBMS> {
  const db = await SimpleDBMS.create(dbFile, walFile);

  for (const collSnapshot of snapshot.collections) {
    const collection = await db.getCollection(collSnapshot.name);

    // Re-insert all documents (preserving original IDs)
    for (const doc of collSnapshot.documents) {
      await collection.insert(doc);
    }

    // Recreate secondary indexes
    for (const field of collSnapshot.indexedFields) {
      const indexStorage = new FBNodeStorage<string, string>(
        (a, b) => (a < b ? -1 : a > b ? 1 : 0),
        () => 1024,
        db.getFreeBlockFile(),
        4096,
      );
      await collection.createIndex(field, indexStorage);
    }
  }

  return db;
}

/**
 * Compacts a database by rebuilding it from scratch, eliminating all free-list
 * fragmentation and reducing the physical file size.
 *
 * This is a blocking maintenance operation: the database is temporarily closed
 * during compaction. The caller should ensure no other operations are in progress.
 *
 * @param {SimpleDBMS} db - The current database instance (will be closed).
 * @param {File} dbFile - The database file (will be recreated).
 * @param {File} walFile - The WAL file (will be recreated).
 * @returns {Promise<{db: SimpleDBMS; result: CompactionResult}>} The new database instance and compaction stats.
 */
export async function compactDatabase(
  db: SimpleDBMS,
  dbFile: File,
  walFile: File,
): Promise<{ db: SimpleDBMS; result: CompactionResult }> {
  // Step 1: Extract all data from the current database
  const snapshot = await extractDatabaseSnapshot(db);

  // Step 2: Measure file size before compaction
  const sizeBefore = (await dbFile.stat()).size;

  // Step 3: Close the current database
  await db.close();

  // Step 4: Reset the files (truncate to zero, then close so create() can reopen)
  await dbFile.create();
  await dbFile.close();
  await walFile.create();
  await walFile.close();

  // Step 5: Rebuild from the snapshot
  const newDb = await rebuildFromSnapshot(snapshot, dbFile, walFile);

  // Step 6: Measure file size after compaction
  const sizeAfter = (await dbFile.stat()).size;

  const totalDocuments = snapshot.collections.reduce((sum, c) => sum + c.documents.length, 0);

  return {
    db: newDb,
    result: {
      success: true,
      collectionsCompacted: snapshot.collections.length,
      totalDocuments,
      sizeBefore,
      sizeAfter,
    },
  };
}
