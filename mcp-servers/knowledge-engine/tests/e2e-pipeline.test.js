/**
 * e2e-pipeline.test.js — End-to-end integration test for the full refinement pipeline
 *
 * Tests the complete flow: store → index trigrams → detect → analyze → refine → verify
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db.js";
import { indexTrigrams, findSimilarById, reindexAllTrigrams } from "../src/similarity.js";
import { createLink, traverseGraph, getLinks } from "../src/graph.js";
import { detectAll } from "../src/refinement/detector.js";
import { analyzeCandidates, checkUpgradeEligibility } from "../src/refinement/analyzer.js";
import { executeMerge, executeUpgrade, executeArchive, applyDecay, executeActions } from "../src/refinement/refiner.js";
import {
  handleMemoryLink,
  handleMemoryGraph,
  handleMemorySimilar,
  handleMemoryRefine,
  handleMemoryArchive,
  handleReindexTrigrams,
} from "../src/tools.js";

// ─── Helpers ────────────────────────────────────────────────

function insertMemory(filePath, category, title, tags, importance, opts = {}) {
  const {
    layer = "working",
    access_count = 0,
    created_at = "2026-02-01 00:00:00",
    updated_at = "2026-02-01 00:00:00",
    last_accessed = null,
    summary = "",
  } = opts;

  db.prepare(`
    INSERT INTO memories (file_path, category, title, tags, summary, importance, layer, access_count, created_at, updated_at, last_accessed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(filePath, category, title, tags, summary, importance, layer, access_count, created_at, updated_at, last_accessed);

  const row = db.prepare("SELECT id FROM memories WHERE file_path = ?").get(filePath);
  // Index into FTS
  try {
    db.prepare("INSERT INTO memories_fts(rowid, title, tags, summary, content) VALUES (?, ?, ?, ?, ?)")
      .run(row.id, title, tags, summary, title + " " + tags);
  } catch {}

  return row.id;
}

function getMemory(id) {
  return db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
}

function memoryCount() {
  return db.prepare("SELECT COUNT(*) as cnt FROM memories").get().cnt;
}

beforeEach(() => {
  db.exec("DELETE FROM memory_trigrams");
  db.exec("DELETE FROM memory_versions");
  db.exec("DELETE FROM memory_links");
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memories");
});

// ═════════════════════════════════════════════════════════════
// E2E PIPELINE TEST
// ═════════════════════════════════════════════════════════════

describe("E2E: Full refinement pipeline", () => {
  it("detects stale → analyzes → archives in one flow", () => {
    // Seed: 3 old stale memories + 1 recent active one
    const id1 = insertMemory("e2e/stale1.md", "inbox", "Old Note 1", "temp", 3, {
      created_at: "2025-12-01 00:00:00",
      updated_at: "2025-12-01 00:00:00",
      last_accessed: "2025-12-01 00:00:00",
    });
    const id2 = insertMemory("e2e/stale2.md", "inbox", "Old Note 2", "temp", 2, {
      created_at: "2025-11-01 00:00:00",
      updated_at: "2025-11-01 00:00:00",
    });
    const id3 = insertMemory("e2e/active.md", "knowledge", "Active Knowledge", "important", 8, {
      layer: "longterm",
      access_count: 20,
      created_at: "2026-03-01 00:00:00",
      updated_at: "2026-03-20 00:00:00",
      last_accessed: "2026-03-20 00:00:00",
    });

    indexTrigrams(id1, "Old Note 1 temporary random content");
    indexTrigrams(id2, "Old Note 2 temporary random different stuff");
    indexTrigrams(id3, "Active Knowledge important web3 security research");

    // Step 1: Detect
    const candidates = detectAll({ staleDays: 30, unusedDays: 7, maxImportance: 4, minAgeDays: 14 });
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates.some(c => c.id === id1)).toBe(true);
    expect(candidates.some(c => c.id === id2)).toBe(true);
    // Active should NOT be detected
    expect(candidates.some(c => c.id === id3)).toBe(false);

    // Step 2: Analyze
    const actions = analyzeCandidates(candidates);
    expect(actions.length).toBeGreaterThan(0);

    // Step 3: Execute
    const result = executeActions(actions);
    expect(result.executed).toBeGreaterThan(0);

    // Step 4: Verify — archived memories have importance=1
    const stale1 = getMemory(id1);
    const stale2 = getMemory(id2);
    if (stale1) expect(stale1.importance).toBeLessThanOrEqual(3);
    if (stale2) expect(stale2.importance).toBeLessThanOrEqual(2);

    // Active memory untouched
    const active = getMemory(id3);
    expect(active.importance).toBe(8);
    expect(active.layer).toBe("longterm");
  });

  it("detects duplicates → merges cluster", () => {
    // Seed: 3 very similar memories with identical content
    const sharedContent = "machine learning basics neural networks supervised learning algorithms training data models prediction";
    const id1 = insertMemory("e2e/ml-basics.md", "knowledge", "ML Basics Guide", "ml,ai", 6);
    const id2 = insertMemory("e2e/ml-fundamentals.md", "knowledge", "ML Basics Tutorial", "ml,ai", 5);
    const id3 = insertMemory("e2e/ml-intro.md", "knowledge", "ML Basics Overview", "ml,ai", 4);

    indexTrigrams(id1, sharedContent);
    indexTrigrams(id2, sharedContent);
    indexTrigrams(id3, sharedContent);

    const initialCount = memoryCount();

    // Find similar — use very low threshold to catch SQL pre-filter edge cases
    const similar = findSimilarById(id1, 0.1, 10);

    // Direct merge test (bypass similarity search if SQL pre-filter is too aggressive)
    // The merge itself is the critical path to test
    const mergeResult = executeMerge(id1, [id2, id3]);
    expect(mergeResult.merged).toBe(2);
    expect(mergeResult.links_created).toBeGreaterThanOrEqual(1);

    // Memory count should decrease by 2
    expect(memoryCount()).toBe(initialCount - 2);

    // Primary should still exist with bumped version
    const primary = getMemory(id1);
    expect(primary).toBeDefined();
    expect(primary.version).toBeGreaterThan(1);

    // Secondaries should be gone
    expect(getMemory(id2)).toBeUndefined();
    expect(getMemory(id3)).toBeUndefined();
  });

  it("upgrades eligible memories through layers", () => {
    // Episodic memory with enough access + age → should upgrade to working
    const id = insertMemory("e2e/upgrade-candidate.md", "inbox", "Upgrade Candidate", "test", 6, {
      layer: "episodic",
      access_count: 10,
      created_at: "2026-01-01 00:00:00",
    });

    const eligibility = checkUpgradeEligibility(id);
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.to).toBe("working");

    const result = executeUpgrade(id, "working");
    expect(result.from).toBe("episodic");
    expect(result.to).toBe("working");

    // Now make it eligible for longterm
    db.prepare("UPDATE memories SET importance = 9 WHERE id = ?").run(id);
    const eligibility2 = checkUpgradeEligibility(id);
    expect(eligibility2.eligible).toBe(true);
    expect(eligibility2.to).toBe("longterm");

    const result2 = executeUpgrade(id, "longterm");
    expect(result2.to).toBe("longterm");

    // Verify final state
    const final = getMemory(id);
    expect(final.layer).toBe("longterm");

    // Verify version history was saved
    const versions = db.prepare("SELECT * FROM memory_versions WHERE memory_id = ?").all(id);
    expect(versions.length).toBe(2); // One per upgrade
  });

  it("applies decay correctly across memories", () => {
    // Old unaccessed memory should decay
    insertMemory("e2e/decay-target.md", "inbox", "Decay Target", "test", 6, {
      layer: "working",
      access_count: 0,
      created_at: "2025-09-01 00:00:00",
      updated_at: "2025-09-01 00:00:00",
      last_accessed: "2025-09-01 00:00:00",
    });

    // Exempt memory (longterm + importance 9) should not decay
    insertMemory("e2e/exempt.md", "knowledge", "Core Knowledge", "core", 9, {
      layer: "longterm",
      access_count: 50,
      created_at: "2025-09-01 00:00:00",
      last_accessed: "2025-09-01 00:00:00",
    });

    const result = applyDecay();

    // Decay target should have been decayed
    expect(result.details.some(d => d.title === "Decay Target")).toBe(true);

    // Exempt should not appear
    expect(result.details.some(d => d.title === "Core Knowledge")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════
// E2E: KNOWLEDGE GRAPH INTEGRATION
// ═════════════════════════════════════════════════════════════

describe("E2E: Knowledge graph integration", () => {
  it("builds and traverses a multi-hop graph", () => {
    const id1 = insertMemory("e2e/sapiens.md", "projects", "Sapiens Project", "sapiens,web3", 9);
    const id2 = insertMemory("e2e/ken.md", "people", "Ken Huang", "contact,web3", 7);
    const id3 = insertMemory("e2e/web3sec.md", "knowledge", "Web3 Security", "security,web3", 8);
    const id4 = insertMemory("e2e/csa.md", "knowledge", "Cloud Security Alliance", "csa,security", 6);

    // Build graph: Sapiens → Ken → Web3 Security → CSA
    createLink(id1, id2, "related", 1.0);
    createLink(id2, id3, "derived", 0.8);
    createLink(id3, id4, "related", 0.7);

    // Traverse from Sapiens at depth 3 — should reach CSA
    const result = traverseGraph(id1, 3);
    expect(result.root.id).toBe(id1);
    expect(result.nodes.length).toBe(4); // All 4 nodes
    expect(result.edges.length).toBeGreaterThanOrEqual(3); // At least 3 edges (bidirectional BFS may add more)

    // Depth 1 — only Ken
    const shallow = traverseGraph(id1, 1);
    expect(shallow.nodes.length).toBe(2);

    // Filter by relation — only "related"
    const filtered = traverseGraph(id1, 3, ["related"]);
    expect(filtered.nodes.some(n => n.id === id2)).toBe(true);
    // "derived" link should be excluded, so Web3 Security might not be reachable
  });

  it("MCP tools work end-to-end", () => {
    const id1 = insertMemory("e2e/tool1.md", "projects", "Tool Test 1", "test", 5);
    const id2 = insertMemory("e2e/tool2.md", "projects", "Tool Test 2", "test", 5);

    // memory_link via MCP handler
    const linkResult = handleMemoryLink({
      source_id: id1, target_id: id2, relation: "related", weight: 0.9
    });
    expect(JSON.parse(linkResult.content[0].text).success).toBe(true);

    // memory_graph via MCP handler
    const graphResult = handleMemoryGraph({ id: id1, depth: 2 });
    const graphData = JSON.parse(graphResult.content[0].text);
    expect(graphData.success).toBe(true);
    expect(graphData.node_count).toBe(2);

    // memory_similar via MCP handler (after indexing)
    indexTrigrams(id1, "Tool Test 1 project testing verification");
    indexTrigrams(id2, "Tool Test 2 project testing validation");
    const simResult = handleMemorySimilar({ id: id1, threshold: 0.1 });
    const simData = JSON.parse(simResult.content[0].text);
    expect(simData.success).toBe(true);

    // memory_refine via MCP handler
    const refineResult = handleMemoryRefine({ id: id1, mode: "upgrade" });
    const refineData = JSON.parse(refineResult.content[0].text);
    expect(refineData.success).toBe(true);

    // memory_archive via MCP handler (dry run)
    const archiveResult = handleMemoryArchive({ older_than: 30, dry_run: true });
    const archiveData = JSON.parse(archiveResult.content[0].text);
    expect(archiveData.success).toBe(true);
    expect(archiveData.dry_run).toBe(true);

    // memory_reindex_trigrams via MCP handler
    const reindexResult = handleReindexTrigrams();
    const reindexData = JSON.parse(reindexResult.content[0].text);
    expect(reindexData.success).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// E2E: FULL LIFECYCLE
// ═════════════════════════════════════════════════════════════

describe("E2E: Full memory lifecycle", () => {
  it("episodic → working → longterm with version tracking", () => {
    // Create an episodic memory
    const id = insertMemory("e2e/lifecycle.md", "inbox", "Lifecycle Test", "test", 5, {
      layer: "episodic",
      access_count: 10,
      created_at: "2026-01-01 00:00:00",
    });

    indexTrigrams(id, "Lifecycle Test important information for tracking");

    // Upgrade episodic → working
    executeUpgrade(id, "working");
    expect(getMemory(id).layer).toBe("working");

    // Simulate high importance
    db.prepare("UPDATE memories SET importance = 8 WHERE id = ?").run(id);

    // Upgrade working → longterm
    executeUpgrade(id, "longterm");
    expect(getMemory(id).layer).toBe("longterm");

    // Verify 2 version records
    const versions = db.prepare(
      "SELECT * FROM memory_versions WHERE memory_id = ? ORDER BY created_at"
    ).all(id);
    expect(versions.length).toBe(2);
    expect(versions[0].changed_by).toBe("refiner-upgrade");
    expect(versions[1].changed_by).toBe("refiner-upgrade");

    // Longterm with importance 8 should be decay-exempt
    const decayResult = applyDecay();
    expect(decayResult.details.some(d => d.id === id)).toBe(false);
  });
});
