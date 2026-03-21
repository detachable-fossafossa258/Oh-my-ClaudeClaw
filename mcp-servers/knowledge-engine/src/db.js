/**
 * db.js — Shared SQLite connection for knowledge-engine
 *
 * Connects to the SAME database as memory-manager (WAL mode supports concurrent readers).
 * Only reads/writes to knowledge-specific tables: memory_links, memory_trigrams, memory_versions.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");
const DB_PATH = path.join(MEMORY_ROOT, "_memory.db");

fs.mkdirSync(MEMORY_ROOT, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
console.error(`[knowledge-engine] SQLite opened: ${DB_PATH}`);

// Ensure required tables exist (in case knowledge-engine starts before memory-manager)
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path     TEXT UNIQUE NOT NULL,
      category      TEXT NOT NULL,
      subcategory   TEXT DEFAULT NULL,
      title         TEXT NOT NULL,
      tags          TEXT DEFAULT '',
      summary       TEXT DEFAULT '',
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now')),
      importance    INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
      access_count  INTEGER DEFAULT 0,
      layer         TEXT DEFAULT 'working' CHECK (layer IN ('episodic', 'working', 'longterm')),
      last_accessed TEXT DEFAULT NULL,
      version       INTEGER DEFAULT 1,
      source        TEXT DEFAULT 'user',
      agent_domain  TEXT DEFAULT 'shared'
  );

  CREATE TABLE IF NOT EXISTS memory_links (
      source_id INTEGER REFERENCES memories(id) ON DELETE CASCADE,
      target_id INTEGER REFERENCES memories(id) ON DELETE CASCADE,
      relation  TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      weight    REAL DEFAULT 1.0,
      PRIMARY KEY (source_id, target_id)
  );

  CREATE TABLE IF NOT EXISTS memory_versions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_id   INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      version     INTEGER NOT NULL DEFAULT 1,
      content     TEXT NOT NULL,
      summary     TEXT DEFAULT '',
      changed_by  TEXT DEFAULT 'system',
      created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS memory_trigrams (
      memory_id   INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      trigram     TEXT NOT NULL,
      tf          REAL NOT NULL,
      PRIMARY KEY (memory_id, trigram)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      title, tags, summary, content,
      tokenize='unicode61 remove_diacritics 2'
  );

  CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  CREATE INDEX IF NOT EXISTS idx_memories_updated ON memories(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
  CREATE INDEX IF NOT EXISTS idx_versions_memory ON memory_versions(memory_id, version DESC);
  CREATE INDEX IF NOT EXISTS idx_trigrams_trigram ON memory_trigrams(trigram);
`);

export { db, MEMORY_ROOT, DB_PATH };
