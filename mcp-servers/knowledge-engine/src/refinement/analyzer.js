/**
 * analyzer.js — Duplicate clustering & contradiction detection
 *
 * Phase 2 of the refinement pipeline: analyzes candidates from detector.js
 * to recommend merge, archive, upgrade, or flag-contradiction actions.
 */

import { db } from "../db.js";
import { findSimilarById } from "../similarity.js";

// ─── Prepared Statements ────────────────────────────────────

const getMemory = db.prepare("SELECT * FROM memories WHERE id = ?");

const getCategoryMemories = db.prepare(`
  SELECT id, title, category, importance, layer, tags
  FROM memories
  WHERE category = ? AND id != ?
`);

// ─── Clustering ─────────────────────────────────────────────

/**
 * Find clusters of similar memories within the same category.
 * @param {number} memoryId - The candidate memory ID
 * @param {number} threshold - Similarity threshold for clustering (default 0.6)
 * @returns {{ clusterId: number, members: Array<{id, title, similarity_score}> } | null}
 */
export function findCluster(memoryId, threshold = 0.6) {
  const similar = findSimilarById(memoryId, threshold, 10);
  if (similar.length === 0) return null;

  const memory = getMemory.get(memoryId);
  if (!memory) return null;

  // Filter to same category for tighter clusters
  const sameCategory = similar.filter(s => s.category === memory.category);

  if (sameCategory.length === 0) return null;

  return {
    clusterId: memoryId,
    members: sameCategory.map(s => ({
      id: s.id,
      title: s.title,
      similarity_score: s.similarity_score,
    })),
  };
}

// ─── Contradiction Detection ────────────────────────────────

/**
 * Detect potential contradictions: memories with same tags but
 * overlapping content that might conflict.
 * Uses trigram similarity + tag overlap as a heuristic.
 *
 * @param {number} memoryId - Memory to check
 * @returns {Array<{id, title, reason}>}
 */
export function detectContradictions(memoryId) {
  const memory = getMemory.get(memoryId);
  if (!memory) return [];

  const memTags = (memory.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  if (memTags.length === 0) return [];

  // Find similar memories with moderate threshold
  const similar = findSimilarById(memoryId, 0.3, 15);
  const contradictions = [];

  for (const s of similar) {
    const other = getMemory.get(s.id);
    if (!other) continue;

    const otherTags = (other.tags || "").split(",").map(t => t.trim()).filter(Boolean);
    const tagOverlap = memTags.filter(t => otherTags.includes(t));

    // Same tags + moderate similarity = potential contradiction
    // (high similarity → duplicate, moderate → could be conflicting info)
    if (tagOverlap.length > 0 && s.similarity_score >= 0.3 && s.similarity_score < 0.7) {
      contradictions.push({
        id: s.id,
        title: s.title,
        shared_tags: tagOverlap,
        similarity: s.similarity_score,
        reason: "tag-overlap-with-moderate-similarity",
      });
    }
  }

  return contradictions;
}

// ─── Upgrade Detection ──────────────────────────────────────

/**
 * Check if a memory qualifies for layer upgrade.
 * Rules from spec:
 *   episodic → working: access_count > 5 AND age > 7 days
 *   working → longterm: importance ≥ 7 OR access_count > 10
 *
 * @param {number} memoryId
 * @returns {{ eligible: boolean, from: string, to: string, reason: string } | null}
 */
export function checkUpgradeEligibility(memoryId) {
  const memory = getMemory.get(memoryId);
  if (!memory) return null;

  const ageDays = Math.floor(
    (Date.now() - new Date(memory.created_at).getTime()) / 86400000
  );

  if (memory.layer === "episodic") {
    if (memory.access_count > 5 && ageDays > 7) {
      return {
        eligible: true,
        from: "episodic",
        to: "working",
        reason: `access_count=${memory.access_count} > 5, age=${ageDays}d > 7d`,
      };
    }
  }

  if (memory.layer === "working") {
    if (memory.importance >= 7) {
      return {
        eligible: true,
        from: "working",
        to: "longterm",
        reason: `importance=${memory.importance} >= 7`,
      };
    }
    if (memory.access_count > 10) {
      return {
        eligible: true,
        from: "working",
        to: "longterm",
        reason: `access_count=${memory.access_count} > 10`,
      };
    }
  }

  return { eligible: false, from: memory.layer, to: memory.layer, reason: "does not meet upgrade criteria" };
}

// ─── Full Analysis ──────────────────────────────────────────

/**
 * Analyze a list of candidates and produce recommended actions.
 *
 * @param {Array<{id, reason}>} candidates - From detector.js
 * @param {Object} opts
 * @param {number} opts.mergeThreshold - Similarity threshold for merge (default 0.6)
 * @returns {Array<{action, targets, details}>}
 */
export function analyzeCandidates(candidates, opts = {}) {
  const { mergeThreshold = 0.6 } = opts;
  const actions = [];
  const processedClusters = new Set();

  for (const candidate of candidates) {
    // 1. Check for merge clusters
    const cluster = findCluster(candidate.id, mergeThreshold);
    if (cluster && !processedClusters.has(candidate.id)) {
      // Mark all cluster members as processed
      processedClusters.add(candidate.id);
      for (const m of cluster.members) processedClusters.add(m.id);

      actions.push({
        action: "merge",
        targets: [candidate.id, ...cluster.members.map(m => m.id)],
        details: {
          cluster_size: cluster.members.length + 1,
          members: cluster.members,
        },
      });
      continue;
    }

    // 2. Check for upgrade eligibility
    const upgrade = checkUpgradeEligibility(candidate.id);
    if (upgrade && upgrade.eligible) {
      actions.push({
        action: "upgrade",
        targets: [candidate.id],
        details: upgrade,
      });
      continue;
    }

    // 3. Check for contradictions
    const contradictions = detectContradictions(candidate.id);
    if (contradictions.length > 0) {
      actions.push({
        action: "flag-contradiction",
        targets: [candidate.id, ...contradictions.map(c => c.id)],
        details: { contradictions },
      });
      continue;
    }

    // 4. Default: archive (stale/unused/low-importance with no better action)
    if (candidate.reason === "stale" || candidate.reason === "unused") {
      actions.push({
        action: "archive",
        targets: [candidate.id],
        details: { reason: candidate.reason, age_days: candidate.age_days },
      });
    }
  }

  return actions;
}
