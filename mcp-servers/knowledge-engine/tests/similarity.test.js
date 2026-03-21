import { describe, it, expect, beforeEach } from "vitest";
import { extractTrigrams, cosineSimilarity } from "../src/similarity.js";
import { db } from "../src/db.js";

beforeEach(() => {
  db.exec("DELETE FROM memory_trigrams");
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memory_links");
  db.exec("DELETE FROM memories");
});

describe("extractTrigrams", () => {
  it("extracts English trigrams", () => {
    const tri = extractTrigrams("hello world");
    expect(tri.has("hel")).toBe(true);
    expect(tri.has("ell")).toBe(true);
    expect(tri.has("wor")).toBe(true);
    expect(tri.size).toBeGreaterThan(0);
  });

  it("extracts Korean bigrams", () => {
    const tri = extractTrigrams("안녕하세요");
    expect(tri.has("안녕")).toBe(true);
    expect(tri.has("녕하")).toBe(true);
    expect(tri.has("하세")).toBe(true);
    expect(tri.size).toBeGreaterThan(0);
  });

  it("returns empty map for empty input", () => {
    expect(extractTrigrams("").size).toBe(0);
    expect(extractTrigrams(null).size).toBe(0);
    expect(extractTrigrams(undefined).size).toBe(0);
  });

  it("normalizes TF values to sum to 1", () => {
    const tri = extractTrigrams("test data analysis");
    const sum = Array.from(tri.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

describe("cosineSimilarity", () => {
  it("identical texts have similarity 1.0", () => {
    const a = extractTrigrams("machine learning");
    const b = extractTrigrams("machine learning");
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it("completely different texts have low similarity", () => {
    const a = extractTrigrams("quantum physics research");
    const b = extractTrigrams("chocolate cake recipe");
    expect(cosineSimilarity(a, b)).toBeLessThan(0.3);
  });

  it("similar texts have moderate similarity", () => {
    const a = extractTrigrams("machine learning deep neural networks");
    const b = extractTrigrams("deep learning neural network training");
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.3);
  });

  it("empty maps return 0", () => {
    expect(cosineSimilarity(new Map(), new Map())).toBe(0);
  });
});

describe("indexTrigrams + findSimilar", async () => {
  const { indexTrigrams, findSimilarById, findSimilarByText } = await import("../src/similarity.js");

  it("indexes and finds similar memories", () => {
    // Insert test memories
    db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
      .run("test/a.md", "knowledge", "Machine Learning Basics", "ml,ai", 5);
    const idA = db.prepare("SELECT id FROM memories WHERE file_path = ?").get("test/a.md").id;

    db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
      .run("test/b.md", "knowledge", "Deep Learning Neural Networks", "ml,deep-learning", 5);
    const idB = db.prepare("SELECT id FROM memories WHERE file_path = ?").get("test/b.md").id;

    db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
      .run("test/c.md", "projects", "Chocolate Cake Recipe", "cooking,food", 3);
    const idC = db.prepare("SELECT id FROM memories WHERE file_path = ?").get("test/c.md").id;

    // Index trigrams
    indexTrigrams(idA, "Machine Learning Basics ml ai fundamentals");
    indexTrigrams(idB, "Deep Learning Neural Networks ml deep learning training");
    indexTrigrams(idC, "Chocolate Cake Recipe cooking food baking");

    // Find similar to A
    const similar = findSimilarById(idA, 0.1, 5);
    expect(similar.length).toBeGreaterThan(0);

    // B should be more similar to A than C
    const simB = similar.find(s => s.id === idB);
    const simC = similar.find(s => s.id === idC);
    if (simB && simC) {
      expect(simB.similarity_score).toBeGreaterThan(simC.similarity_score);
    }
  });

  it("finds similar by text", () => {
    db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
      .run("test/d.md", "knowledge", "React Components Guide", "react,frontend", 5);
    const idD = db.prepare("SELECT id FROM memories WHERE file_path = ?").get("test/d.md").id;
    indexTrigrams(idD, "React Components Guide react frontend hooks state");

    const similar = findSimilarByText("react hooks tutorial", 0.1, 5);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].title).toBe("React Components Guide");
  });
});
