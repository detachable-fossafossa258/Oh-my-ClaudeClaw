/**
 * cron-gen.js — Crontab 파일 생성기 + cron 표현식 검증
 *
 * 활성 태스크를 crontab 형식으로 변환하여 파일로 출력.
 * claude -p 명령으로 각 태스크를 실행하는 cron 라인 생성.
 */

import fs from "fs";
import path from "path";

function getDataDir() {
  return process.env.SCHEDULER_DATA
    || path.join(process.env.HOME || process.env.USERPROFILE || ".", "openclaw-cc/scheduler-data");
}

/**
 * 활성 태스크들로부터 crontab 파일을 생성한다.
 * @param {Array} tasks - 전체 태스크 배열
 * @param {string} projectDir - 프로젝트 루트 절대 경로
 * @returns {string} 생성된 crontab 파일 경로
 */
export function generateCrontab(tasks, projectDir) {
  const dataDir = getDataDir();
  const crontabFile = path.join(dataDir, "generated.crontab");
  const logDir = path.join(dataDir, "logs");
  fs.mkdirSync(logDir, { recursive: true });

  const lines = [
    "# OpenClaw-CC Auto-generated Crontab",
    `# Generated: ${new Date().toISOString()}`,
    `# Project: ${projectDir}`,
    "",
  ];

  const activeTasks = tasks.filter(t => t.enabled && t.cron);

  for (const task of activeTasks) {
    const escapedPrompt = task.prompt.replace(/"/g, '\\"');
    const toolsArg = (task.allowedTools || []).join(",");
    const cmd = `cd ${projectDir} && claude -p "${escapedPrompt}" --allowedTools "${toolsArg}" >> ${logDir}/${task.id}.log 2>&1`;
    lines.push(`# ${task.name} (ID: ${task.id})`);
    lines.push(`${task.cron} ${cmd}`);
    lines.push("");
  }

  fs.writeFileSync(crontabFile, lines.join("\n"), "utf-8");
  return crontabFile;
}

// ─── Cron 표현식 검증 ───────────────────────────────────────

const FIELD_RANGES = [
  { name: "minute",  min: 0, max: 59 },
  { name: "hour",    min: 0, max: 23 },
  { name: "day",     min: 1, max: 31 },
  { name: "month",   min: 1, max: 12 },
  { name: "weekday", min: 0, max: 7 },
];

/**
 * 단일 cron 필드 값을 검증한다.
 * 지원: *, N, N-M, N,M,O, * /N, N-M/S
 * @param {string} value - 필드 값
 * @param {{name:string, min:number, max:number}} range - 허용 범위
 * @returns {string|null} 에러 메시지 또는 null (유효)
 */
function validateField(value, range) {
  // 와일드카드
  if (value === "*") return null;

  // 스텝: */N 또는 N-M/S
  if (value.includes("/")) {
    const [base, stepStr] = value.split("/");
    const step = parseInt(stepStr, 10);
    if (isNaN(step) || step < 1) {
      return `${range.name}: 잘못된 스텝 값 '${stepStr}'`;
    }
    if (base !== "*") {
      const err = validateField(base, range);
      if (err) return err;
    }
    return null;
  }

  // 리스트: N,M,O
  if (value.includes(",")) {
    for (const part of value.split(",")) {
      const err = validateField(part.trim(), range);
      if (err) return err;
    }
    return null;
  }

  // 범위: N-M
  if (value.includes("-")) {
    const [startStr, endStr] = value.split("-");
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) {
      return `${range.name}: 잘못된 범위 '${value}'`;
    }
    if (start < range.min || start > range.max || end < range.min || end > range.max) {
      return `${range.name}: 범위 초과 '${value}' (허용: ${range.min}-${range.max})`;
    }
    return null;
  }

  // 단일 숫자
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return `${range.name}: 숫자가 아닌 값 '${value}'`;
  }
  if (num < range.min || num > range.max) {
    return `${range.name}: 범위 초과 ${num} (허용: ${range.min}-${range.max})`;
  }
  return null;
}

/**
 * 5필드 표준 cron 표현식을 검증한다.
 * @param {string} expression - cron 표현식 (예: "0 9 * * 1-5")
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCron(expression) {
  if (!expression || typeof expression !== "string") {
    return { valid: false, error: "cron 표현식이 비어있습니다." };
  }

  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    return { valid: false, error: `5개 필드 필요 (입력: ${fields.length}개)` };
  }

  for (let i = 0; i < 5; i++) {
    const err = validateField(fields[i], FIELD_RANGES[i]);
    if (err) return { valid: false, error: err };
  }

  return { valid: true };
}
