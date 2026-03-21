/**
 * db.js — SQLite 인덱스 모듈
 *
 * spec.md §2.1.1의 SQL 스키마를 정확히 구현.
 * memories + FTS5 + memory_links 테이블, 인덱스 3개, WAL 모드.
 * 모든 DB 쿼리는 prepared statement 사용.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── DB 경로 결정 ───────────────────────────────────────────
const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");
const DB_PATH = path.join(MEMORY_ROOT, "_memory.db");

// DB 디렉토리 확보
fs.mkdirSync(MEMORY_ROOT, { recursive: true });

// ─── DB 인스턴스 생성 ───────────────────────────────────────
const db = new Database(DB_PATH);
console.error(`[db] SQLite opened: ${DB_PATH}`);

// WAL 모드 활성화
db.pragma("journal_mode = WAL");
// FK 제약 활성화 (CASCADE DELETE 동작에 필요)
db.pragma("foreign_keys = ON");
console.error("[db] WAL mode + foreign_keys enabled");

// ─── 스키마 생성 ────────────────────────────────────────────
db.exec(`
  -- 메인 메모리 테이블
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
      access_count  INTEGER DEFAULT 0
  );

  -- FTS5 전문 검색 인덱스 (standalone — memories 테이블과 수동 동기화)
  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      title,
      tags,
      summary,
      content,
      tokenize='unicode61 remove_diacritics 2'
  );

  -- 메모리 간 관계
  CREATE TABLE IF NOT EXISTS memory_links (
      source_id INTEGER REFERENCES memories(id) ON DELETE CASCADE,
      target_id INTEGER REFERENCES memories(id) ON DELETE CASCADE,
      relation  TEXT NOT NULL,
      PRIMARY KEY (source_id, target_id)
  );

  -- 인덱스
  CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  CREATE INDEX IF NOT EXISTS idx_memories_updated ON memories(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
`);
console.error("[db] Schema initialized (memories, memories_fts, memory_links, 3 indexes)");

// ─── v2 Schema Migration ───────────────────────────────────

const SCHEMA_VERSION = 2;

function runMigrations() {
  // Track schema version via user_version pragma
  const currentVersion = db.pragma("user_version", { simple: true });

  if (currentVersion < 2) {
    console.error("[db] Running migration to v2...");

    // Add new columns to memories (ignore if already exist)
    const addColumn = (col, def) => {
      try { db.exec(`ALTER TABLE memories ADD COLUMN ${col} ${def}`); }
      catch { /* column already exists */ }
    };

    addColumn("layer", "TEXT DEFAULT 'working' CHECK (layer IN ('episodic', 'working', 'longterm'))");
    addColumn("last_accessed", "TEXT DEFAULT NULL");
    addColumn("version", "INTEGER DEFAULT 1");
    addColumn("source", "TEXT DEFAULT 'user'");
    addColumn("agent_domain", "TEXT DEFAULT 'shared'");

    // memory_versions — tracks refinement history
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_versions (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_id   INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
          version     INTEGER NOT NULL DEFAULT 1,
          content     TEXT NOT NULL,
          summary     TEXT DEFAULT '',
          changed_by  TEXT DEFAULT 'system',
          created_at  TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_versions_memory
          ON memory_versions(memory_id, version DESC);
    `);

    // memory_trigrams — budget similarity search (no external API)
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_trigrams (
          memory_id   INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
          trigram     TEXT NOT NULL,
          tf          REAL NOT NULL,
          PRIMARY KEY (memory_id, trigram)
      );
      CREATE INDEX IF NOT EXISTS idx_trigrams_trigram ON memory_trigrams(trigram);
    `);

    // Extend memory_links with created_at and weight
    try { db.exec("ALTER TABLE memory_links ADD COLUMN created_at TEXT DEFAULT (datetime('now'))"); } catch {}
    try { db.exec("ALTER TABLE memory_links ADD COLUMN weight REAL DEFAULT 1.0"); } catch {}

    db.pragma(`user_version = ${SCHEMA_VERSION}`);
    console.error("[db] Migration to v2 complete");
  }
}

runMigrations();

// ─── Prepared Statements ────────────────────────────────────

const insert = db.prepare(`
  INSERT INTO memories
    (file_path, category, subcategory, title, tags, summary, importance, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(file_path) DO UPDATE SET
    category = excluded.category,
    subcategory = excluded.subcategory,
    title = excluded.title,
    tags = excluded.tags,
    summary = excluded.summary,
    importance = excluded.importance,
    updated_at = datetime('now')
`);

const search = db.prepare(`
  SELECT m.*, snippet(memories_fts, 3, '>>>', '<<<', '...', 32) AS snippet
  FROM memories_fts f
  JOIN memories m ON m.id = f.rowid
  WHERE memories_fts MATCH ?
  ORDER BY rank
  LIMIT ?
`);

const searchByTag = db.prepare(`
  SELECT * FROM memories
  WHERE tags LIKE ?
  ORDER BY updated_at DESC
  LIMIT ?
`);

const searchByCategory = db.prepare(`
  SELECT * FROM memories
  WHERE category = ?
  ORDER BY updated_at DESC
  LIMIT ?
`);

const getById = db.prepare(`SELECT * FROM memories WHERE id = ?`);

const getByPath = db.prepare(`SELECT * FROM memories WHERE file_path = ?`);

const updateAccess = db.prepare(`
  UPDATE memories SET access_count = access_count + 1, last_accessed = datetime('now') WHERE id = ?
`);

const deleteById = db.prepare(`DELETE FROM memories WHERE id = ?`);

const listAll = db.prepare(`
  SELECT id, file_path, category, title, tags, importance, updated_at
  FROM memories
  ORDER BY updated_at DESC
  LIMIT ?
`);

const listByCategory = db.prepare(`
  SELECT id, file_path, category, title, tags, importance, updated_at
  FROM memories
  WHERE category = ?
  ORDER BY updated_at DESC
  LIMIT ?
`);

const insertFts = db.prepare(`
  INSERT INTO memories_fts(rowid, title, tags, summary, content)
  VALUES (?, ?, ?, ?, ?)
`);

const deleteFts = db.prepare(`
  DELETE FROM memories_fts WHERE rowid = ?
`);

// ─── Exports ────────────────────────────────────────────────

export {
  db,
  MEMORY_ROOT,
  DB_PATH,
  insert,
  search,
  searchByTag,
  searchByCategory,
  getById,
  getByPath,
  updateAccess,
  deleteById,
  listAll,
  listByCategory,
  insertFts,
  deleteFts,
};
