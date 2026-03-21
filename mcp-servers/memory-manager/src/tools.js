/**
 * tools.js — MCP 도구 핸들러 8개
 *
 * interface-contracts.md §1의 스키마를 정확히 따르는 핸들러 구현.
 * 각 핸들러: Input 검증 → 비즈니스 로직 → Output 포맷 반환.
 */

import fs from "fs";
import path from "path";
import { db, MEMORY_ROOT, getById, getByPath, updateAccess, deleteById, deleteFts, listAll, listByCategory } from "./db.js";
import { generateFilePath, writeMemoryFile, readMemoryFile, getDirectoryTree, deleteMemoryFile } from "./file-store.js";
import { fullTextSearch, searchByTag, searchByCategory, searchByDateRange, associativeSearch, indexMemory } from "./search.js";

// ─── 응답 헬퍼 ─────────────────────────────────────────────

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

// ─── 1. memory_store ────────────────────────────────────────

export function handleMemoryStore(args) {
  const { category, subcategory, title, content, tags = [], importance = 5, summary = "" } = args;

  // Input 검증
  if (!category || !title || !content) {
    return errorResponse("category, title, and content are required.", "VALIDATION_ERROR");
  }
  const validCategories = ["inbox", "projects", "people", "knowledge", "daily-logs", "tasks"];
  if (!validCategories.includes(category)) {
    return errorResponse(`Invalid category: ${category}`, "VALIDATION_ERROR");
  }
  if (title.length > 200) {
    return errorResponse("Title must be 200 characters or fewer.", "VALIDATION_ERROR");
  }

  try {
    const filePath = generateFilePath(category, title, subcategory);
    const tagsStr = Array.isArray(tags) ? tags.join(",") : (tags || "");

    const frontmatter = {
      title,
      category,
      tags: Array.isArray(tags) ? tags : [],
      importance,
      summary,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    if (subcategory) frontmatter.subcategory = subcategory;

    writeMemoryFile(filePath, frontmatter, content);

    let row;
    try {
      row = indexMemory(filePath, category, subcategory || null, title, tagsStr, summary, content, importance);
    } catch (e) {
      console.error(`[tools] Index error for ${filePath}: ${e.message}`);
      return errorResponse(`File saved successfully, but indexing failed: ${e.message}`, "INDEX_ERROR");
    }

    return successResponse({
      id: row?.id,
      path: filePath,
      message: `Memory saved: ${title}`,
    });
  } catch (e) {
    console.error(`[tools] memory_store error: ${e.message}`);
    return errorResponse(e.message, "WRITE_ERROR");
  }
}

// ─── 2. memory_search ───────────────────────────────────────

export function handleMemorySearch(args) {
  const { query, tag, category, limit = 10, associative = false, context = {} } = args;
  const clampedLimit = Math.min(Math.max(limit, 1), 50);

  try {
    // Associative mode: multi-signal ranked search
    if (associative) {
      const assocContext = {
        tags: context.tags || (tag ? [tag] : []),
        related_id: context.related_id || null,
        date: context.date || null,
      };
      const results = associativeSearch(query || "", assocContext, clampedLimit);
      return successResponse({
        count: results.length,
        mode: "associative",
        results: results.map(r => ({
          id: r.id,
          title: r.title,
          category: r.category,
          tags: r.tags,
          path: r.file_path,
          importance: r.importance,
          updated: r.updated_at,
          snippet: r.snippet || "",
          relevance_score: r.relevance_score,
          matched_signals: r.matched_signals,
        }))
      });
    }

    // Standard mode (backward compatible)
    let results = [];

    if (query) {
      results = fullTextSearch(query, clampedLimit);
    } else if (tag) {
      results = searchByTag(tag, clampedLimit);
    } else if (category) {
      results = searchByCategory(category, clampedLimit);
    } else {
      results = listAll.all(clampedLimit);
    }

    return successResponse({
      count: results.length,
      results: results.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        tags: r.tags,
        path: r.file_path,
        importance: r.importance,
        updated: r.updated_at,
        snippet: r.snippet || r.summary || "",
      }))
    });
  } catch (e) {
    console.error(`[tools] memory_search error: ${e.message}`);
    return errorResponse(e.message, "SEARCH_ERROR");
  }
}

// ─── 3. memory_get ──────────────────────────────────────────

export function handleMemoryGet(args) {
  const { id, path: filePath } = args;

  if (!id && !filePath) {
    return errorResponse("Either id or path is required.", "VALIDATION_ERROR");
  }

  try {
    const row = id ? getById.get(id) : getByPath.get(filePath);

    if (!row) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Memory not found." }) }] };
    }

    updateAccess.run(row.id);
    const file = readMemoryFile(row.file_path);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: row.id,
          file_path: row.file_path,
          category: row.category,
          title: row.title,
          tags: row.tags,
          importance: row.importance,
          access_count: row.access_count + 1,
          created_at: row.created_at,
          updated_at: row.updated_at,
          frontmatter: file?.frontmatter || {},
          content: file?.content || "",
        }, null, 2)
      }]
    };
  } catch (e) {
    console.error(`[tools] memory_get error: ${e.message}`);
    return errorResponse(e.message, "READ_ERROR");
  }
}

// ─── 4. memory_list ─────────────────────────────────────────

export function handleMemoryList(args) {
  const { directory = "", max_depth = 3, limit = 50 } = args;

  try {
    const tree = getDirectoryTree(directory, 0, max_depth);

    let recent = [];
    if (directory && directory !== "." && directory !== "") {
      recent = listByCategory.all(directory.split("/")[0], limit);
    } else {
      recent = listAll.all(limit);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ tree, recent }, null, 2)
      }]
    };
  } catch (e) {
    console.error(`[tools] memory_list error: ${e.message}`);
    return errorResponse(e.message, "LIST_ERROR");
  }
}

// ─── 5. memory_update ───────────────────────────────────────

export function handleMemoryUpdate(args) {
  const { id, path: filePath, mode, content, tags, importance } = args;

  if (!id && !filePath) {
    return errorResponse("Either id or path is required.", "VALIDATION_ERROR");
  }
  if (!mode || !["append", "replace", "metadata"].includes(mode)) {
    return errorResponse("mode must be one of: append, replace, metadata.", "VALIDATION_ERROR");
  }

  try {
    const row = id ? getById.get(id) : getByPath.get(filePath);

    if (!row) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Memory not found." }) }] };
    }

    const file = readMemoryFile(row.file_path);
    if (!file) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "File not found." }) }] };
    }

    let newContent = file.content;
    let newFrontmatter = { ...file.frontmatter };

    if (mode === "append" && content) {
      newContent = file.content + "\n\n" + content;
    } else if (mode === "replace" && content) {
      newContent = content;
    }

    if (tags) newFrontmatter.tags = tags;
    if (importance) newFrontmatter.importance = importance;
    newFrontmatter.updated = new Date().toISOString();

    writeMemoryFile(row.file_path, newFrontmatter, newContent);

    const tagsStr = (tags || file.frontmatter.tags || []).join(",");
    indexMemory(
      row.file_path, row.category, row.subcategory || null, row.title,
      tagsStr, newFrontmatter.summary || "", newContent,
      importance || row.importance
    );

    return successResponse({ message: `Memory updated: ${row.title}` });
  } catch (e) {
    console.error(`[tools] memory_update error: ${e.message}`);
    return errorResponse(e.message, "UPDATE_ERROR");
  }
}

// ─── 6. memory_delete ───────────────────────────────────────

export function handleMemoryDelete(args) {
  const { id, path: filePath } = args;

  if (!id && !filePath) {
    return errorResponse("Either id or path is required.", "VALIDATION_ERROR");
  }

  try {
    const row = id ? getById.get(id) : getByPath.get(filePath);

    if (!row) {
      return { content: [{ type: "text", text: JSON.stringify({ error: "Memory not found." }) }] };
    }

    deleteMemoryFile(row.file_path);
    try { deleteFts.run(row.id); } catch {}
    deleteById.run(row.id);

    return successResponse({ message: `Memory deleted: ${row.title}` });
  } catch (e) {
    console.error(`[tools] memory_delete error: ${e.message}`);
    return errorResponse(e.message, "DELETE_ERROR");
  }
}

// ─── 7. memory_daily_log ────────────────────────────────────

const DAILY_LOG_EMOJI = {
  note: "📝",
  decision: "⚖️",
  todo: "☐",
  done: "✅",
  idea: "💡",
  meeting: "🤝",
};

export function handleMemoryDailyLog(args) {
  const { entry, type = "note" } = args;

  if (!entry) {
    return errorResponse("entry is required.", "VALIDATION_ERROR");
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const filePath = `daily-logs/${today}.md`;
    const fullPath = path.join(MEMORY_ROOT, filePath);
    const time = new Date().toTimeString().slice(0, 5);
    const emoji = DAILY_LOG_EMOJI[type] || "📝";

    const logEntry = `\n- ${emoji} **[${time}]** ${entry}`;

    if (fs.existsSync(fullPath)) {
      fs.appendFileSync(fullPath, logEntry, "utf-8");
    } else {
      const frontmatter = {
        title: `Daily Log - ${today}`,
        category: "daily-logs",
        tags: ["daily", today],
        importance: 3,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      writeMemoryFile(filePath, frontmatter, `# ${today} Daily Log\n${logEntry}`);
      indexMemory(filePath, "daily-logs", null, `Daily Log ${today}`, "daily", "", "", 3);
    }

    return successResponse({ message: `Daily log entry added: ${entry}` });
  } catch (e) {
    console.error(`[tools] memory_daily_log error: ${e.message}`);
    return errorResponse(e.message, "WRITE_ERROR");
  }
}

// ─── 8. memory_stats ────────────────────────────────────────

// ─── 9. memory_search_date ─────────────────────────────────

export function handleMemorySearchDate(args) {
  const { start_date, end_date, category, limit = 20 } = args;

  if (!start_date || !end_date) {
    return errorResponse("start_date and end_date are required.", "VALIDATION_ERROR");
  }

  try {
    let results = searchByDateRange(start_date, end_date + "T23:59:59", Math.min(Math.max(limit, 1), 100));

    if (category) {
      results = results.filter(r => r.category === category);
    }

    return successResponse({
      count: results.length,
      results: results.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        tags: r.tags,
        path: r.file_path,
        importance: r.importance,
        updated: r.updated_at,
      }))
    });
  } catch (e) {
    console.error(`[tools] memory_search_date error: ${e.message}`);
    return errorResponse(e.message, "SEARCH_ERROR");
  }
}

// ─── 10. memory_stats ───────────────────────────────────────

export function handleMemoryStats() {
  try {
    const stats = db.prepare(`
      SELECT category, COUNT(*) as count,
             MAX(updated_at) as last_updated,
             ROUND(AVG(importance), 1) as avg_importance
      FROM memories GROUP BY category
    `).all();

    const totalCount = db.prepare("SELECT COUNT(*) as total FROM memories").get();

    const topTags = db.prepare(`
      SELECT tags, COUNT(*) as count FROM memories
      WHERE tags != '' GROUP BY tags ORDER BY count DESC LIMIT 20
    `).all();

    const recentActivity = db.prepare(`
      SELECT title, category, updated_at FROM memories
      ORDER BY updated_at DESC LIMIT 10
    `).all();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total_memories: totalCount.total,
          by_category: stats,
          top_tags: topTags,
          recent_activity: recentActivity,
        }, null, 2)
      }]
    };
  } catch (e) {
    console.error(`[tools] memory_stats error: ${e.message}`);
    return errorResponse(e.message, "STATS_ERROR");
  }
}
