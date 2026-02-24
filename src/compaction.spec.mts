// @author Wout Van Hemelrijck
// @date 2026-02-24

import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleDBMS } from './simpledbms.mjs';
import { MockFile } from './file/mockfile.mjs';
import { extractDatabaseSnapshot, rebuildFromSnapshot, compactDatabase } from './compaction.mjs';

describe('Database Compaction', () => {
  let dbFile: MockFile;
  let walFile: MockFile;

  beforeEach(() => {
    dbFile = new MockFile(512);
    walFile = new MockFile(512);
  });

  describe('extractDatabaseSnapshot', () => {
    it('should extract an empty database snapshot', async () => {
      const db = await SimpleDBMS.create(dbFile, walFile);
      const snapshot = await extractDatabaseSnapshot(db);

      expect(snapshot.collections).toHaveLength(0);
      await db.close();
    });

    it('should extract all collections and documents', async () => {
      const db = await SimpleDBMS.create(dbFile, walFile);

      const users = await db.getCollection('users');
      await users.insert({ id: 'u1', name: 'Alice', age: 30 });
      await users.insert({ id: 'u2', name: 'Bob', age: 25 });

      const posts = await db.getCollection('posts');
      await posts.insert({ id: 'p1', title: 'Hello', userId: 'u1' });

      const snapshot = await extractDatabaseSnapshot(db);

      expect(snapshot.collections).toHaveLength(2);

      const usersSnapshot = snapshot.collections.find((c) => c.name === 'users');
      expect(usersSnapshot).toBeDefined();
      expect(usersSnapshot!.documents).toHaveLength(2);

      const postsSnapshot = snapshot.collections.find((c) => c.name === 'posts');
      expect(postsSnapshot).toBeDefined();
      expect(postsSnapshot!.documents).toHaveLength(1);

      await db.close();
    });
  });

  describe('rebuildFromSnapshot', () => {
    it('should rebuild a database from a snapshot', async () => {
      const db = await SimpleDBMS.create(dbFile, walFile);
      const users = await db.getCollection('users');
      await users.insert({ id: 'u1', name: 'Alice' });
      await users.insert({ id: 'u2', name: 'Bob' });

      const snapshot = await extractDatabaseSnapshot(db);
      await db.close();

      // Rebuild on fresh files
      const newDbFile = new MockFile(512);
      const newWalFile = new MockFile(512);
      const newDb = await rebuildFromSnapshot(snapshot, newDbFile, newWalFile);

      const newUsers = await newDb.getCollection('users');
      const alice = await newUsers.findById('u1');
      expect(alice).toBeDefined();
      expect(alice!['name']).toBe('Alice');

      const bob = await newUsers.findById('u2');
      expect(bob).toBeDefined();
      expect(bob!['name']).toBe('Bob');

      await newDb.close();
    });
  });

  describe('compactDatabase', () => {
    it('should compact an empty database', async () => {
      const db = await SimpleDBMS.create(dbFile, walFile);

      const { db: newDb, result } = await compactDatabase(db, dbFile, walFile);

      expect(result.success).toBe(true);
      expect(result.collectionsCompacted).toBe(0);
      expect(result.totalDocuments).toBe(0);

      await newDb.close();
    });

    it('should preserve all documents after compaction', async () => {
      let db = await SimpleDBMS.create(dbFile, walFile);
      const users = await db.getCollection('users');
      await users.insert({ id: 'u1', name: 'Alice', age: 30 });
      await users.insert({ id: 'u2', name: 'Bob', age: 25 });
      await users.insert({ id: 'u3', name: 'Charlie', age: 35 });

      const { db: newDb } = await compactDatabase(db, dbFile, walFile);
      db = newDb;

      const newUsers = await db.getCollection('users');

      const alice = await newUsers.findById('u1');
      expect(alice).toBeDefined();
      expect(alice!['name']).toBe('Alice');
      expect(alice!['age']).toBe(30);

      const bob = await newUsers.findById('u2');
      expect(bob).toBeDefined();
      expect(bob!['name']).toBe('Bob');

      const charlie = await newUsers.findById('u3');
      expect(charlie).toBeDefined();
      expect(charlie!['name']).toBe('Charlie');

      const all = await newUsers.find();
      expect(all).toHaveLength(3);

      await db.close();
    });

    it('should preserve multiple collections after compaction', async () => {
      let db = await SimpleDBMS.create(dbFile, walFile);

      const users = await db.getCollection('users');
      await users.insert({ id: 'u1', name: 'Alice' });

      const posts = await db.getCollection('posts');
      await posts.insert({ id: 'p1', title: 'Hello', userId: 'u1' });

      const { db: newDb } = await compactDatabase(db, dbFile, walFile);
      db = newDb;

      const newUsers = await db.getCollection('users');
      const newPosts = await db.getCollection('posts');

      expect(await newUsers.findById('u1')).toBeDefined();
      expect(await newPosts.findById('p1')).toBeDefined();

      const post = await newPosts.findById('p1');
      expect(post!['title']).toBe('Hello');

      await db.close();
    });

    it('should reduce file size after deletions', async () => {
      let db = await SimpleDBMS.create(dbFile, walFile);
      const users = await db.getCollection('users');

      // Insert many documents
      for (let i = 0; i < 50; i++) {
        await users.insert({ id: `user-${i}`, name: `User ${i}`, data: 'x'.repeat(100) });
      }

      // Delete most of them to create free space
      for (let i = 10; i < 50; i++) {
        await users.delete(`user-${i}`);
      }

      const sizeBefore = (await dbFile.stat()).size;

      const { db: newDb, result } = await compactDatabase(db, dbFile, walFile);
      db = newDb;

      expect(result.success).toBe(true);
      expect(result.sizeBefore).toBe(sizeBefore);
      expect(result.sizeAfter).toBeLessThan(result.sizeBefore);

      // Verify remaining data is intact
      const newUsers = await db.getCollection('users');
      const remaining = await newUsers.find();
      expect(remaining).toHaveLength(10);

      for (let i = 0; i < 10; i++) {
        const user = await newUsers.findById(`user-${i}`);
        expect(user).toBeDefined();
        expect(user!['name']).toBe(`User ${i}`);
      }

      await db.close();
    });

    it('should allow normal operations after compaction', async () => {
      let db = await SimpleDBMS.create(dbFile, walFile);
      const users = await db.getCollection('users');
      await users.insert({ id: 'u1', name: 'Alice' });

      const { db: newDb } = await compactDatabase(db, dbFile, walFile);
      db = newDb;

      const newUsers = await db.getCollection('users');

      // Verify existing data survived compaction
      const alice = await newUsers.findById('u1');
      expect(alice).toBeDefined();
      expect(alice!['name']).toBe('Alice');

      // Insert new documents after compaction
      await newUsers.insert({ id: 'u2', name: 'Bob' });
      const bob = await newUsers.findById('u2');
      expect(bob).toBeDefined();
      expect(bob!['name']).toBe('Bob');

      // Update existing documents after compaction
      const updated = await newUsers.update('u1', { age: 31 });
      expect(updated).toBeDefined();
      expect(updated!['age']).toBe(31);

      // Delete a document after compaction
      const deleted = await newUsers.delete('u2');
      expect(deleted).toBe(true);
      const gone = await newUsers.findById('u2');
      expect(gone).toBeNull();

      await db.close();
    });

    it('should persist data across close/open after compaction', async () => {
      let db = await SimpleDBMS.create(dbFile, walFile);
      const users = await db.getCollection('users');
      await users.insert({ id: 'u1', name: 'Alice' });
      await users.insert({ id: 'u2', name: 'Bob' });

      const { db: compactedDb } = await compactDatabase(db, dbFile, walFile);
      await compactedDb.close();

      // Reopen the compacted database
      const reopened = await SimpleDBMS.open(dbFile, walFile);
      const reopenedUsers = await reopened.getCollection('users');

      expect(await reopenedUsers.findById('u1')).toBeDefined();
      expect(await reopenedUsers.findById('u2')).toBeDefined();
      expect((await reopenedUsers.findById('u1'))!['name']).toBe('Alice');

      await reopened.close();
    });
  });

  describe('getCollectionNames', () => {
    it('should return empty array for new database', async () => {
      const db = await SimpleDBMS.create(dbFile, walFile);
      const names = await db.getCollectionNames();
      expect(names).toHaveLength(0);
      await db.close();
    });

    it('should return all collection names', async () => {
      const db = await SimpleDBMS.create(dbFile, walFile);
      await db.getCollection('users');
      await db.getCollection('posts');
      await db.getCollection('comments');

      const names = await db.getCollectionNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('users');
      expect(names).toContain('posts');
      expect(names).toContain('comments');

      await db.close();
    });
  });
});
