/**
 * refiner.js — Executes refinement actions
 *
 * Phase 3 of the refinement pipeline: takes analyzed actions and executes them.
 * Handles merge, upgrade, archive, and decay operations.
 * All mutations save previous versions and create links.
 */

import { db } from "../db.js";
import { createLink } from "../graph.js";
import { indexTrigrams } from "../similarity.js";

// ─── Prepared Statements ────────────────────────────────────

const getMemory = db.prepare("SELECT * FROM memories WHERE id = ?");

const saveVersion = db.prepare(`
  INSERT INTO memory_versions (memory_id, version, content, summary, changed_by)
  VALUES (?, ?, ?, ?, ?)
`);

const updateLayer = db.prepare(`
  UPDATE memories SET layer = ?, version = version + 1, updated_at = datetime('now')
  WHERE id = ?
`);

const updateImportance = db.prepare(`
  UPDATE memories SET importance = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const archiveMemory = db.prepare(`
  UPDATE memories SET layer = 'episodic', importance = 1, updated_at = datetime('now')
  WHERE id = ?
`);

const deleteMemory = db.prepare(`DELETE FROM memories WHERE id = ?`);

const deleteFts = db.prepare(`DELETE FROM memories_fts WHERE rowid = ?`);

// ─── Merge ──────────────────────────────────────────────────

/**
 * Merge a cluster of similar memories into the primary one.
 * The primary memory keeps its content; superseded ones are linked and removed.
 *
 * @param {number} primaryId - The memory to keep
 * @param {number[]} secondaryIds - Memories to merge into primary
 * @returns {{ merged: number, links_created: number }}
 */
export function executeMerge(primaryId, secondaryIds) {
  const primary = getMemory.get(primaryId);
  if (!primary) throw new Error(`Primary memory ${primaryId} not found`);

  let merged = 0;
  let linksCreated = 0;

  const txn = db.transaction(() => {
    for (const secId of secondaryIds) {
      const secondary = getMemory.get(secId);
      if (!secondary) continue;

      // Save version of secondary before deletion
      saveVersion.run(secId, secondary.version || 1, secondary.file_path, `merged into #${primaryId}`, "refiner-merge");

      // Create supersedes link
      try {
        createLink(primaryId, secId, "supersedes", 1.0);
        linksCreated++;
      } catch {
        // Link may already exist
      }

      // Remove secondary from FTS and memories
      try { deleteFts.run(secId); } catch {}
      deleteMemory.run(secId);
      merged++;
    }

    // Bump primary version
    db.prepare("UPDATE memories SET version = version + 1, updated_at = datetime('now') WHERE id = ?")
      .run(primaryId);

    // Re-index primary trigrams
    const pRow = db.prepare("SELECT title, tags, summary FROM memories WHERE id = ?").get(primaryId);
    if (pRow) {
      indexTrigrams(primaryId, `${pRow.title} ${pRow.tags} ${pRow.summary}`);
    }
  });

  txn();
  return { merged, links_created: linksCreated };
}

// ─── Upgrade ────────────────────────────────────────────────

/**
 * Upgrade a memory's layer (episodic → working → longterm).
 *
 * @param {number} memoryId
 * @param {string} targetLayer - 'working' or 'longterm'
 * @returns {{ id: number, from: string, to: string }}
 */
export function executeUpgrade(memoryId, targetLayer) {
  const memory = getMemory.get(memoryId);
  if (!memory) throw new Error(`Memory ${memoryId} not found`);

  const validTransitions = {
    episodic: "working",
    working: "longterm",
  };

  const expected = validTransitions[memory.layer];
  if (!expected || expected !== targetLayer) {
    throw new Error(`Invalid upgrade: ${memory.layer} → ${targetLayer}`);
  }

  // Save version before upgrade
  saveVersion.run(memoryId, memory.version || 1, memory.file_path, `upgraded: ${memory.layer} → ${targetLayer}`, "refiner-upgrade");

  updateLayer.run(targetLayer, memoryId);

  return { id: memoryId, from: memory.layer, to: targetLayer };
}

// ─── Archive ────────────────────────────────────────────────

/**
 * Archive a memory: set importance to 1, layer to episodic.
 *
 * @param {number} memoryId
 * @returns {{ id: number, title: string }}
 */
export function executeArchive(memoryId) {
  const memory = getMemory.get(memoryId);
  if (!memory) throw new Error(`Memory ${memoryId} not found`);

  // Save version before archiving
  saveVersion.run(memoryId, memory.version || 1, memory.file_path, "archived by pipeline", "refiner-archive");

  archiveMemory.run(memoryId);

  return { id: memoryId, title: memory.title };
}

// ─── Decay ──────────────────────────────────────────────────

/**
 * Apply importance decay to all eligible memories.
 * Rules:
 * - importance >= 8 AND layer='longterm' → exempt
 * - Decay rate slows with higher access frequency
 * - 30-day units, minimum importance = 1
 *
 * @returns {{ decayed: number, details: Array<{id, title, old_importance, new_importance}> }}
 */
export function applyDecay() {
  const candidates = db.prepare(`
    SELECT id, title, importance, layer, access_count, created_at,
           COALESCE(last_accessed, updated_at) AS last_access_date
    FROM memories
    WHERE NOT (importance >= 8 AND layer = 'longterm')
      AND importance > 1
  `).all();

  const details = [];

  const txn = db.transaction(() => {
    for (const mem of candidates) {
      const decay = calculateDecay(mem);
      if (decay <= 0) continue;

      const newImportance = Math.max(1, mem.importance - Math.floor(decay));
      if (newImportance === mem.importance) continue;

      updateImportance.run(newImportance, mem.id);
      details.push({
        id: mem.id,
        title: mem.title,
        old_importance: mem.importance,
        new_importance: newImportance,
      });
    }
  });

  txn();
  return { decayed: details.length, details };
}

/**
 * Calculate decay amount for a single memory.
 * From v2-spec §3.5.
 */
function calculateDecay(memory) {
  const lastAccess = memory.last_access_date || memory.created_at;
  const daysSince = Math.floor((Date.now() - new Date(lastAccess).getTime()) / 86400000);

  const ageInDays = Math.max(1, Math.floor((Date.now() - new Date(memory.created_at).getTime()) / 86400000));
  const accessFrequency = (memory.access_count || 0) / ageInDays;

  // Decay rate: frequently accessed memories decay slower
  const decayRate = Math.max(0.3, 1 - accessFrequency * 2);

  // 30-day unit decay
  const decayAmount = Math.floor(daysSince / 30) * decayRate;

  return Math.min(decayAmount, memory.importance - 1);
}

// ─── Full Pipeline Execution ────────────────────────────────

/**
 * Execute a batch of analyzed actions from analyzer.js.
 *
 * @param {Array<{action, targets, details}>} actions
 * @returns {{ executed: number, results: Array }}
 */
export function executeActions(actions) {
  const results = [];

  for (const action of actions) {
    try {
      switch (action.action) {
        case "merge": {
          const [primary, ...secondaries] = action.targets;
          const result = executeMerge(primary, secondaries);
          results.push({ action: "merge", success: true, ...result });
          break;
        }
        case "upgrade": {
          const detail = action.details;
          const result = executeUpgrade(action.targets[0], detail.to);
          results.push({ action: "upgrade", success: true, ...result });
          break;
        }
        case "archive": {
          const result = executeArchive(action.targets[0]);
          results.push({ action: "archive", success: true, ...result });
          break;
        }
        case "flag-contradiction": {
          // Contradictions are flagged, not auto-resolved
          results.push({
            action: "flag-contradiction",
            success: true,
            targets: action.targets,
            message: "Flagged for manual review",
          });
          break;
        }
        default:
          results.push({ action: action.action, success: false, error: `Unknown action: ${action.action}` });
      }
    } catch (e) {
      results.push({ action: action.action, success: false, error: e.message, targets: action.targets });
    }
  }

  return { executed: results.filter(r => r.success).length, results };
}

export { calculateDecay };
