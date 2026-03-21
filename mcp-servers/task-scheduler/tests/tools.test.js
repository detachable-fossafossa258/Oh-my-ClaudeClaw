import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  handleTaskCreate,
  handleTaskList,
  handleTaskUpdate,
  handleTaskDelete,
  handleTaskHistory,
  handleTaskGenerateCrontab,
} from "../src/tools.js";

const TMP_DIR = path.join(os.tmpdir(), "openclaw-tools-test");
const TASKS_FILE = path.join(TMP_DIR, "tasks.json");
const HISTORY_FILE = path.join(TMP_DIR, "history.json");

function makeCtx(tasks = [], history = []) {
  return {
    tasks,
    history,
    saveTasks() { fs.writeFileSync(TASKS_FILE, JSON.stringify(this.tasks, null, 2)); },
    saveHistory() { fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2)); },
  };
}

function parseResponse(response) {
  return JSON.parse(response.content[0].text);
}

beforeEach(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  process.env.SCHEDULER_DATA = TMP_DIR;
  process.env.OPENCLAW_PROJECT_DIR = TMP_DIR;
});

afterEach(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  delete process.env.SCHEDULER_DATA;
  delete process.env.OPENCLAW_PROJECT_DIR;
});

// ─── task_create ──────────────────────────────────────────

describe("handleTaskCreate", () => {
  it("태스크 생성 + auto-increment ID", () => {
    const ctx = makeCtx();
    const r1 = parseResponse(handleTaskCreate({ name: "T1", prompt: "do1" }, ctx));
    expect(r1.success).toBe(true);
    expect(r1.task.id).toBe(1);
    expect(r1.task.name).toBe("T1");
    expect(r1.task.enabled).toBe(true);
    expect(r1.task.runCount).toBe(0);

    const r2 = parseResponse(handleTaskCreate({ name: "T2", prompt: "do2" }, ctx));
    expect(r2.task.id).toBe(2);
  });

  it("cron 검증 — 유효", () => {
    const ctx = makeCtx();
    const r = parseResponse(handleTaskCreate({ name: "T", prompt: "p", cron: "0 9 * * *" }, ctx));
    expect(r.success).toBe(true);
    expect(r.task.cron).toBe("0 9 * * *");
  });

  it("cron 검증 — 무효 시 에러", () => {
    const ctx = makeCtx();
    const r = handleTaskCreate({ name: "T", prompt: "p", cron: "bad" }, ctx);
    expect(r.isError).toBe(true);
  });

  it("필수 필드 누락 시 에러", () => {
    const ctx = makeCtx();
    const r = handleTaskCreate({ name: "T" }, ctx);
    expect(r.isError).toBe(true);
  });

  it("tags, allowedTools 기본값", () => {
    const ctx = makeCtx();
    const r = parseResponse(handleTaskCreate({ name: "T", prompt: "p" }, ctx));
    expect(r.task.tags).toEqual([]);
    expect(r.task.allowedTools).toEqual([]);
  });
});

// ─── task_list ────────────────────────────────────────────

describe("handleTaskList", () => {
  it("전체 목록 반환", () => {
    const ctx = makeCtx([
      { id: 1, enabled: true, tags: ["a"] },
      { id: 2, enabled: false, tags: ["b"] },
    ]);
    const r = parseResponse(handleTaskList({}, ctx));
    expect(r.count).toBe(2);
  });

  it("enabled_only 필터", () => {
    const ctx = makeCtx([
      { id: 1, enabled: true, tags: [] },
      { id: 2, enabled: false, tags: [] },
    ]);
    const r = parseResponse(handleTaskList({ enabled_only: true }, ctx));
    expect(r.count).toBe(1);
    expect(r.tasks[0].id).toBe(1);
  });

  it("tag 필터", () => {
    const ctx = makeCtx([
      { id: 1, enabled: true, tags: ["morning"] },
      { id: 2, enabled: true, tags: ["evening"] },
    ]);
    const r = parseResponse(handleTaskList({ tag: "morning" }, ctx));
    expect(r.count).toBe(1);
    expect(r.tasks[0].id).toBe(1);
  });
});

// ─── task_update ──────────────────────────────────────────

describe("handleTaskUpdate", () => {
  it("부분 업데이트 (name만)", () => {
    const ctx = makeCtx([{ id: 1, name: "Old", prompt: "p", enabled: true }]);
    const r = parseResponse(handleTaskUpdate({ id: 1, name: "New" }, ctx));
    expect(r.success).toBe(true);
    expect(r.task.name).toBe("New");
    expect(r.task.prompt).toBe("p");
    expect(r.task.updated).toBeTruthy();
  });

  it("enabled false로 변경", () => {
    const ctx = makeCtx([{ id: 1, name: "T", enabled: true }]);
    const r = parseResponse(handleTaskUpdate({ id: 1, enabled: false }, ctx));
    expect(r.task.enabled).toBe(false);
  });

  it("존재하지 않는 ID → 에러", () => {
    const ctx = makeCtx([]);
    const r = handleTaskUpdate({ id: 999 }, ctx);
    expect(r.isError).toBe(true);
  });

  it("잘못된 cron → 에러", () => {
    const ctx = makeCtx([{ id: 1, name: "T", cron: null }]);
    const r = handleTaskUpdate({ id: 1, cron: "invalid" }, ctx);
    expect(r.isError).toBe(true);
  });
});

// ─── task_delete ──────────────────────────────────────────

describe("handleTaskDelete", () => {
  it("삭제 성공", () => {
    const ctx = makeCtx([{ id: 1, name: "T1" }, { id: 2, name: "T2" }]);
    const r = parseResponse(handleTaskDelete({ id: 1 }, ctx));
    expect(r.success).toBe(true);
    expect(r.message).toContain("T1");
    expect(ctx.tasks.length).toBe(1);
  });

  it("존재하지 않는 ID → 에러", () => {
    const ctx = makeCtx([]);
    const r = handleTaskDelete({ id: 999 }, ctx);
    expect(r.isError).toBe(true);
  });
});

// ─── task_history ─────────────────────────────────────────

describe("handleTaskHistory", () => {
  it("최신순 반환", () => {
    const history = [
      { task_id: 1, started: "2026-01-01T00:00:00Z" },
      { task_id: 1, started: "2026-01-02T00:00:00Z" },
      { task_id: 1, started: "2026-01-03T00:00:00Z" },
    ];
    const ctx = makeCtx([], history);
    const r = parseResponse(handleTaskHistory({}, ctx));
    expect(r.history[0].started).toBe("2026-01-03T00:00:00Z");
    expect(r.history[2].started).toBe("2026-01-01T00:00:00Z");
  });

  it("task_id 필터", () => {
    const history = [
      { task_id: 1 },
      { task_id: 2 },
      { task_id: 1 },
    ];
    const ctx = makeCtx([], history);
    const r = parseResponse(handleTaskHistory({ task_id: 1 }, ctx));
    expect(r.count).toBe(2);
  });

  it("limit 적용 (기본 20)", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ task_id: 1, i }));
    const ctx = makeCtx([], history);
    const r = parseResponse(handleTaskHistory({}, ctx));
    expect(r.count).toBe(20);
  });

  it("커스텀 limit", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ task_id: 1, i }));
    const ctx = makeCtx([], history);
    const r = parseResponse(handleTaskHistory({ limit: 3 }, ctx));
    expect(r.count).toBe(3);
  });
});

// ─── task_generate_crontab ────────────────────────────────

describe("handleTaskGenerateCrontab", () => {
  it("crontab 파일 생성 + 경로 반환", () => {
    const tasks = [
      { id: 1, name: "T", prompt: "p", cron: "0 9 * * *", enabled: true, allowedTools: [] },
    ];
    const ctx = makeCtx(tasks);
    const r = parseResponse(handleTaskGenerateCrontab({}, ctx));
    expect(r.success).toBe(true);
    expect(r.path).toBeTruthy();
    expect(r.active_tasks).toBe(1);
    expect(r.message).toContain("crontab");
  });

  it("활성 태스크 없으면 0", () => {
    const ctx = makeCtx([{ id: 1, enabled: false, cron: "0 9 * * *" }]);
    const r = parseResponse(handleTaskGenerateCrontab({}, ctx));
    expect(r.active_tasks).toBe(0);
  });
});
