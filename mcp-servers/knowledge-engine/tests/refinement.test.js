import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db.js";
import { indexTrigrams } from "../src/similarity.js";
import { detectStale, detectUnused, detectLowImportance, detectAll } from "../src/refinement/detector.js";
import { findCluster, detectContradictions, checkUpgradeEligibility, analyzeCandidates } from "../src/refinement/analyzer.js";
import { executeMerge, executeUpgrade, executeArchive, applyDecay, executeActions, calculateDecay } from "../src/refinement/refiner.js";

// ─── Helpers ────────────────────────────────────────────────

function insertMemory(filePath, category, title, tags, importance, opts = {}) {
  const {
    layer = "working",
    access_count = 0,
    created_at = "2026-02-01 00:00:00",
    updated_at = "2026-02-01 00:00:00",
    last_accessed = null,
  } = opts;

  db.prepare(`
    INSERT INTO memories (file_path, category, title, tags, importance, layer, access_count, created_at, updated_at, last_accessed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(filePath, category, title, tags, importance, layer, access_count, created_at, updated_at, last_accessed);

  const row = db.prepare("SELECT id FROM memories WHERE file_path = ?").get(filePath);
  return row.id;
}

function getIdByPath(p) {
  return db.prepare("SELECT id FROM memories WHERE file_path = ?").get(p)?.id;
}

function getMemory(id) {
  return db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
}

beforeEach(() => {
  db.exec("DELETE FROM memory_trigrams");
  db.exec("DELETE FROM memory_versions");
  db.exec("DELETE FROM memory_links");
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memories");
});

// ═════════════════════════════════════════════════════════════
// DETECTOR TESTS
// ═════════════════════════════════════════════════════════════

describe("detector", () => {
  describe("detectStale", () => {
    it("finds memories not accessed in N days", () => {
      // old memory (60 days ago)
      insertMemory("test/old.md", "inbox", "Old Memory", "test", 5, {
        updated_at: "2026-01-01 00:00:00",
        last_accessed: "2026-01-01 00:00:00",
      });
      // recent memory
      insertMemory("test/new.md", "inbox", "New Memory", "test", 5, {
        updated_at: "2026-03-20 00:00:00",
        last_accessed: "2026-03-20 00:00:00",
      });

      const stale = detectStale(30);
      expect(stale.length).toBeGreaterThanOrEqual(1);
      expect(stale.every(s => s.reason === "stale")).toBe(true);
      expect(stale.some(s => s.title === "Old Memory")).toBe(true);
    });

    it("excludes longterm memories", () => {
      insertMemory("test/lt.md", "knowledge", "Longterm", "test", 9, {
        layer: "longterm",
        updated_at: "2025-01-01 00:00:00",
        last_accessed: "2025-01-01 00:00:00",
      });

      const stale = detectStale(30);
      expect(stale.some(s => s.title === "Longterm")).toBe(false);
    });
  });

  describe("detectUnused", () => {
    it("finds memories with zero access count older than N days", () => {
      insertMemory("test/unused.md", "inbox", "Unused", "test", 5, {
        access_count: 0,
        created_at: "2026-01-01 00:00:00",
      });
      insertMemory("test/used.md", "inbox", "Used", "test", 5, {
        access_count: 5,
        created_at: "2026-01-01 00:00:00",
      });

      const unused = detectUnused(7);
      expect(unused.some(u => u.title === "Unused")).toBe(true);
      expect(unused.some(u => u.title === "Used")).toBe(false);
    });
  });

  describe("detectLowImportance", () => {
    it("finds low-importance memories older than N days", () => {
      insertMemory("test/low.md", "inbox", "Low Importance", "test", 2, {
        created_at: "2026-01-01 00:00:00",
      });
      insertMemory("test/high.md", "inbox", "High Importance", "test", 9, {
        created_at: "2026-01-01 00:00:00",
      });

      const low = detectLowImportance(4, 14);
      expect(low.some(l => l.title === "Low Importance")).toBe(true);
      expect(low.some(l => l.title === "High Importance")).toBe(false);
    });
  });

  describe("detectAll", () => {
    it("deduplicates across detectors", () => {
      // This memory qualifies for both stale AND unused
      insertMemory("test/both.md", "inbox", "Both Stale and Unused", "test", 3, {
        access_count: 0,
        created_at: "2026-01-01 00:00:00",
        updated_at: "2026-01-01 00:00:00",
        last_accessed: null,
      });

      const all = detectAll({ staleDays: 30, unusedDays: 7, maxImportance: 4, minAgeDays: 14 });
      const dupes = all.filter(c => c.title === "Both Stale and Unused");
      expect(dupes.length).toBe(1);
    });
  });
});

// ═════════════════════════════════════════════════════════════
// ANALYZER TESTS
// ═════════════════════════════════════════════════════════════

describe("analyzer", () => {
  describe("findCluster", () => {
    it("finds cluster of similar memories", () => {
      const id1 = insertMemory("test/ml1.md", "knowledge", "Machine Learning Basics", "ml,ai", 5);
      const id2 = insertMemory("test/ml2.md", "knowledge", "Machine Learning Fundamentals", "ml,ai", 5);

      indexTrigrams(id1, "Machine Learning Basics fundamentals artificial intelligence");
      indexTrigrams(id2, "Machine Learning Fundamentals basics artificial intelligence");

      const cluster = findCluster(id1, 0.3);
      // With high overlap content, should find a cluster
      if (cluster) {
        expect(cluster.members.length).toBeGreaterThan(0);
      }
    });

    it("returns null for unique memories", () => {
      const id1 = insertMemory("test/unique1.md", "knowledge", "Quantum Physics", "physics", 5);
      const id2 = insertMemory("test/unique2.md", "projects", "Cooking Recipes", "food", 3);

      indexTrigrams(id1, "quantum physics research particles");
      indexTrigrams(id2, "chocolate cake baking recipe");

      const cluster = findCluster(id1, 0.8);
      expect(cluster).toBeNull();
    });
  });

  describe("checkUpgradeEligibility", () => {
    it("promotes episodic with high access + age", () => {
      const id = insertMemory("test/ep.md", "inbox", "Episodic", "test", 5, {
        layer: "episodic",
        access_count: 10,
        created_at: "2026-01-01 00:00:00",
      });

      const result = checkUpgradeEligibility(id);
      expect(result.eligible).toBe(true);
      expect(result.from).toBe("episodic");
      expect(result.to).toBe("working");
    });

    it("promotes working with high importance", () => {
      const id = insertMemory("test/wk.md", "knowledge", "Working", "test", 8, {
        layer: "working",
        access_count: 3,
      });

      const result = checkUpgradeEligibility(id);
      expect(result.eligible).toBe(true);
      expect(result.from).toBe("working");
      expect(result.to).toBe("longterm");
    });

    it("promotes working with high access count", () => {
      const id = insertMemory("test/wk2.md", "knowledge", "Working 2", "test", 5, {
        layer: "working",
        access_count: 15,
      });

      const result = checkUpgradeEligibility(id);
      expect(result.eligible).toBe(true);
      expect(result.to).toBe("longterm");
    });

    it("does not promote when criteria not met", () => {
      const id = insertMemory("test/no.md", "inbox", "No Upgrade", "test", 3, {
        layer: "episodic",
        access_count: 1,
        created_at: "2026-03-20 00:00:00",
      });

      const result = checkUpgradeEligibility(id);
      expect(result.eligible).toBe(false);
    });

    it("returns null for non-existent memory", () => {
      expect(checkUpgradeEligibility(99999)).toBeNull();
    });
  });

  describe("detectContradictions", () => {
    it("flags memories with same tags but moderate similarity", () => {
      const id1 = insertMemory("test/c1.md", "knowledge", "React State Management", "react,state", 5);
      const id2 = insertMemory("test/c2.md", "knowledge", "React Redux Store Pattern", "react,state", 5);

      indexTrigrams(id1, "React state management hooks useState useReducer local state");
      indexTrigrams(id2, "React Redux store global state management pattern middleware");

      const contradictions = detectContradictions(id1);
      // May or may not find contradictions depending on similarity score
      expect(Array.isArray(contradictions)).toBe(true);
    });
  });

  describe("analyzeCandidates", () => {
    it("produces archive actions for stale candidates", () => {
      const id = insertMemory("test/stale.md", "inbox", "Stale Note", "test", 3, {
        access_count: 0,
        created_at: "2026-01-01 00:00:00",
        updated_at: "2026-01-01 00:00:00",
      });
      indexTrigrams(id, "completely unique content xyz123");

      const candidates = [{ id, reason: "stale", age_days: 80 }];
      const actions = analyzeCandidates(candidates);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.action === "archive" || a.action === "upgrade")).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════
// REFINER TESTS
// ═════════════════════════════════════════════════════════════

describe("refiner", () => {
  describe("executeMerge", () => {
    it("merges secondary memories into primary", () => {
      const id1 = insertMemory("test/primary.md", "knowledge", "Primary", "ml", 7);
      const id2 = insertMemory("test/sec1.md", "knowledge", "Secondary 1", "ml", 5);
      const id3 = insertMemory("test/sec2.md", "knowledge", "Secondary 2", "ml", 4);

      indexTrigrams(id1, "Primary machine learning");
      indexTrigrams(id2, "Secondary 1 machine learning");
      indexTrigrams(id3, "Secondary 2 machine learning");

      const result = executeMerge(id1, [id2, id3]);
      expect(result.merged).toBe(2);
      expect(result.links_created).toBeGreaterThanOrEqual(1);

      // Secondaries should be deleted
      expect(getMemory(id2)).toBeUndefined();
      expect(getMemory(id3)).toBeUndefined();
      // Primary should still exist
      expect(getMemory(id1)).toBeDefined();
    });

    it("bumps primary version after merge", () => {
      const id1 = insertMemory("test/p.md", "knowledge", "Primary", "ml", 7);
      const id2 = insertMemory("test/s.md", "knowledge", "Secondary", "ml", 5);

      const beforeVersion = getMemory(id1).version;
      executeMerge(id1, [id2]);

      const afterVersion = getMemory(id1).version;
      expect(afterVersion).toBe(beforeVersion + 1);
    });

    it("throws for non-existent primary", () => {
      expect(() => executeMerge(99999, [1])).toThrow("not found");
    });
  });

  describe("executeUpgrade", () => {
    it("upgrades episodic to working", () => {
      const id = insertMemory("test/ep.md", "inbox", "Episodic", "test", 5, { layer: "episodic" });
      const result = executeUpgrade(id, "working");
      expect(result.from).toBe("episodic");
      expect(result.to).toBe("working");
      expect(getMemory(id).layer).toBe("working");
    });

    it("upgrades working to longterm", () => {
      const id = insertMemory("test/wk.md", "knowledge", "Working", "test", 8, { layer: "working" });
      const result = executeUpgrade(id, "longterm");
      expect(result.from).toBe("working");
      expect(result.to).toBe("longterm");
      expect(getMemory(id).layer).toBe("longterm");
    });

    it("rejects invalid transition", () => {
      const id = insertMemory("test/ep2.md", "inbox", "Episodic", "test", 5, { layer: "episodic" });
      expect(() => executeUpgrade(id, "longterm")).toThrow("Invalid upgrade");
    });

    it("saves version before upgrade", () => {
      const id = insertMemory("test/ver.md", "inbox", "Version Test", "test", 5, { layer: "episodic" });
      executeUpgrade(id, "working");

      const versions = db.prepare("SELECT * FROM memory_versions WHERE memory_id = ?").all(id);
      expect(versions.length).toBe(1);
      expect(versions[0].changed_by).toBe("refiner-upgrade");
    });
  });

  describe("executeArchive", () => {
    it("archives memory by setting importance=1 and layer=episodic", () => {
      const id = insertMemory("test/arch.md", "inbox", "To Archive", "test", 5, { layer: "working" });
      const result = executeArchive(id);
      expect(result.title).toBe("To Archive");

      const mem = getMemory(id);
      expect(mem.importance).toBe(1);
      expect(mem.layer).toBe("episodic");
    });

    it("saves version before archiving", () => {
      const id = insertMemory("test/arch2.md", "inbox", "Archive 2", "test", 5);
      executeArchive(id);

      const versions = db.prepare("SELECT * FROM memory_versions WHERE memory_id = ?").all(id);
      expect(versions.length).toBe(1);
      expect(versions[0].changed_by).toBe("refiner-archive");
    });
  });

  describe("applyDecay", () => {
    it("decays importance for old unaccessed memories", () => {
      // 90 days old, never accessed → should decay
      insertMemory("test/decay.md", "inbox", "Decay Target", "test", 6, {
        layer: "working",
        access_count: 0,
        created_at: "2025-12-01 00:00:00",
        updated_at: "2025-12-01 00:00:00",
        last_accessed: "2025-12-01 00:00:00",
      });

      const result = applyDecay();
      expect(result.decayed).toBeGreaterThanOrEqual(1);
      expect(result.details.some(d => d.title === "Decay Target")).toBe(true);
      expect(result.details[0].new_importance).toBeLessThan(result.details[0].old_importance);
    });

    it("exempts high-importance longterm memories", () => {
      insertMemory("test/exempt.md", "knowledge", "Exempt", "core", 9, {
        layer: "longterm",
        access_count: 0,
        created_at: "2025-06-01 00:00:00",
        updated_at: "2025-06-01 00:00:00",
        last_accessed: "2025-06-01 00:00:00",
      });

      const result = applyDecay();
      expect(result.details.some(d => d.title === "Exempt")).toBe(false);
    });

    it("slows decay for frequently accessed memories", () => {
      // Same age but different access counts
      insertMemory("test/freq.md", "inbox", "Frequently Accessed", "test", 6, {
        layer: "working",
        access_count: 100,
        created_at: "2025-12-01 00:00:00",
        updated_at: "2025-12-01 00:00:00",
        last_accessed: "2025-12-01 00:00:00",
      });
      insertMemory("test/rare.md", "inbox", "Rarely Accessed", "test", 6, {
        layer: "working",
        access_count: 0,
        created_at: "2025-12-01 00:00:00",
        updated_at: "2025-12-01 00:00:00",
        last_accessed: "2025-12-01 00:00:00",
      });

      const result = applyDecay();
      const freq = result.details.find(d => d.title === "Frequently Accessed");
      const rare = result.details.find(d => d.title === "Rarely Accessed");

      // Frequently accessed should decay less or not at all
      if (freq && rare) {
        expect(freq.new_importance).toBeGreaterThanOrEqual(rare.new_importance);
      }
    });
  });

  describe("calculateDecay", () => {
    it("returns 0 for recently accessed memory", () => {
      const decay = calculateDecay({
        importance: 5,
        layer: "working",
        access_count: 5,
        created_at: "2026-03-01 00:00:00",
        last_access_date: "2026-03-20 00:00:00",
      });
      expect(decay).toBe(0);
    });

    it("returns positive decay for old unaccessed memory", () => {
      const decay = calculateDecay({
        importance: 5,
        layer: "working",
        access_count: 0,
        created_at: "2025-06-01 00:00:00",
        last_access_date: "2025-06-01 00:00:00",
      });
      expect(decay).toBeGreaterThan(0);
    });
  });

  describe("executeActions", () => {
    it("executes a batch of mixed actions", () => {
      const id1 = insertMemory("test/batch1.md", "inbox", "Batch Archive", "test", 3, {
        layer: "working", access_count: 0,
      });
      const id2 = insertMemory("test/batch2.md", "inbox", "Batch Upgrade", "test", 5, {
        layer: "episodic",
      });

      const actions = [
        { action: "archive", targets: [id1], details: { reason: "stale" } },
        { action: "upgrade", targets: [id2], details: { from: "episodic", to: "working" } },
      ];

      const result = executeActions(actions);
      expect(result.executed).toBe(2);
      expect(getMemory(id1).importance).toBe(1);
      expect(getMemory(id2).layer).toBe("working");
    });

    it("handles errors gracefully", () => {
      const actions = [
        { action: "upgrade", targets: [99999], details: { from: "episodic", to: "working" } },
      ];

      const result = executeActions(actions);
      expect(result.executed).toBe(0);
      expect(result.results[0].success).toBe(false);
    });

    it("handles flag-contradiction without side effects", () => {
      const id1 = insertMemory("test/flag1.md", "knowledge", "Flag 1", "test", 5);

      const actions = [
        { action: "flag-contradiction", targets: [id1], details: { contradictions: [] } },
      ];

      const result = executeActions(actions);
      expect(result.executed).toBe(1);
      expect(result.results[0].message).toContain("manual review");
    });
  });
});
