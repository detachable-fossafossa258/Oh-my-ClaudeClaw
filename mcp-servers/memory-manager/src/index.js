#!/usr/bin/env node

/**
 * index.js — OpenClaw-CC Memory Manager MCP Server 엔트리포인트
 *
 * spec.md §1.1 표준 MCP 서버 뼈대.
 * 도구 정의(ListTools)와 도구 실행(CallTool)을 라우팅.
 * 비즈니스 로직은 tools.js에 위임.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ensureDirectories } from "./file-store.js";
import {
  handleMemoryStore,
  handleMemorySearch,
  handleMemoryGet,
  handleMemoryList,
  handleMemoryUpdate,
  handleMemoryDelete,
  handleMemoryDailyLog,
  handleMemoryStats,
  handleMemorySearchDate,
} from "./tools.js";

// ─── 초기화 ─────────────────────────────────────────────────
ensureDirectories();

// ─── MCP Server 인스턴스 ────────────────────────────────────

const server = new Server(
  { name: "openclaw-cc-memory", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── ListTools: 8개 도구 정의 (interface-contracts.md §1) ───

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "memory_store",
      description: "Permanently stores a memory (file + DB indexing). Specify category, title, and content; optionally add tags, importance, and subcategory.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["inbox", "projects", "people", "knowledge", "daily-logs", "tasks"],
            description: "Memory category"
          },
          title: { type: "string", maxLength: 200, description: "Memory title (max 200 characters)" },
          content: { type: "string", description: "Memory content (Markdown body)" },
          subcategory: { type: "string", description: "Subdirectory name (e.g., 'rutile', 'sapiens' under projects)" },
          tags: { type: "array", items: { type: "string" }, description: "List of tags" },
          importance: { type: "integer", minimum: 1, maximum: 10, description: "Importance level (1-10, default 5)" },
          summary: { type: "string", description: "One-line summary" }
        },
        required: ["category", "title", "content"]
      }
    },
    {
      name: "memory_search",
      description: "Searches memories. Standard mode: FTS5 full-text, tag, or category search. Associative mode (associative=true): multi-signal ranked search combining FTS, tags, graph neighbors, temporal proximity, and access frequency.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "FTS5 full-text search query" },
          tag: { type: "string", description: "Tag filter" },
          category: { type: "string", description: "Category filter" },
          limit: { type: "integer", minimum: 1, maximum: 50, description: "Maximum number of results (default 10, max 50)" },
          associative: { type: "boolean", description: "Enable multi-signal associative search (default false)" },
          context: {
            type: "object",
            description: "Additional context for associative search",
            properties: {
              tags: { type: "array", items: { type: "string" }, description: "Tags for tag-overlap signal" },
              related_id: { type: "integer", description: "Memory ID for graph-neighbor signal" },
              date: { type: "string", description: "Date (YYYY-MM-DD) for temporal proximity signal" }
            }
          }
        }
      }
    },
    {
      name: "memory_get",
      description: "Retrieves the full content of a specific memory. Specify by ID or file path.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Memory ID" },
          path: { type: "string", description: "File path (relative to memory-store root)" }
        }
      }
    },
    {
      name: "memory_list",
      description: "Browses the memory directory tree and returns the most recently updated entries.",
      inputSchema: {
        type: "object",
        properties: {
          directory: { type: "string", description: "Starting path for traversal (empty string = root)" },
          max_depth: { type: "integer", minimum: 1, maximum: 10, description: "Maximum tree depth (default 3)" },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Maximum number of DB entries to return (default 50)" }
        }
      }
    },
    {
      name: "memory_update",
      description: "Updates an existing memory. Supports append (add content), replace (overwrite content), and metadata (tags/importance only) modes.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Memory ID" },
          path: { type: "string", description: "File path" },
          mode: { type: "string", enum: ["append", "replace", "metadata"], description: "Update mode" },
          content: { type: "string", description: "New content (for append/replace)" },
          tags: { type: "array", items: { type: "string" }, description: "New tags (for metadata)" },
          importance: { type: "integer", minimum: 1, maximum: 10, description: "New importance level (for metadata)" }
        },
        required: ["mode"]
      }
    },
    {
      name: "memory_delete",
      description: "Deletes a memory (removes both the file and DB index entry).",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Memory ID" },
          path: { type: "string", description: "File path" }
        }
      }
    },
    {
      name: "memory_daily_log",
      description: "Adds an entry to today's daily log. Automatically recorded with a timestamp in today's file (daily-logs/YYYY-MM-DD.md).",
      inputSchema: {
        type: "object",
        properties: {
          entry: { type: "string", description: "Log entry content" },
          type: {
            type: "string",
            enum: ["note", "decision", "todo", "done", "idea", "meeting"],
            description: "Entry type (default: note)"
          }
        },
        required: ["entry"]
      }
    },
    {
      name: "memory_search_date",
      description: "Searches memories by date range. Use this to retrieve memories from a specific time period.",
      inputSchema: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
          category: { type: "string", description: "Category filter (optional)" },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Maximum number of results (default 20)" }
        },
        required: ["start_date", "end_date"]
      }
    },
    {
      name: "memory_stats",
      description: "Returns memory store statistics (count by category, average importance, top tags, recent activity).",
      inputSchema: { type: "object", properties: {} }
    }
  ]
}));

// ─── CallTool: 도구 실행 라우터 ─────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "memory_store":     return handleMemoryStore(args);
      case "memory_search":    return handleMemorySearch(args);
      case "memory_get":       return handleMemoryGet(args);
      case "memory_list":      return handleMemoryList(args);
      case "memory_update":    return handleMemoryUpdate(args);
      case "memory_delete":    return handleMemoryDelete(args);
      case "memory_daily_log": return handleMemoryDailyLog(args);
      case "memory_search_date": return handleMemorySearchDate(args);
      case "memory_stats":     return handleMemoryStats(args);
      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Unknown tool: ${name}`, code: "UNKNOWN_TOOL" }) }],
          isError: true
        };
    }
  } catch (error) {
    console.error(`[index] Unhandled error in ${name}: ${error.message}`);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: false, error: error.message, code: "INTERNAL_ERROR" })
      }],
      isError: true
    };
  }
});

// ─── 서버 시작 ──────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[index] OpenClaw-CC Memory Manager MCP Server running");
}

main().catch((e) => {
  console.error(`[index] Fatal: ${e.message}`);
  process.exit(1);
});
