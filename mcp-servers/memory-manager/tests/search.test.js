import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { db, MEMORY_ROOT } from "../src/db.js";
import { writeMemoryFile, ensureDirectories } from "../src/file-store.js";
import {
  fullTextSearch, searchByTag, searchByCategory,
  searchByDateRange, indexMemory, reindexAll,
} from "../src/search.js";

function cleanAll() {
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memories");
  db.exec("DELETE FROM memory_links");
  const categories = ["inbox", "projects", "people", "knowledge", "daily-logs", "tasks"];
  for (const cat of categories) {
    const dir = path.join(MEMORY_ROOT, cat);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  ensureDirectories();
}

beforeEach(() => {
  cleanAll();
});

describe("indexMemory", () => {
  it("새 항목 인덱싱", () => {
    const row = indexMemory("inbox/new.md", "inbox", null, "New Item", "tag1", "요약", "본문 내용", 5);
    expect(row).toBeTruthy();
    expect(row.title).toBe("New Item");
    expect(row.category).toBe("inbox");
  });

  it("동일 경로 업데이트", () => {
    indexMemory("inbox/upd.md", "inbox", null, "V1", "", "", "first", 5);
    indexMemory("inbox/upd.md", "inbox", null, "V2", "", "", "second", 7);
    const results = fullTextSearch("second", 10);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("V2");
  });

  it("subcategory 포함 인덱싱", () => {
    const row = indexMemory("projects/sapiens/test.md", "projects", "sapiens", "Sapiens", "", "", "content", 8);
    expect(row.subcategory).toBe("sapiens");
  });

  it("트랜잭션 원자성 (importance 범위 밖이면 실패)", () => {
    expect(() => indexMemory("bad.md", "inbox", null, "Bad", "", "", "c", 0)).toThrow();
  });
});

describe("fullTextSearch", () => {
  beforeEach(() => {
    indexMemory("k1.md", "knowledge", null, "React Hooks 가이드", "react,hooks", "React Hooks 사용법", "useEffect and useState for state management", 6);
    indexMemory("k2.md", "knowledge", null, "Python 기초", "python", "파이썬 입문", "파이썬으로 데이터 분석을 시작하자", 5);
    indexMemory("k3.md", "projects", null, "API 설계", "api,rest", "REST API", "RESTful API 설계 원칙과 모범 사례", 7);
  });

  it("영문 검색", () => {
    const results = fullTextSearch("React", 10);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("React Hooks 가이드");
  });

  it("한글 검색", () => {
    const results = fullTextSearch("파이썬", 10);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Python 기초");
  });

  it("snippet 포함", () => {
    const results = fullTextSearch("useState", 10);
    expect(results.length).toBe(1);
    expect(results[0].snippet).toBeTruthy();
  });

  it("매칭 없는 검색", () => {
    const results = fullTextSearch("nonexistentxyz", 10);
    expect(results.length).toBe(0);
  });

  it("쿼리 문법 에러 시 큰따옴표 재시도", () => {
    // 특수문자가 포함된 쿼리 — FTS5 문법 에러 유발 가능
    const results = fullTextSearch("React OR", 10);
    // 에러 없이 결과 반환 (0개 또는 1개)
    expect(Array.isArray(results)).toBe(true);
  });

  it("limit 적용", () => {
    const results = fullTextSearch("API OR React OR Python", 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});

describe("searchByTag", () => {
  beforeEach(() => {
    indexMemory("t1.md", "projects", null, "T1", "react,web", "", "c1", 5);
    indexMemory("t2.md", "knowledge", null, "T2", "react,mobile", "", "c2", 5);
    indexMemory("t3.md", "inbox", null, "T3", "python,data", "", "c3", 5);
  });

  it("정확 태그 검색", () => {
    const results = searchByTag("python", 10);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("T3");
  });

  it("부분 매칭 (react는 2건)", () => {
    const results = searchByTag("react", 10);
    expect(results.length).toBe(2);
  });

  it("없는 태그", () => {
    const results = searchByTag("java", 10);
    expect(results.length).toBe(0);
  });
});

describe("searchByCategory", () => {
  beforeEach(() => {
    indexMemory("c1.md", "projects", null, "P1", "", "", "c", 5);
    indexMemory("c2.md", "projects", null, "P2", "", "", "c", 5);
    indexMemory("c3.md", "inbox", null, "I1", "", "", "c", 5);
  });

  it("존재하는 카테고리", () => {
    const results = searchByCategory("projects", 10);
    expect(results.length).toBe(2);
  });

  it("없는 카테고리", () => {
    const results = searchByCategory("nonexistent", 10);
    expect(results.length).toBe(0);
  });
});

describe("searchByDateRange", () => {
  it("오늘 범위에 결과 포함", () => {
    indexMemory("dr.md", "inbox", null, "DateRange", "", "", "content", 5);
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const results = searchByDateRange(today, tomorrow, 10);
    expect(results.length).toBe(1);
  });
});

describe("reindexAll", () => {
  it("파일 기반 재인덱싱", () => {
    // 파일을 직접 생성 후 reindex
    writeMemoryFile("inbox/reindex1.md", {
      title: "Reindex 1", category: "inbox", tags: ["test"], importance: 5,
    }, "Reindex content one");
    writeMemoryFile("knowledge/reindex2.md", {
      title: "Reindex 2", category: "knowledge", tags: ["test"], importance: 6,
    }, "Reindex content two");

    const result = reindexAll();
    expect(result.indexed).toBe(2);
    expect(result.errors).toBe(0);

    // 재인덱싱 후 검색 가능
    const searchResults = fullTextSearch("Reindex", 10);
    expect(searchResults.length).toBe(2);
  });
});
