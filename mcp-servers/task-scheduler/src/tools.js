/**
 * tools.js — MCP 도구 핸들러 7개
 *
 * interface-contracts.md §3의 스키마를 정확히 구현.
 * 모든 핸들러는 (args, ctx) 시그니처를 따름.
 * ctx = { tasks, history, saveTasks(), saveHistory() }
 */

import { getNextId, saveJSON } from "./store.js";
import { generateCrontab, validateCron } from "./cron-gen.js";
import { runTask } from "./executor.js";

// ─── 표준 응답 헬퍼 ─────────────────────────────────────────

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

// ─── 1. task_create ─────────────────────────────────────────

export function handleTaskCreate(args, ctx) {
  if (!args.name || !args.prompt) {
    return errorResponse("name and prompt are required.", "VALIDATION_ERROR");
  }

  if (args.cron) {
    const cronResult = validateCron(args.cron);
    if (!cronResult.valid) {
      return errorResponse(`Invalid cron expression: ${cronResult.error}`, "VALIDATION_ERROR");
    }
  }

  const task = {
    id: getNextId(ctx.tasks),
    name: args.name,
    prompt: args.prompt,
    cron: args.cron || null,
    allowedTools: args.allowedTools || [],
    tags: args.tags || [],
    enabled: args.enabled !== false,
    created: new Date().toISOString(),
    updated: null,
    lastRun: null,
    runCount: 0,
  };

  ctx.tasks.push(task);
  ctx.saveTasks();

  return successResponse({
    task,
    message: `Task created: ${task.name} (ID: ${task.id})`
  });
}

// ─── 2. task_list ───────────────────────────────────────────

export function handleTaskList(args, ctx) {
  let filtered = [...ctx.tasks];
  if (args.enabled_only) filtered = filtered.filter(t => t.enabled);
  if (args.tag) filtered = filtered.filter(t => t.tags && t.tags.includes(args.tag));

  return successResponse({ count: filtered.length, tasks: filtered });
}

// ─── 3. task_update ─────────────────────────────────────────

export function handleTaskUpdate(args, ctx) {
  if (args.id === undefined) {
    return errorResponse("id is required.", "VALIDATION_ERROR");
  }

  const idx = ctx.tasks.findIndex(t => t.id === args.id);
  if (idx === -1) {
    return errorResponse("Task not found.", "NOT_FOUND");
  }

  const task = ctx.tasks[idx];

  if (args.name !== undefined) task.name = args.name;
  if (args.prompt !== undefined) task.prompt = args.prompt;
  if (args.cron !== undefined) {
    if (args.cron !== null && args.cron !== "") {
      const cronResult = validateCron(args.cron);
      if (!cronResult.valid) {
        return errorResponse(`Invalid cron expression: ${cronResult.error}`, "VALIDATION_ERROR");
      }
    }
    task.cron = args.cron || null;
  }
  if (args.enabled !== undefined) task.enabled = args.enabled;
  if (args.allowedTools !== undefined) task.allowedTools = args.allowedTools;
  if (args.tags !== undefined) task.tags = args.tags;

  task.updated = new Date().toISOString();
  ctx.saveTasks();

  return successResponse({ task });
}

// ─── 4. task_delete ─────────────────────────────────────────

export function handleTaskDelete(args, ctx) {
  if (args.id === undefined) {
    return errorResponse("id is required.", "VALIDATION_ERROR");
  }

  const idx = ctx.tasks.findIndex(t => t.id === args.id);
  if (idx === -1) {
    return errorResponse("Task not found.", "NOT_FOUND");
  }

  const removed = ctx.tasks.splice(idx, 1)[0];
  ctx.saveTasks();

  return successResponse({ message: `Task deleted: ${removed.name}` });
}

// ─── 5. task_run_now ────────────────────────────────────────

export async function handleTaskRunNow(args, ctx) {
  let prompt = args.prompt || null;
  let allowedTools = [];
  let taskId = args.id || null;

  if (taskId) {
    const task = ctx.tasks.find(t => t.id === taskId);
    if (!task && !prompt) {
      return errorResponse("Task not found.", "NOT_FOUND");
    }
    if (task) {
      if (!prompt) prompt = task.prompt;
      allowedTools = task.allowedTools || [];
    }
  }

  if (!prompt) {
    return errorResponse("Either id or prompt is required.", "VALIDATION_ERROR");
  }

  const result = await runTask(prompt, allowedTools);

  // 히스토리 엔트리 구성
  const entry = {
    task_id: taskId,
    prompt,
    started: result.started,
    finished: result.finished,
    status: result.status,
    output: result.output,
    error: result.error,
  };

  ctx.history.push(entry);

  // FIFO: 500건 초과 시 오래된 것부터 삭제
  if (ctx.history.length > 500) {
    ctx.history.splice(0, ctx.history.length - 500);
  }
  ctx.saveHistory();

  // 태스크 runCount/lastRun 업데이트
  if (taskId) {
    const task = ctx.tasks.find(t => t.id === taskId);
    if (task) {
      task.lastRun = result.finished;
      task.runCount = (task.runCount || 0) + 1;
      ctx.saveTasks();
    }
  }

  return successResponse(entry);
}

// ─── 6. task_history ────────────────────────────────────────

export function handleTaskHistory(args, ctx) {
  let filtered = [...ctx.history];
  if (args.task_id !== undefined) {
    filtered = filtered.filter(h => h.task_id === args.task_id);
  }

  // 최신순 정렬
  filtered.reverse();

  const limit = args.limit || 20;
  filtered = filtered.slice(0, limit);

  return successResponse({ count: filtered.length, history: filtered });
}

// ─── 7. task_generate_crontab ───────────────────────────────

export function handleTaskGenerateCrontab(args, ctx) {
  const projectDir = process.env.OPENCLAW_PROJECT_DIR
    || process.cwd();

  const crontabPath = generateCrontab(ctx.tasks, projectDir);
  const activeCount = ctx.tasks.filter(t => t.enabled && t.cron).length;

  return successResponse({
    path: crontabPath,
    active_tasks: activeCount,
    message: `Crontab file generated. Apply with: crontab ${crontabPath}`
  });
}
