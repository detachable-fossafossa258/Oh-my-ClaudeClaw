import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { db, MEMORY_ROOT } from "../src/db.js";
import { ensureDirectories } from "../src/file-store.js";
import { associativeSearch, indexMemory } from "../src/search.js";

function cleanAll() {
  try { db.exec("DELETE FROM memory_trigrams"); } catch {}
  try { db.exec("DELETE FROM memory_versions"); } catch {}
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memory_links");
  db.exec("DELETE FROM memories");
  const categories = ["inbox", "projects", "people", "knowledge", "daily-logs", "tasks"];
  for (const cat of categories) {
    const dir = path.join(MEMORY_ROOT, cat);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  ensureDirectories();
}

beforeEach(() => {
  cleanAll();
});

function seedData() {
  indexMemory("knowledge/react.md", "knowledge", null, "React Hooks Guide", "react,hooks,frontend", "React Hooks patterns", "Complete guide to React hooks including useState useEffect useContext", 7);
  indexMemory("knowledge/vue.md", "knowledge", null, "Vue Composition API", "vue,frontend", "Vue 3 composition API", "Vue composition API with ref reactive computed watch", 6);
  indexMemory("projects/sapiens.md", "projects", "sapiens", "Sapiens Architecture", "sapiens,web3,security", "Sapiens system design", "Smart contract auditing AI agent architecture design", 9);
  indexMemory("inbox/note.md", "inbox", null, "Quick Note", "temp", "temporary note", "Just a temporary note to remember", 3);
  indexMemory("people/ken.md", "people", null, "Ken Huang", "contact,web3", "Web3 security researcher", "Ken Huang is a Web3 security researcher and advisor", 7);
}

describe("associativeSearch", () => {
  describe("basic functionality", () => {
    it("returns results with FTS signal", () => {
      seedData();
      const results = associativeSearch("React", {}, 10);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe("React Hooks Guide");
      expect(results[0].matched_signals).toContain("fts");
      expect(results[0].relevance_score).toBeGreaterThanOrEqual(1.0);
    });

    it("returns empty for no matches", () => {
      seedData();
      const results = associativeSearch("zzzznonexistent12345", {}, 10);
      expect(results.length).toBe(0);
    });

    it("respects limit parameter", () => {
      seedData();
      const results = associativeSearch("", { tags: ["frontend", "web3", "sapiens"] }, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("multi-signal ranking", () => {
    it("boosts results matching multiple signals", () => {
      seedData();

      // Search with both FTS and tag signals — React should score higher
      const results = associativeSearch("React", { tags: ["frontend"] }, 10);
      expect(results.length).toBeGreaterThan(0);

      const react = results.find(r => r.title === "React Hooks Guide");
      expect(react).toBeDefined();
      expect(react.matched_signals.length).toBeGreaterThanOrEqual(1);
    });

    it("tag-only search works without query", () => {
      seedData();
      const results = associativeSearch("", { tags: ["web3"] }, 10);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.matched_signals.includes("tag"))).toBe(true);
    });
  });

  describe("graph signal", () => {
    it("includes graph neighbors when related_id is provided", () => {
      seedData();

      // Create a link between Sapiens and Ken
      const sapiens = db.prepare("SELECT id FROM memories WHERE title = ?").get("Sapiens Architecture");
      const ken = db.prepare("SELECT id FROM memories WHERE title = ?").get("Ken Huang");

      db.prepare("INSERT OR REPLACE INTO memory_links (source_id, target_id, relation, weight) VALUES (?, ?, ?, ?)")
        .run(sapiens.id, ken.id, "related", 1.0);

      const results = associativeSearch("", { related_id: sapiens.id }, 10);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.title === "Ken Huang")).toBe(true);
      expect(results.find(r => r.title === "Ken Huang").matched_signals).toContain("graph");
    });
  });

  describe("temporal signal", () => {
    it("includes temporally proximate results when date is provided", () => {
      seedData();
      const today = new Date().toISOString().slice(0, 10);

      const results = associativeSearch("", { date: today }, 10);
      // All seeded data was just inserted, so should match today
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.matched_signals.includes("temporal"))).toBe(true);
    });
  });

  describe("combined signals", () => {
    it("combines FTS + tag + temporal for highest scores", () => {
      seedData();
      const today = new Date().toISOString().slice(0, 10);

      const results = associativeSearch("React", { tags: ["frontend"], date: today }, 10);
      expect(results.length).toBeGreaterThan(0);

      const react = results.find(r => r.title === "React Hooks Guide");
      expect(react).toBeDefined();
      // Should have at least 2 signals (fts + tag or fts + temporal)
      expect(react.matched_signals.length).toBeGreaterThanOrEqual(2);
      // Higher score from multiple signals
      expect(react.relevance_score).toBeGreaterThan(1.0);
    });
  });

  describe("backward compatibility", () => {
    it("standard search still works (non-associative)", async () => {
      seedData();
      const { handleMemorySearch } = await import("../src/tools.js");

      const result = handleMemorySearch({ query: "React", limit: 10 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.count).toBeGreaterThan(0);
      expect(parsed.mode).toBeUndefined(); // No mode in standard search
    });

    it("associative search via handler returns mode field", async () => {
      seedData();
      const { handleMemorySearch } = await import("../src/tools.js");

      const result = handleMemorySearch({
        query: "React",
        associative: true,
        context: { tags: ["frontend"] },
        limit: 10,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.mode).toBe("associative");
      expect(parsed.results[0].matched_signals).toBeDefined();
    });
  });
});
