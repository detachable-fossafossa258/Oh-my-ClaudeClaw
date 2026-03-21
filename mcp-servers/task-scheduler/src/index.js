#!/usr/bin/env node

/**
 * OpenClaw-CC Task Scheduler MCP Server
 *
 * 순수 MCP 라우터 — 비즈니스 로직은 tools.js에 위임.
 *
 * Tools (7개):
 *   task_create          - 스케줄 태스크 생성
 *   task_list            - 태스크 목록 조회
 *   task_update          - 태스크 수정
 *   task_delete          - 태스크 삭제
 *   task_run_now         - 태스크 즉시 실행
 *   task_history         - 실행 히스토리 조회
 *   task_generate_crontab - crontab 파일 생성
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { loadJSON, saveJSON } from "./store.js";
import {
  handleTaskCreate,
  handleTaskList,
  handleTaskUpdate,
  handleTaskDelete,
  handleTaskRunNow,
  handleTaskHistory,
  handleTaskGenerateCrontab,
} from "./tools.js";

// ─── Configuration ──────────────────────────────────────────

const DATA_DIR = process.env.SCHEDULER_DATA
  || path.join(process.env.HOME || process.env.USERPROFILE || ".", "openclaw-cc/scheduler-data");

const TASKS_FILE = path.join(DATA_DIR, "tasks.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── State ──────────────────────────────────────────────────

const tasks = loadJSON(TASKS_FILE, []);
const history = loadJSON(HISTORY_FILE, []);

const ctx = {
  tasks,
  history,
  saveTasks() { saveJSON(TASKS_FILE, this.tasks); },
  saveHistory() { saveJSON(HISTORY_FILE, this.history); },
};

// ─── MCP Server ─────────────────────────────────────────────

const server = new Server(
  { name: "openclaw-cc-scheduler", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ListTools — 도구 목록 (interface-contracts.md §3)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "task_create",
      description: "Create a scheduled task. Specify a cron expression for recurring execution, or register for manual execution only.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Task name" },
          prompt: { type: "string", description: "Prompt to pass to claude -p" },
          cron: { type: "string", description: "5-field cron expression (e.g. '0 9 * * 1-5')" },
          allowedTools: {
            type: "array",
            items: { type: "string" },
            description: "List of allowed MCP server names"
          },
          tags: { type: "array", items: { type: "string" }, description: "Classification tags" },
          enabled: { type: "boolean", description: "Whether active (default: true)" },
        },
        required: ["name", "prompt"]
      }
    },
    {
      name: "task_list",
      description: "List registered scheduled tasks. Filter to active-only or search by tag.",
      inputSchema: {
        type: "object",
        properties: {
          enabled_only: { type: "boolean", description: "Show active tasks only (default: false)" },
          tag: { type: "string", description: "Tag filter" },
        }
      }
    },
    {
      name: "task_update",
      description: "Update an existing task. Only provided fields are updated.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Task ID" },
          name: { type: "string", description: "Task name" },
          prompt: { type: "string", description: "Prompt" },
          cron: { type: "string", description: "Cron expression" },
          enabled: { type: "boolean", description: "Whether active" },
          allowedTools: { type: "array", items: { type: "string" }, description: "Allowed tools" },
        },
        required: ["id"]
      }
    },
    {
      name: "task_delete",
      description: "Delete a task.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Task ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "task_run_now",
      description: "Run a task immediately. Execute a registered task by ID, or pass a prompt directly.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "integer", description: "ID of the task to run" },
          prompt: { type: "string", description: "Pass a prompt directly (usable without id)" },
        }
      }
    },
    {
      name: "task_history",
      description: "Retrieve task execution history. Returns results in reverse chronological order.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "integer", description: "Show history for a specific task only" },
          limit: { type: "integer", description: "Maximum number of results (default: 20)" },
        }
      }
    },
    {
      name: "task_generate_crontab",
      description: "Generate a crontab file from active tasks. Apply to the system with `crontab <file-path>`.",
      inputSchema: { type: "object", properties: {} }
    },
  ]
}));

// CallTool — 도구 실행 라우터
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "task_create":
        return handleTaskCreate(args, ctx);
      case "task_list":
        return handleTaskList(args, ctx);
      case "task_update":
        return handleTaskUpdate(args, ctx);
      case "task_delete":
        return handleTaskDelete(args, ctx);
      case "task_run_now":
        return await handleTaskRunNow(args, ctx);
      case "task_history":
        return handleTaskHistory(args, ctx);
      case "task_generate_crontab":
        return handleTaskGenerateCrontab(args, ctx);
      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Unknown tool: ${name}`, code: "UNKNOWN_TOOL" }) }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: error.message, code: "INTERNAL_ERROR" }) }],
      isError: true,
    };
  }
});

// ─── Start ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenClaw-CC Task Scheduler MCP Server running");
  console.error(`Data directory: ${DATA_DIR}`);
}

main().catch(console.error);
