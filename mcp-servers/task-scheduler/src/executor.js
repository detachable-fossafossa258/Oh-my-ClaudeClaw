/**
 * executor.js — Claude CLI 실행기
 *
 * child_process.exec (비동기)로 claude -p 명령을 호출하고
 * 구조화된 히스토리 엔트리를 반환한다.
 */

import { exec } from "child_process";
import path from "path";

const PROJECT_DIR = process.env.OPENCLAW_PROJECT_DIR
  || path.resolve(new URL(".", import.meta.url).pathname, "../..");

/**
 * Claude CLI를 호출하여 프롬프트를 실행한다.
 * @param {string} prompt - 실행할 프롬프트
 * @param {string[]} allowedTools - 허용할 MCP 도구 목록
 * @param {number} timeout - 타임아웃 밀리초 (기본 300000 = 5분)
 * @returns {Promise<{started:string, finished:string, status:string, output:string|null, error:string|null}>}
 */
export async function runTask(prompt, allowedTools = [], timeout = 300000) {
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  const toolsArg = allowedTools.length > 0
    ? ` --allowedTools "${allowedTools.join(",")}"`
    : "";
  const cmd = `cd "${PROJECT_DIR}" && claude -p "${escapedPrompt}"${toolsArg} --output-format text`;

  const started = new Date().toISOString();

  return new Promise((resolve) => {
    exec(cmd, { timeout, encoding: "utf-8", maxBuffer: 1024 * 1024 }, (error, stdout) => {
      const finished = new Date().toISOString();
      if (error) {
        resolve({
          started,
          finished,
          status: "error",
          output: null,
          error: error.message,
        });
      } else {
        resolve({
          started,
          finished,
          status: "completed",
          output: (stdout || "").slice(0, 2000),
          error: null,
        });
      }
    });
  });
}
