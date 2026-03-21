/**
 * similarity.js — Trigram-based similarity engine
 *
 * Budget-friendly similarity search without external embedding APIs.
 * Uses character trigrams + cosine similarity computed entirely in SQLite.
 */

import { db } from "./db.js";

// ─── Prepared Statements ────────────────────────────────────

const insertTrigram = db.prepare(
  "INSERT OR REPLACE INTO memory_trigrams (memory_id, trigram, tf) VALUES (?, ?, ?)"
);

const deleteTrigrams = db.prepare(
  "DELETE FROM memory_trigrams WHERE memory_id = ?"
);

const getTrigramsByMemory = db.prepare(
  "SELECT trigram, tf FROM memory_trigrams WHERE memory_id = ?"
);

const findSharedTrigrams = db.prepare(`
  SELECT a.memory_id AS other_id,
         SUM(a.tf * b.tf) AS dot_product
  FROM memory_trigrams a
  JOIN memory_trigrams b ON a.trigram = b.trigram AND b.memory_id = ?
  WHERE a.memory_id != ?
  GROUP BY a.memory_id
  HAVING dot_product > ?
  ORDER BY dot_product DESC
  LIMIT ?
`);

const getMemoryInfo = db.prepare(
  "SELECT id, title, category, file_path, importance FROM memories WHERE id = ?"
);

const getAllMemoryIds = db.prepare(
  "SELECT id, title, file_path, category FROM memories"
);

// ─── Trigram Extraction ─────────────────────────────────────

/**
 * Extract character trigrams from text.
 * Handles both English (3-char trigrams) and Korean (2-char bigrams).
 * Returns a Map of trigram → term frequency.
 */
export function extractTrigrams(text) {
  if (!text || typeof text !== "string") return new Map();

  const normalized = text.toLowerCase().replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, " ");
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const trigrams = new Map();

  for (const word of words) {
    // English/number trigrams: "hello" → ["hel", "ell", "llo"]
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const tri = word.substring(i, i + 3);
        trigrams.set(tri, (trigrams.get(tri) || 0) + 1);
      }
    }

    // Korean bigrams: "안녕하세요" → ["안녕", "녕하", "하세", "세요"]
    if (/[가-힣]/.test(word) && word.length >= 2) {
      for (let i = 0; i <= word.length - 2; i++) {
        const bi = word.substring(i, i + 2);
        trigrams.set(bi, (trigrams.get(bi) || 0) + 1);
      }
    }

    // Short words stored whole
    if (word.length > 0 && word.length < 3 && !/[가-힣]/.test(word)) {
      trigrams.set(word, (trigrams.get(word) || 0) + 1);
    }
  }

  // Normalize to TF (term frequency)
  const total = Array.from(trigrams.values()).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const [k, v] of trigrams) {
      trigrams.set(k, v / total);
    }
  }

  return trigrams;
}

/**
 * Compute cosine similarity between two trigram maps.
 */
export function cosineSimilarity(triA, triB) {
  let dot = 0, normA = 0, normB = 0;

  for (const [tri, tfA] of triA) {
    normA += tfA * tfA;
    if (triB.has(tri)) {
      dot += tfA * triB.get(tri);
    }
  }
  for (const [, tfB] of triB) {
    normB += tfB * tfB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Index Management ───────────────────────────────────────

/**
 * Index a memory's trigrams into the database.
 * Call this after memory_store or memory_update.
 */
export function indexTrigrams(memoryId, text) {
  const trigrams = extractTrigrams(text);

  const txn = db.transaction(() => {
    deleteTrigrams.run(memoryId);
    for (const [tri, tf] of trigrams) {
      insertTrigram.run(memoryId, tri, tf);
    }
  });

  txn();
  return trigrams.size;
}

/**
 * Remove a memory's trigrams from the index.
 */
export function removeTrigrams(memoryId) {
  deleteTrigrams.run(memoryId);
}

/**
 * Rebuild trigram index for all memories.
 */
export function reindexAllTrigrams() {
  const memories = getAllMemoryIds.all();
  let indexed = 0;

  db.exec("DELETE FROM memory_trigrams");

  for (const mem of memories) {
    try {
      // Read file content for indexing
      const row = db.prepare(
        "SELECT m.title, m.tags, m.summary FROM memories m WHERE m.id = ?"
      ).get(mem.id);

      if (row) {
        const text = `${row.title} ${row.tags} ${row.summary}`;
        indexTrigrams(mem.id, text);
        indexed++;
      }
    } catch {
      // Skip failed entries
    }
  }

  console.error(`[similarity] Reindexed trigrams for ${indexed} memories`);
  return indexed;
}

// ─── Similarity Search ──────────────────────────────────────

/**
 * Find memories similar to a given memory by ID.
 */
export function findSimilarById(memoryId, threshold = 0.3, limit = 5) {
  // Get the memory's trigram norm for proper cosine computation
  const memTrigrams = getTrigramsByMemory.all(memoryId);
  if (memTrigrams.length === 0) return [];

  const normB = Math.sqrt(
    memTrigrams.reduce((sum, t) => sum + t.tf * t.tf, 0)
  );

  // Use SQL to find shared trigrams efficiently
  const results = findSharedTrigrams.all(memoryId, memoryId, threshold * normB * 0.5, limit * 2);

  // Compute proper cosine similarity for candidates
  const scored = [];
  for (const r of results) {
    const otherTrigrams = getTrigramsByMemory.all(r.other_id);
    const normA = Math.sqrt(
      otherTrigrams.reduce((sum, t) => sum + t.tf * t.tf, 0)
    );
    const similarity = (normA * normB) === 0 ? 0 : r.dot_product / (normA * normB);

    if (similarity >= threshold) {
      const info = getMemoryInfo.get(r.other_id);
      if (info) {
        scored.push({
          id: info.id,
          title: info.title,
          category: info.category,
          path: info.file_path,
          similarity_score: Math.round(similarity * 1000) / 1000,
        });
      }
    }
  }

  return scored
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);
}

/**
 * Find memories similar to arbitrary text.
 */
export function findSimilarByText(text, threshold = 0.3, limit = 5) {
  const queryTrigrams = extractTrigrams(text);
  if (queryTrigrams.size === 0) return [];

  const memories = getAllMemoryIds.all();
  const scored = [];

  for (const mem of memories) {
    const memTrigrams = new Map(
      getTrigramsByMemory.all(mem.id).map(t => [t.trigram, t.tf])
    );

    const similarity = cosineSimilarity(queryTrigrams, memTrigrams);
    if (similarity >= threshold) {
      scored.push({
        id: mem.id,
        title: mem.title,
        category: mem.category,
        path: mem.file_path,
        similarity_score: Math.round(similarity * 1000) / 1000,
      });
    }
  }

  return scored
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);
}
