/**
 * detector.js — Staleness & underuse detection queries
 *
 * Phase 1 of the refinement pipeline: identifies memories that need attention.
 * Outputs a candidate list with reasons for each.
 */

import { db } from "../db.js";

// ─── Detection Queries ──────────────────────────────────────

const staleQuery = db.prepare(`
  SELECT id, title, category, importance, layer, access_count,
         CAST(julianday('now') - julianday(COALESCE(last_accessed, updated_at)) AS INTEGER) AS age_days
  FROM memories
  WHERE CAST(julianday('now') - julianday(COALESCE(last_accessed, updated_at)) AS INTEGER) > ?
    AND layer != 'longterm'
  ORDER BY age_days DESC
`);

const unusedQuery = db.prepare(`
  SELECT id, title, category, importance, layer, access_count,
         CAST(julianday('now') - julianday(created_at) AS INTEGER) AS age_days
  FROM memories
  WHERE access_count = 0
    AND CAST(julianday('now') - julianday(created_at) AS INTEGER) > ?
  ORDER BY age_days DESC
`);

const lowImportanceQuery = db.prepare(`
  SELECT id, title, category, importance, layer, access_count,
         CAST(julianday('now') - julianday(created_at) AS INTEGER) AS age_days
  FROM memories
  WHERE importance < ?
    AND CAST(julianday('now') - julianday(created_at) AS INTEGER) > ?
  ORDER BY importance ASC, age_days DESC
`);

// ─── Public API ─────────────────────────────────────────────

/**
 * Detect stale memories (not accessed in N days, excluding longterm).
 * @param {number} staleDays - Days since last access (default 30)
 * @returns {Array<{id, title, category, importance, layer, age_days, reason}>}
 */
export function detectStale(staleDays = 30) {
  return staleQuery.all(staleDays).map(r => ({
    ...r,
    reason: "stale",
  }));
}

/**
 * Detect unused memories (zero access, older than N days).
 * @param {number} unusedDays - Minimum age in days (default 7)
 * @returns {Array<{id, title, category, importance, layer, age_days, reason}>}
 */
export function detectUnused(unusedDays = 7) {
  return unusedQuery.all(unusedDays).map(r => ({
    ...r,
    reason: "unused",
  }));
}

/**
 * Detect low-importance memories older than N days.
 * @param {number} maxImportance - Importance threshold (default 4)
 * @param {number} minAgeDays - Minimum age in days (default 14)
 * @returns {Array<{id, title, category, importance, layer, age_days, reason}>}
 */
export function detectLowImportance(maxImportance = 4, minAgeDays = 14) {
  return lowImportanceQuery.all(maxImportance, minAgeDays).map(r => ({
    ...r,
    reason: "low-importance",
  }));
}

/**
 * Run all detectors and return a deduplicated candidate list.
 * @param {Object} opts - Detection thresholds
 * @param {number} opts.staleDays - Days for stale detection (default 30)
 * @param {number} opts.unusedDays - Days for unused detection (default 7)
 * @param {number} opts.maxImportance - Importance threshold (default 4)
 * @param {number} opts.minAgeDays - Min age for low-importance (default 14)
 * @returns {Array<{id, title, category, importance, layer, age_days, reason}>}
 */
export function detectAll(opts = {}) {
  const {
    staleDays = 30,
    unusedDays = 7,
    maxImportance = 4,
    minAgeDays = 14,
  } = opts;

  const seen = new Set();
  const candidates = [];

  const addUnique = (items) => {
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        candidates.push(item);
      }
    }
  };

  addUnique(detectStale(staleDays));
  addUnique(detectUnused(unusedDays));
  addUnique(detectLowImportance(maxImportance, minAgeDays));

  return candidates;
}
