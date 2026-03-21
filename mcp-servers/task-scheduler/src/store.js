/**
 * store.js — JSON 파일 기반 태스크 저장소
 *
 * atomic write (임시 파일 → rename)로 데이터 무결성 보장.
 * Windows 크로스 디바이스(EXDEV) 폴백 포함.
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

/**
 * JSON 파일을 읽어 파싱. 파일 없거나 파싱 실패 시 fallback 반환.
 * @param {string} file - 파일 경로
 * @param {*} fallback - 기본값 (default: [])
 * @returns {*} 파싱된 데이터 또는 fallback
 */
export function loadJSON(file, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

/**
 * JSON 데이터를 atomic write로 저장.
 * os.tmpdir()에 임시 파일 작성 후 rename으로 교체.
 * Windows에서 드라이브 간 rename 불가(EXDEV) 시 copy+unlink 폴백.
 * @param {string} file - 저장할 파일 경로
 * @param {*} data - JSON 직렬화할 데이터
 */
export function saveJSON(file, data) {
  const content = JSON.stringify(data, null, 2);
  const tmpFile = path.join(
    os.tmpdir(),
    `openclaw-${crypto.randomBytes(4).toString("hex")}.tmp`
  );
  fs.writeFileSync(tmpFile, content, "utf-8");
  try {
    fs.renameSync(tmpFile, file);
  } catch (err) {
    if (err.code === "EXDEV") {
      fs.copyFileSync(tmpFile, file);
      fs.unlinkSync(tmpFile);
    } else {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore cleanup */ }
      throw err;
    }
  }
}

/**
 * 다음 태스크 ID 계산. 기존 태스크의 max(id) + 1, 비어있으면 1.
 * @param {Array} tasks - 태스크 배열
 * @returns {number}
 */
export function getNextId(tasks) {
  if (tasks.length === 0) return 1;
  return Math.max(...tasks.map(t => t.id)) + 1;
}
