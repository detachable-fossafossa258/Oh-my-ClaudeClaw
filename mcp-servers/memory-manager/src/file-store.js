/**
 * file-store.js — MD 파일 트리 CRUD
 *
 * 메모리를 Markdown 파일로 저장/읽기/탐색하는 모듈.
 * 모든 파일 I/O는 동기 함수 사용 (MCP는 순차 처리).
 * gray-matter로 frontmatter 파싱/생성.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MEMORY_ROOT } from "./db.js";

// ─── 카테고리 목록 ──────────────────────────────────────────
const CATEGORIES = ["inbox", "projects", "people", "knowledge", "daily-logs", "tasks"];

/**
 * 카테고리 디렉토리 존재 보장
 * 없으면 recursive 생성
 */
export function ensureDirectories() {
  for (const cat of CATEGORIES) {
    fs.mkdirSync(path.join(MEMORY_ROOT, cat), { recursive: true });
  }
  console.error("[file-store] Category directories ensured");
}

/**
 * 파일 경로 생성
 *
 * 규칙:
 *   daily-logs → "daily-logs/YYYY-MM-DD.md"
 *   subcategory 있으면 → "{category}/{subcategory}/{date}_{slug}.md"
 *   없으면 → "{category}/{date}_{slug}.md"
 *
 * slug 생성:
 *   소문자 변환 → 한글/영문/숫자/공백/하이픈만 보존 → 공백→하이픈 → 60자 제한
 *
 * @param {string} category - 카테고리
 * @param {string} title - 메모리 제목
 * @param {string|null} subcategory - 서브카테고리
 * @returns {string} memory-store 기준 상대 경로
 */
export function generateFilePath(category, title, subcategory = null) {
  const date = new Date().toISOString().slice(0, 10);

  // daily-logs는 날짜만
  if (category === "daily-logs") {
    return path.posix.join(category, `${date}.md`);
  }

  // slug 생성
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);

  if (subcategory) {
    return path.posix.join(category, subcategory, `${date}_${slug}.md`);
  }
  return path.posix.join(category, `${date}_${slug}.md`);
}

/**
 * 메모리 파일 쓰기
 *
 * gray-matter.stringify로 frontmatter + content를 MD 파일로 저장.
 * 디렉토리가 없으면 자동 생성. UTF-8, BOM 없음.
 *
 * @param {string} filePath - memory-store 기준 상대 경로
 * @param {object} frontmatter - frontmatter 데이터
 * @param {string} content - Markdown 본문
 * @returns {string} 절대 경로
 */
export function writeMemoryFile(filePath, frontmatter, content) {
  const fullPath = path.join(MEMORY_ROOT, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(fullPath, fileContent, "utf-8");
  console.error(`[file-store] Written: ${filePath}`);
  return fullPath;
}

/**
 * 메모리 파일 읽기
 *
 * gray-matter로 frontmatter + content 파싱.
 *
 * @param {string} filePath - memory-store 기준 상대 경로
 * @returns {{ frontmatter: object, content: string, raw: string } | null}
 */
export function readMemoryFile(filePath) {
  const fullPath = path.join(MEMORY_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return null;

  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  return { frontmatter: data, content, raw };
}

/**
 * 재귀 디렉토리 트리 탐색
 *
 * _로 시작하는 파일/폴더, .으로 시작하는 것 제외.
 *
 * @param {string} dirPath - memory-store 기준 상대 경로 ("" 또는 "." = 루트)
 * @param {number} depth - 현재 깊이
 * @param {number} maxDepth - 최대 깊이
 * @returns {{ name: string, type: string, path: string, children?: array } | null}
 */
export function getDirectoryTree(dirPath = "", depth = 0, maxDepth = 3) {
  if (depth >= maxDepth) return null;

  const resolvedDir = dirPath && dirPath !== "." ? dirPath : "";
  const fullPath = path.join(MEMORY_ROOT, resolvedDir);
  if (!fs.existsSync(fullPath)) return { name: dirPath || "memory-store", type: "missing" };

  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    return { name: path.basename(dirPath), type: "file", path: dirPath };
  }

  const entries = fs.readdirSync(fullPath)
    .filter(e => !e.startsWith("_") && !e.startsWith("."))
    .map(e => {
      const childPath = resolvedDir ? path.posix.join(resolvedDir, e) : e;
      const childFull = path.join(MEMORY_ROOT, childPath);
      const childStat = fs.statSync(childFull);
      if (childStat.isDirectory()) {
        return getDirectoryTree(childPath, depth + 1, maxDepth);
      }
      return { name: e, type: "file", path: childPath };
    });

  return {
    name: path.basename(fullPath) || "memory-store",
    type: "directory",
    path: resolvedDir || ".",
    children: entries.filter(Boolean),
  };
}

/**
 * 메모리 파일 삭제
 *
 * @param {string} filePath - memory-store 기준 상대 경로
 * @returns {boolean} 삭제 성공 여부
 */
export function deleteMemoryFile(filePath) {
  const fullPath = path.join(MEMORY_ROOT, filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.error(`[file-store] Deleted: ${filePath}`);
    return true;
  }
  return false;
}
