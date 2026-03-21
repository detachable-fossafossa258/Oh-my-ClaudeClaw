import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { validateCron, generateCrontab } from "../src/cron-gen.js";

describe("validateCron", () => {
  it("유효한 표현식 통과", () => {
    expect(validateCron("0 9 * * 1-5")).toEqual({ valid: true });
    expect(validateCron("*/15 * * * *")).toEqual({ valid: true });
    expect(validateCron("0 0 1 1 *")).toEqual({ valid: true });
    expect(validateCron("30 21 * * 0")).toEqual({ valid: true });
    expect(validateCron("0,30 * * * *")).toEqual({ valid: true });
    expect(validateCron("0 9-17 * * *")).toEqual({ valid: true });
  });

  it("빈 입력 거부", () => {
    expect(validateCron("").valid).toBe(false);
    expect(validateCron(null).valid).toBe(false);
    expect(validateCron(undefined).valid).toBe(false);
  });

  it("필드 수 오류", () => {
    const r = validateCron("* *");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("5개 필드");
  });

  it("범위 초과 거부", () => {
    expect(validateCron("60 * * * *").valid).toBe(false);
    expect(validateCron("* 24 * * *").valid).toBe(false);
    expect(validateCron("* * 32 * *").valid).toBe(false);
    expect(validateCron("* * * 13 *").valid).toBe(false);
    expect(validateCron("* * * * 8").valid).toBe(false);
  });

  it("day 필드 0 거부 (1-31)", () => {
    expect(validateCron("0 0 0 * *").valid).toBe(false);
  });

  it("month 필드 0 거부 (1-12)", () => {
    expect(validateCron("0 0 * 0 *").valid).toBe(false);
  });

  it("잘못된 스텝 거부", () => {
    expect(validateCron("*/0 * * * *").valid).toBe(false);
  });

  it("숫자가 아닌 값 거부", () => {
    expect(validateCron("abc * * * *").valid).toBe(false);
  });

  it("복합 표현식 지원", () => {
    expect(validateCron("1-5/2 * * * *")).toEqual({ valid: true });
    expect(validateCron("0 9,12,18 * * 1-5")).toEqual({ valid: true });
  });

  it("weekday 7 허용 (일요일)", () => {
    expect(validateCron("0 0 * * 7")).toEqual({ valid: true });
  });
});

describe("generateCrontab", () => {
  const tmpDir = path.join(os.tmpdir(), "openclaw-cron-test");

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.SCHEDULER_DATA = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.SCHEDULER_DATA;
  });

  it("활성 태스크만 포함", () => {
    const tasks = [
      { id: 1, name: "Active", prompt: "do stuff", cron: "0 9 * * *", enabled: true, allowedTools: [] },
      { id: 2, name: "Disabled", prompt: "nope", cron: "0 10 * * *", enabled: false, allowedTools: [] },
      { id: 3, name: "NoCron", prompt: "manual", cron: null, enabled: true, allowedTools: [] },
    ];
    const result = generateCrontab(tasks, "/project");
    const content = fs.readFileSync(result, "utf-8");
    expect(content).toContain("Active (ID: 1)");
    expect(content).not.toContain("Disabled");
    expect(content).not.toContain("NoCron");
  });

  it("헤더 주석 포함", () => {
    const result = generateCrontab([], "/project");
    const content = fs.readFileSync(result, "utf-8");
    expect(content).toContain("# OpenClaw-CC Auto-generated Crontab");
    expect(content).toContain("# Project: /project");
    expect(content).toContain("# Generated:");
  });

  it("프롬프트 큰따옴표 이스케이핑", () => {
    const tasks = [
      { id: 1, name: "Quote", prompt: 'say "hello"', cron: "0 9 * * *", enabled: true, allowedTools: [] },
    ];
    const result = generateCrontab(tasks, "/project");
    const content = fs.readFileSync(result, "utf-8");
    expect(content).toContain('\\"hello\\"');
  });

  it("allowedTools를 쉼표 구분으로 포함", () => {
    const tasks = [
      { id: 1, name: "T", prompt: "p", cron: "* * * * *", enabled: true, allowedTools: ["memory-manager", "messenger-bot"] },
    ];
    const result = generateCrontab(tasks, "/project");
    const content = fs.readFileSync(result, "utf-8");
    expect(content).toContain("memory-manager,messenger-bot");
  });

  it("logs 디렉토리 자동 생성", () => {
    generateCrontab([], "/project");
    expect(fs.existsSync(path.join(tmpDir, "logs"))).toBe(true);
  });
});
