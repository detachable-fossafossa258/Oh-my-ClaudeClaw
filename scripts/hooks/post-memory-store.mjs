#!/usr/bin/env node

/**
 * post-memory-store.mjs — Hook: PostToolUse (memory_store matcher)
 *
 * After any memory_store call, triggers trigram reindexing for the new entry.
 * This keeps the similarity search index always up-to-date.
 *
 * Runs asynchronously to avoid blocking the main conversation.
 */

import { execSync } from "child_process";
import path from "path";
import Database from "better-sqlite3";

const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");
const DB_PATH = path.join(MEMORY_ROOT, "_memory.db");

try {
  // Only proceed if DB exists
  const { existsSync } = await import("fs");
  if (!existsSync(DB_PATH)) {
    process.exit(0);
  }

  const db = new Database(DB_PATH, { readonly: false });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Get the most recently inserted memory
  const latest = db.prepare(
    "SELECT id, title, tags, summary FROM memories ORDER BY id DESC LIMIT 1"
  ).get();

  if (!latest) {
    db.close();
    process.exit(0);
  }

  // Check if trigrams already exist for this memory
  const existing = db.prepare(
    "SELECT COUNT(*) as cnt FROM memory_trigrams WHERE memory_id = ?"
  ).get(latest.id);

  if (existing.cnt > 0) {
    db.close();
    process.exit(0); // Already indexed
  }

  // Extract trigrams and index
  const text = `${latest.title} ${latest.tags} ${latest.summary}`;
  const normalized = text.toLowerCase().replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, " ");
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const trigrams = new Map();

  for (const word of words) {
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const tri = word.substring(i, i + 3);
        trigrams.set(tri, (trigrams.get(tri) || 0) + 1);
      }
    }
    if (/[가-힣]/.test(word) && word.length >= 2) {
      for (let i = 0; i <= word.length - 2; i++) {
        const bi = word.substring(i, i + 2);
        trigrams.set(bi, (trigrams.get(bi) || 0) + 1);
      }
    }
    if (word.length > 0 && word.length < 3 && !/[가-힣]/.test(word)) {
      trigrams.set(word, (trigrams.get(word) || 0) + 1);
    }
  }

  const total = Array.from(trigrams.values()).reduce((a, b) => a + b, 0);
  if (total === 0) {
    db.close();
    process.exit(0);
  }

  const insert = db.prepare(
    "INSERT OR REPLACE INTO memory_trigrams (memory_id, trigram, tf) VALUES (?, ?, ?)"
  );

  const txn = db.transaction(() => {
    for (const [tri, count] of trigrams) {
      insert.run(latest.id, tri, count / total);
    }
  });

  txn();
  db.close();

  console.log(`Trigrams indexed for memory #${latest.id}: ${trigrams.size} trigrams`);
} catch (e) {
  // Silent failure — never block the conversation
  process.exit(0);
}
