/**
 * graph.js — Knowledge graph traversal (BFS/DFS)
 *
 * Operates on the memory_links table to create, query, and traverse
 * relationships between memories.
 */

import { db } from "./db.js";

// ─── Prepared Statements ────────────────────────────────────

const insertLink = db.prepare(`
  INSERT OR REPLACE INTO memory_links (source_id, target_id, relation, weight, created_at)
  VALUES (?, ?, ?, ?, datetime('now'))
`);

const deleteLink = db.prepare(
  "DELETE FROM memory_links WHERE source_id = ? AND target_id = ?"
);

const listLinks = db.prepare(`
  SELECT ml.*,
         ms.title AS source_title, ms.category AS source_category,
         mt.title AS target_title, mt.category AS target_category
  FROM memory_links ml
  JOIN memories ms ON ms.id = ml.source_id
  JOIN memories mt ON mt.id = ml.target_id
  WHERE ml.source_id = ? OR ml.target_id = ?
  ORDER BY ml.created_at DESC
`);

const getNeighbors = db.prepare(`
  SELECT ml.target_id AS id, ml.relation, ml.weight,
         m.title, m.category, m.importance
  FROM memory_links ml
  JOIN memories m ON m.id = ml.target_id
  WHERE ml.source_id = ?
  UNION
  SELECT ml.source_id AS id, ml.relation, ml.weight,
         m.title, m.category, m.importance
  FROM memory_links ml
  JOIN memories m ON m.id = ml.source_id
  WHERE ml.target_id = ?
`);

const getMemoryById = db.prepare(
  "SELECT id, title, category, importance, file_path FROM memories WHERE id = ?"
);

// ─── Link Management ────────────────────────────────────────

/**
 * Create a link between two memories.
 */
export function createLink(sourceId, targetId, relation, weight = 1.0) {
  // Validate both memories exist
  const source = getMemoryById.get(sourceId);
  const target = getMemoryById.get(targetId);
  if (!source) throw new Error(`Source memory ${sourceId} not found`);
  if (!target) throw new Error(`Target memory ${targetId} not found`);

  insertLink.run(sourceId, targetId, relation, weight);
  return { source_id: sourceId, target_id: targetId, relation, weight };
}

/**
 * Delete a link between two memories.
 */
export function removeLink(sourceId, targetId) {
  const result = deleteLink.run(sourceId, targetId);
  return result.changes > 0;
}

/**
 * List all links for a memory (both directions).
 */
export function getLinks(memoryId) {
  return listLinks.all(memoryId, memoryId);
}

// ─── Graph Traversal ────────────────────────────────────────

/**
 * BFS traversal from a starting node.
 *
 * @param {number} startId - Starting memory ID
 * @param {number} maxDepth - Maximum traversal depth (default 2, max 4)
 * @param {string[]} relationFilter - Only follow these relation types (null = all)
 * @returns {{ root, nodes, edges }}
 */
export function traverseGraph(startId, maxDepth = 2, relationFilter = null) {
  const root = getMemoryById.get(startId);
  if (!root) throw new Error(`Memory ${startId} not found`);

  const visited = new Set([startId]);
  const nodes = [{ ...root, depth: 0 }];
  const edges = [];
  let frontier = [startId];

  for (let depth = 1; depth <= Math.min(maxDepth, 4); depth++) {
    const nextFrontier = [];

    for (const nodeId of frontier) {
      const neighbors = getNeighbors.all(nodeId, nodeId);

      for (const neighbor of neighbors) {
        // Apply relation filter
        if (relationFilter && !relationFilter.includes(neighbor.relation)) continue;

        // Add edge (always, even if node already visited)
        edges.push({
          source: nodeId,
          target: neighbor.id,
          relation: neighbor.relation,
          weight: neighbor.weight,
        });

        // Add node if not visited
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          nodes.push({
            id: neighbor.id,
            title: neighbor.title,
            category: neighbor.category,
            importance: neighbor.importance,
            depth,
          });
          nextFrontier.push(neighbor.id);
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return {
    root: { id: root.id, title: root.title, category: root.category, importance: root.importance },
    nodes,
    edges,
  };
}
