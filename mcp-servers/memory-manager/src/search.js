/**
 * search.js — FTS5 전문 검색 엔진
 *
 * db.js의 prepared statements를 사용하여 검색/인덱싱 로직 구현.
 * 모든 함수를 named export.
 */

import {
  db,
  search as stmtSearch,
  searchByTag as stmtSearchByTag,
  searchByCategory as stmtSearchByCategory,
  getByPath,
  updateAccess,
  insert as stmtInsert,
  insertFts,
  deleteFts,
} from "./db.js";
import { readMemoryFile } from "./file-store.js";
import { glob } from "glob";
import { MEMORY_ROOT } from "./db.js";
import path from "path";

/**
 * FTS5 전문 검색
 *
 * FTS5 MATCH 쿼리 + snippet. 쿼리 파싱 에러 시 큰따옴표로 감싸서 재시도.
 * 결과마다 access_count 증가.
 *
 * @param {string} query - 검색 쿼리
 * @param {number} limit - 최대 결과 수
 * @returns {array} 검색 결과 배열
 */
export function fullTextSearch(query, limit = 10) {
  let results = [];
  try {
    results = stmtSearch.all(query, limit);
  } catch {
    // FTS5 쿼리 문법 에러 시 큰따옴표로 감싸서 재시도
    try {
      results = stmtSearch.all(`"${query}"`, limit);
    } catch (e) {
      console.error(`[search] FTS5 query failed: ${e.message}`);
      return [];
    }
  }

  // 결과마다 access_count 증가
  for (const r of results) {
    if (r.id) {
      try { updateAccess.run(r.id); } catch {}
    }
  }

  return results;
}

/**
 * 태그 검색
 *
 * tags LIKE '%tag%'
 *
 * @param {string} tag - 검색할 태그
 * @param {number} limit - 최대 결과 수
 * @returns {array} 검색 결과 배열
 */
export function searchByTag(tag, limit = 10) {
  const results = stmtSearchByTag.all(`%${tag}%`, limit);
  for (const r of results) {
    if (r.id) {
      try { updateAccess.run(r.id); } catch {}
    }
  }
  return results;
}

/**
 * 카테고리 검색
 *
 * WHERE category = ?
 *
 * @param {string} category - 카테고리명
 * @param {number} limit - 최대 결과 수
 * @returns {array} 검색 결과 배열
 */
export function searchByCategory(category, limit = 10) {
  const results = stmtSearchByCategory.all(category, limit);
  for (const r of results) {
    if (r.id) {
      try { updateAccess.run(r.id); } catch {}
    }
  }
  return results;
}

/**
 * 날짜 범위 검색
 *
 * WHERE updated_at BETWEEN ? AND ?
 *
 * @param {string} startDate - 시작 날짜 (ISO 8601 또는 YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (ISO 8601 또는 YYYY-MM-DD)
 * @param {number} limit - 최대 결과 수
 * @returns {array} 검색 결과 배열
 */
const stmtSearchByDateRange = db.prepare(`
  SELECT * FROM memories
  WHERE updated_at BETWEEN ? AND ?
  ORDER BY updated_at DESC
  LIMIT ?
`);

// ─── Associative Search ─────────────────────────────────────

/**
 * Multi-signal associative search combining FTS, tags, graph, temporal, and access frequency.
 * Produces a ranked, deduplicated result set.
 *
 * @param {string} query - FTS search query
 * @param {Object} context - Additional context signals
 * @param {string[]} context.tags - Tag-based signal
 * @param {number} context.related_id - Graph neighbor signal
 * @param {string} context.date - Temporal proximity signal (YYYY-MM-DD)
 * @param {number} limit - Max results
 * @returns {Array} Ranked results
 */
export function associativeSearch(query, context = {}, limit = 10) {
  const signals = new Map(); // id → { score, data }

  const addSignal = (results, weight, signal) => {
    for (const r of results) {
      if (!r.id) continue;
      if (signals.has(r.id)) {
        const existing = signals.get(r.id);
        existing.score += weight;
        existing.signals.push(signal);
      } else {
        signals.set(r.id, {
          score: weight,
          signals: [signal],
          data: r,
        });
      }
    }
  };

  // Signal 1: FTS5 keyword matching (weight 1.0)
  if (query) {
    try {
      let ftsResults = [];
      try {
        ftsResults = stmtSearch.all(query, 20);
      } catch {
        try { ftsResults = stmtSearch.all(`"${query}"`, 20); } catch {}
      }
      addSignal(ftsResults, 1.0, "fts");
    } catch {}
  }

  // Signal 2: Tag overlap (weight 0.8)
  if (context.tags && Array.isArray(context.tags) && context.tags.length > 0) {
    for (const tag of context.tags) {
      const tagResults = stmtSearchByTag.all(`%${tag}%`, 5);
      addSignal(tagResults, 0.8, "tag");
    }
  }

  // Signal 3: Knowledge graph neighbors (weight 0.7)
  if (context.related_id) {
    try {
      const neighbors = db.prepare(`
        SELECT m.* FROM memory_links ml
        JOIN memories m ON m.id = CASE
          WHEN ml.source_id = ? THEN ml.target_id
          ELSE ml.source_id
        END
        WHERE ml.source_id = ? OR ml.target_id = ?
        LIMIT 10
      `).all(context.related_id, context.related_id, context.related_id);
      addSignal(neighbors, 0.7, "graph");
    } catch {}
  }

  // Signal 4: Temporal proximity (weight 0.5)
  if (context.date) {
    try {
      const temporal = stmtSearchByDateRange.all(
        context.date.slice(0, 10) + "T00:00:00",
        context.date.slice(0, 10) + "T23:59:59",
        10
      );
      // Widen to ±3 days if few results
      if (temporal.length < 3) {
        const d = new Date(context.date);
        const start = new Date(d.getTime() - 3 * 86400000).toISOString().slice(0, 10);
        const end = new Date(d.getTime() + 3 * 86400000).toISOString().slice(0, 10);
        const wider = stmtSearchByDateRange.all(start, end + "T23:59:59", 10);
        addSignal(wider, 0.5, "temporal");
      } else {
        addSignal(temporal, 0.5, "temporal");
      }
    } catch {}
  }

  // Signal 5: Access frequency bonus (weight 0.3)
  // Boost results with above-average access_count
  try {
    const avgAccess = db.prepare("SELECT AVG(access_count) AS avg FROM memories").get()?.avg || 0;
    for (const [, entry] of signals) {
      if (entry.data.access_count > avgAccess) {
        entry.score += 0.3;
        entry.signals.push("frequency");
      }
    }
  } catch {}

  // Update access counts for results
  const ranked = Array.from(signals.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const r of ranked) {
    if (r.data.id) {
      try { updateAccess.run(r.data.id); } catch {}
    }
  }

  return ranked.map(r => ({
    id: r.data.id,
    title: r.data.title,
    category: r.data.category,
    tags: r.data.tags,
    file_path: r.data.file_path,
    importance: r.data.importance,
    updated_at: r.data.updated_at,
    snippet: r.data.snippet || r.data.summary || "",
    relevance_score: Math.round(r.score * 100) / 100,
    matched_signals: [...new Set(r.signals)],
  }));
}

export function searchByDateRange(startDate, endDate, limit = 20) {
  const results = stmtSearchByDateRange.all(startDate, endDate, limit);
  for (const r of results) {
    if (r.id) {
      try { updateAccess.run(r.id); } catch {}
    }
  }
  return results;
}

/**
 * 메모리 인덱싱
 *
 * DB INSERT OR REPLACE (memories 테이블) + FTS 레코드 갱신.
 * 트랜잭션으로 감싸서 원자성 보장.
 *
 * @param {string} filePath - memory-store 기준 상대 경로
 * @param {string} category - 카테고리
 * @param {string|null} subcategory - 서브카테고리
 * @param {string} title - 제목
 * @param {string} tags - 쉼표 구분 태그 문자열
 * @param {string} summary - 요약
 * @param {string} content - 본문 내용
 * @param {number} importance - 중요도 (1-10)
 * @returns {object|undefined} DB row
 */
const indexTransaction = db.transaction((filePath, category, subcategory, title, tags, summary, content, importance) => {
  stmtInsert.run(filePath, category, subcategory || null, title, tags, summary, importance);
  const row = getByPath.get(filePath);
  if (row) {
    try { deleteFts.run(row.id); } catch {}
    insertFts.run(row.id, title, tags, summary, content);
  }
  return row;
});

export function indexMemory(filePath, category, subcategory, title, tags, summary, content, importance = 5) {
  try {
    return indexTransaction(filePath, category, subcategory, title, tags, summary, content, importance);
  } catch (e) {
    console.error(`[search] indexMemory failed for ${filePath}: ${e.message}`);
    throw e;
  }
}

/**
 * 전체 재인덱싱
 *
 * memory-store/ 전체 MD 파일을 glob 탐색하여 각각 readMemoryFile → indexMemory.
 * DB를 초기화(memories + FTS 비우기)한 후 재구축하는 복구용 유틸리티.
 *
 * @returns {{ total: number, indexed: number, errors: number }}
 */
export function reindexAll() {
  console.error("[search] reindexAll started");

  // 기존 인덱스 초기화
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memories");
  console.error("[search] Cleared existing index");

  // MD 파일 탐색 (동기)
  const pattern = path.posix.join(MEMORY_ROOT.replace(/\\/g, "/"), "**/*.md");
  const files = glob.sync(pattern);

  let indexed = 0;
  let errors = 0;

  for (const fullPath of files) {
    const relativePath = path.relative(MEMORY_ROOT, fullPath).replace(/\\/g, "/");

    // _로 시작하는 파일 제외
    if (path.basename(relativePath).startsWith("_")) continue;

    const file = readMemoryFile(relativePath);
    if (!file) {
      errors++;
      continue;
    }

    const fm = file.frontmatter;
    try {
      indexMemory(
        relativePath,
        fm.category || relativePath.split("/")[0],
        fm.subcategory || null,
        fm.title || path.basename(relativePath, ".md"),
        Array.isArray(fm.tags) ? fm.tags.join(",") : (fm.tags || ""),
        fm.summary || "",
        file.content,
        fm.importance || 5
      );
      indexed++;
    } catch (e) {
      console.error(`[search] reindex error for ${relativePath}: ${e.message}`);
      errors++;
    }
  }

  console.error(`[search] reindexAll complete: ${indexed} indexed, ${errors} errors`);
  return { total: files.length, indexed, errors };
}
