import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db.js";
import { createLink, removeLink, getLinks, traverseGraph } from "../src/graph.js";

beforeEach(() => {
  db.exec("DELETE FROM memory_links");
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memories");

  // Insert test memories
  db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
    .run("test/node1.md", "projects", "Node 1 - Sapiens", "sapiens", 8);
  db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
    .run("test/node2.md", "people", "Node 2 - Ken Huang", "contact", 7);
  db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
    .run("test/node3.md", "knowledge", "Node 3 - Web3 Security", "security", 6);
  db.prepare("INSERT INTO memories (file_path, category, title, tags, importance) VALUES (?, ?, ?, ?, ?)")
    .run("test/node4.md", "projects", "Node 4 - NEXUS", "nexus", 5);
});

function getIdByPath(p) {
  return db.prepare("SELECT id FROM memories WHERE file_path = ?").get(p).id;
}

describe("createLink", () => {
  it("creates a link between two memories", () => {
    const id1 = getIdByPath("test/node1.md");
    const id2 = getIdByPath("test/node2.md");
    const link = createLink(id1, id2, "related");
    expect(link.source_id).toBe(id1);
    expect(link.target_id).toBe(id2);
    expect(link.relation).toBe("related");
    expect(link.weight).toBe(1.0);
  });

  it("creates a link with custom weight", () => {
    const id1 = getIdByPath("test/node1.md");
    const id3 = getIdByPath("test/node3.md");
    const link = createLink(id1, id3, "derived", 0.7);
    expect(link.weight).toBe(0.7);
  });

  it("throws on invalid source", () => {
    const id2 = getIdByPath("test/node2.md");
    expect(() => createLink(9999, id2, "related")).toThrow("Source memory 9999 not found");
  });

  it("throws on invalid target", () => {
    const id1 = getIdByPath("test/node1.md");
    expect(() => createLink(id1, 9999, "related")).toThrow("Target memory 9999 not found");
  });
});

describe("removeLink", () => {
  it("removes an existing link", () => {
    const id1 = getIdByPath("test/node1.md");
    const id2 = getIdByPath("test/node2.md");
    createLink(id1, id2, "related");
    expect(removeLink(id1, id2)).toBe(true);
  });

  it("returns false for non-existent link", () => {
    expect(removeLink(9999, 9998)).toBe(false);
  });
});

describe("getLinks", () => {
  it("returns links for a memory", () => {
    const id1 = getIdByPath("test/node1.md");
    const id2 = getIdByPath("test/node2.md");
    const id3 = getIdByPath("test/node3.md");
    createLink(id1, id2, "related");
    createLink(id1, id3, "derived");

    const links = getLinks(id1);
    expect(links.length).toBe(2);
  });

  it("returns empty for memory with no links", () => {
    const id4 = getIdByPath("test/node4.md");
    expect(getLinks(id4).length).toBe(0);
  });
});

describe("traverseGraph", () => {
  it("traverses a simple chain", () => {
    const id1 = getIdByPath("test/node1.md");
    const id2 = getIdByPath("test/node2.md");
    const id3 = getIdByPath("test/node3.md");
    createLink(id1, id2, "related");
    createLink(id2, id3, "derived");

    const result = traverseGraph(id1, 2);
    expect(result.root.id).toBe(id1);
    expect(result.nodes.length).toBe(3); // node1, node2, node3
    expect(result.edges.length).toBeGreaterThanOrEqual(2);
  });

  it("respects depth limit", () => {
    const id1 = getIdByPath("test/node1.md");
    const id2 = getIdByPath("test/node2.md");
    const id3 = getIdByPath("test/node3.md");
    createLink(id1, id2, "related");
    createLink(id2, id3, "derived");

    const result = traverseGraph(id1, 1);
    expect(result.nodes.length).toBe(2); // only node1 + node2
  });

  it("filters by relation type", () => {
    const id1 = getIdByPath("test/node1.md");
    const id2 = getIdByPath("test/node2.md");
    const id3 = getIdByPath("test/node3.md");
    createLink(id1, id2, "related");
    createLink(id1, id3, "blocks");

    const result = traverseGraph(id1, 2, ["related"]);
    expect(result.nodes.length).toBe(2); // node1 + node2 only
  });

  it("throws for non-existent memory", () => {
    expect(() => traverseGraph(9999)).toThrow("Memory 9999 not found");
  });
});
