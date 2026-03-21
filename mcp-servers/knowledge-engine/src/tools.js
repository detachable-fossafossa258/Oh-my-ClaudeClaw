/**
 * tools.js — 6 MCP tool handlers for knowledge-engine
 *
 * memory_link, memory_graph, memory_similar,
 * memory_refine, memory_archive, memory_search_date
 */

import { db } from "./db.js";
import { createLink, removeLink, getLinks, traverseGraph } from "./graph.js";
import { findSimilarById, findSimilarByText, indexTrigrams, reindexAllTrigrams } from "./similarity.js";

// ─── Response Helpers ───────────────────────────────────────

function successResponse(data) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ success: true, ...data }, null, 2)
    }]
  };
}

function errorResponse(message, code = "ERROR") {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ success: false, error: message, code })
    }],
    isError: true
  };
}

// ─── 1. memory_link ─────────────────────────────────────────

const VALID_RELATIONS = ["related", "derived", "supersedes", "blocks", "contradicts", "refines"];

export function handleMemoryLink(args) {
  const { source_id, target_id, relation, weight = 1.0, action = "create" } = args;

  if (action === "list") {
    if (!source_id && !target_id) {
      return errorResponse("Either source_id or target_id is required for listing.", "VALIDATION_ERROR");
    }
    try {
      const links = getLinks(source_id || target_id);
      return successResponse({ count: links.length, links });
    } catch (e) {
      return errorResponse(e.message, "QUERY_ERROR");
    }
  }

  if (!source_id || !target_id || !relation) {
    return errorResponse("source_id, target_id, and relation are required.", "VALIDATION_ERROR");
  }

  if (!VALID_RELATIONS.includes(relation)) {
    return errorResponse(`Invalid relation: ${relation}. Must be one of: ${VALID_RELATIONS.join(", ")}`, "VALIDATION_ERROR");
  }

  try {
    if (action === "delete") {
      const deleted = removeLink(source_id, target_id);
      return successResponse({
        deleted,
        message: deleted ? "Link removed." : "Link not found."
      });
    }

    const link = createLink(source_id, target_id, relation, weight);
    return successResponse({ link, message: "Link created." });
  } catch (e) {
    return errorResponse(e.message, "LINK_ERROR");
  }
}

// ─── 2. memory_graph ────────────────────────────────────────

export function handleMemoryGraph(args) {
  const { id, depth = 2, relations } = args;

  if (!id) {
    return errorResponse("id is required.", "VALIDATION_ERROR");
  }

  try {
    const clampedDepth = Math.min(Math.max(depth, 1), 4);
    const relationFilter = relations && Array.isArray(relations) ? relations : null;
    const result = traverseGraph(id, clampedDepth, relationFilter);

    return successResponse({
      ...result,
      node_count: result.nodes.length,
      edge_count: result.edges.length,
    });
  } catch (e) {
    return errorResponse(e.message, "GRAPH_ERROR");
  }
}

// ─── 3. memory_similar ──────────────────────────────────────

export function handleMemorySimilar(args) {
  const { id, text, threshold = 0.3, limit = 5 } = args;

  if (!id && !text) {
    return errorResponse("Either id or text is required.", "VALIDATION_ERROR");
  }

  try {
    const clampedThreshold = Math.min(Math.max(threshold, 0), 1);
    const clampedLimit = Math.min(Math.max(limit, 1), 20);

    let results;
    if (id) {
      results = findSimilarById(id, clampedThreshold, clampedLimit);
    } else {
      results = findSimilarByText(text, clampedThreshold, clampedLimit);
    }

    return successResponse({
      count: results.length,
      similar: results,
    });
  } catch (e) {
    return errorResponse(e.message, "SIMILARITY_ERROR");
  }
}

// ─── 4. memory_refine ───────────────────────────────────────

export function handleMemoryRefine(args) {
  const { id, mode } = args;

  if (!id || !mode) {
    return errorResponse("id and mode are required.", "VALIDATION_ERROR");
  }

  const validModes = ["normalize", "consolidate", "upgrade"];
  if (!validModes.includes(mode)) {
    return errorResponse(`Invalid mode: ${mode}. Must be one of: ${validModes.join(", ")}`, "VALIDATION_ERROR");
  }

  try {
    const memory = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
    if (!memory) return errorResponse("Memory not found.", "NOT_FOUND");

    // Save current version before refinement
    db.prepare(`
      INSERT INTO memory_versions (memory_id, version, content, summary, changed_by)
      SELECT id, version, file_path, summary, 'pre-refinement'
      FROM memories WHERE id = ?
    `).run(id);

    if (mode === "upgrade") {
      // Determine target layer based on current
      const layerMap = { episodic: "working", working: "longterm" };
      const newLayer = layerMap[memory.layer] || memory.layer;

      if (newLayer === memory.layer) {
        return successResponse({
          message: `Memory is already at ${memory.layer} layer.`,
          original: { id, title: memory.title, layer: memory.layer },
        });
      }

      db.prepare("UPDATE memories SET layer = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?")
        .run(newLayer, id);

      return successResponse({
        original: { id, title: memory.title, layer: memory.layer, version: memory.version },
        refined: { id, title: memory.title, layer: newLayer, version: memory.version + 1 },
        message: `Memory upgraded: ${memory.layer} → ${newLayer}`,
      });
    }

    if (mode === "consolidate") {
      // Find similar memories and return them for Claude to merge
      const similar = findSimilarById(id, 0.4, 5);

      return successResponse({
        original: { id, title: memory.title, category: memory.category, version: memory.version },
        candidates: similar,
        message: similar.length > 0
          ? `Found ${similar.length} similar memories for consolidation. Use memory_update to merge content, then memory_link with 'supersedes' relation.`
          : "No similar memories found for consolidation.",
      });
    }

    if (mode === "normalize") {
      // Return current content for Claude to rewrite at expert level
      const content = db.prepare(
        "SELECT title, tags, summary, category FROM memories WHERE id = ?"
      ).get(id);

      return successResponse({
        original: { id, title: memory.title, version: memory.version },
        current_content: content,
        message: "Use memory_update(mode:'replace') with the normalized expert-level content. The original version has been saved.",
        instructions: "Rewrite the content to be concise, accurate, and at expert level. Remove redundancy, clarify ambiguity, and structure with clear headings.",
      });
    }
  } catch (e) {
    return errorResponse(e.message, "REFINE_ERROR");
  }
}

// ─── 5. memory_archive ──────────────────────────────────────

export function handleMemoryArchive(args) {
  const { category, older_than = 30, dry_run = false } = args;

  try {
    let query = `
      SELECT id, title, category, file_path, importance, layer,
             CAST(julianday('now') - julianday(COALESCE(last_accessed, updated_at)) AS INTEGER) AS age_days
      FROM memories
      WHERE CAST(julianday('now') - julianday(COALESCE(last_accessed, updated_at)) AS INTEGER) > ?
        AND layer != 'longterm'
        AND importance < 7
    `;
    const params = [older_than];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    query += " ORDER BY age_days DESC";

    const candidates = db.prepare(query).all(...params);

    if (dry_run) {
      return successResponse({
        dry_run: true,
        candidate_count: candidates.length,
        details: candidates.map(c => ({
          id: c.id,
          title: c.title,
          category: c.category,
          age_days: c.age_days,
          importance: c.importance,
          action: "would_archive",
        })),
      });
    }

    // Archive: mark as archived by setting layer and updating metadata
    let archived = 0;
    const archiveStmt = db.prepare(
      "UPDATE memories SET layer = 'episodic', importance = 1, updated_at = datetime('now') WHERE id = ?"
    );

    for (const c of candidates) {
      // Save version before archiving
      db.prepare(`
        INSERT INTO memory_versions (memory_id, version, content, summary, changed_by)
        VALUES (?, ?, ?, 'archived', 'archive-pipeline')
      `).run(c.id, 0, c.file_path);

      archiveStmt.run(c.id);
      archived++;
    }

    return successResponse({
      archived_count: archived,
      message: `Archived ${archived} memories older than ${older_than} days.`,
      details: candidates.map(c => ({
        id: c.id,
        title: c.title,
        age_days: c.age_days,
        action: "archived",
      })),
    });
  } catch (e) {
    return errorResponse(e.message, "ARCHIVE_ERROR");
  }
}

// ─── 6. memory_reindex_trigrams ─────────────────────────────

export function handleReindexTrigrams() {
  try {
    const count = reindexAllTrigrams();
    return successResponse({
      indexed_count: count,
      message: `Trigram index rebuilt for ${count} memories.`,
    });
  } catch (e) {
    return errorResponse(e.message, "REINDEX_ERROR");
  }
}
