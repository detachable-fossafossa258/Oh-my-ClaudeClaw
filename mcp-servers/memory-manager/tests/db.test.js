import { describe, it, expect, beforeEach } from "vitest";
import {
  db, insert, search, searchByTag, searchByCategory,
  getById, getByPath, updateAccess, deleteById,
  listAll, listByCategory, insertFts, deleteFts,
} from "../src/db.js";

function cleanDb() {
  db.exec("DELETE FROM memories_fts");
  db.exec("DELETE FROM memories");
  db.exec("DELETE FROM memory_links");
}

beforeEach(() => {
  cleanDb();
});

describe("memories 테이블 CRUD", () => {
  it("insert + getById", () => {
    insert.run("test/hello.md", "inbox", null, "Hello", "tag1,tag2", "요약", 5);
    const row = db.prepare("SELECT * FROM memories WHERE file_path = ?").get("test/hello.md");
    expect(row).toBeTruthy();
    expect(row.title).toBe("Hello");
    expect(row.category).toBe("inbox");
    expect(row.tags).toBe("tag1,tag2");

    const byId = getById.get(row.id);
    expect(byId.title).toBe("Hello");
  });

  it("insert + getByPath", () => {
    insert.run("projects/sapiens/test.md", "projects", "sapiens", "Test", "", "", 7);
    const row = getByPath.get("projects/sapiens/test.md");
    expect(row).toBeTruthy();
    expect(row.subcategory).toBe("sapiens");
    expect(row.importance).toBe(7);
  });

  it("중복 INSERT는 REPLACE", () => {
    insert.run("dup.md", "inbox", null, "First", "", "", 3);
    insert.run("dup.md", "inbox", null, "Second", "", "", 8);
    const row = getByPath.get("dup.md");
    expect(row.title).toBe("Second");
    expect(row.importance).toBe(8);
  });

  it("updateAccess는 access_count 증가", () => {
    insert.run("acc.md", "inbox", null, "Access", "", "", 5);
    const row = getByPath.get("acc.md");
    expect(row.access_count).toBe(0);
    updateAccess.run(row.id);
    updateAccess.run(row.id);
    const updated = getById.get(row.id);
    expect(updated.access_count).toBe(2);
  });

  it("deleteById", () => {
    insert.run("del.md", "inbox", null, "Delete", "", "", 5);
    const row = getByPath.get("del.md");
    deleteById.run(row.id);
    expect(getById.get(row.id)).toBeUndefined();
  });

  it("빈 결과", () => {
    expect(getById.get(99999)).toBeUndefined();
    expect(getByPath.get("nonexistent.md")).toBeUndefined();
  });
});

describe("listAll / listByCategory", () => {
  it("전체 목록 반환", () => {
    insert.run("a.md", "inbox", null, "A", "", "", 5);
    insert.run("b.md", "projects", null, "B", "", "", 5);
    insert.run("c.md", "inbox", null, "C", "", "", 5);
    const all = listAll.all(10);
    expect(all.length).toBe(3);
    // 모든 항목 포함 확인 (datetime('now')가 동일할 수 있어 순서 미보장)
    const titles = all.map(r => r.title);
    expect(titles).toContain("A");
    expect(titles).toContain("B");
    expect(titles).toContain("C");
  });

  it("listByCategory 필터", () => {
    insert.run("i1.md", "inbox", null, "I1", "", "", 5);
    insert.run("p1.md", "projects", null, "P1", "", "", 5);
    insert.run("i2.md", "inbox", null, "I2", "", "", 5);
    const inbox = listByCategory.all("inbox", 10);
    expect(inbox.length).toBe(2);
    expect(inbox.every(r => r.category === "inbox")).toBe(true);
  });
});

describe("FTS5 검색", () => {
  function indexItem(filePath, title, tags, summary, content) {
    insert.run(filePath, "knowledge", null, title, tags, summary, 5);
    const row = getByPath.get(filePath);
    insertFts.run(row.id, title, tags, summary, content);
    return row;
  }

  it("영문 검색", () => {
    indexItem("en.md", "JavaScript Guide", "js,web", "JS guide", "Learn JavaScript basics");
    const results = search.all("JavaScript", 10);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("JavaScript Guide");
  });

  it("한글 검색", () => {
    indexItem("kr.md", "파이썬 기초", "python", "파이썬 입문서", "파이썬으로 프로그래밍을 시작합니다");
    const results = search.all("파이썬", 10);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("파이썬 기초");
  });

  it("매칭 없는 검색", () => {
    indexItem("x.md", "Test", "", "", "nothing special");
    const results = search.all("nonexistentword", 10);
    expect(results.length).toBe(0);
  });

  it("snippet 포함", () => {
    indexItem("sn.md", "Snippet Test", "", "", "This is a long content with specific keyword here");
    const results = search.all("keyword", 10);
    expect(results.length).toBe(1);
    expect(results[0].snippet).toBeTruthy();
  });

  it("FTS 삭제 후 검색 불가", () => {
    const row = indexItem("fdel.md", "FTS Delete", "", "", "findable content");
    deleteFts.run(row.id);
    const results = search.all("findable", 10);
    expect(results.length).toBe(0);
  });
});

describe("searchByTag / searchByCategory", () => {
  beforeEach(() => {
    insert.run("t1.md", "projects", null, "T1", "react,web", "", 5);
    insert.run("t2.md", "knowledge", null, "T2", "react,mobile", "", 5);
    insert.run("t3.md", "inbox", null, "T3", "python", "", 5);
  });

  it("태그 검색", () => {
    const results = searchByTag.all("%react%", 10);
    expect(results.length).toBe(2);
  });

  it("카테고리 검색", () => {
    const results = searchByCategory.all("projects", 10);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("T1");
  });
});

describe("importance CHECK 제약", () => {
  it("1-10 범위 내 정상", () => {
    expect(() => insert.run("ok1.md", "inbox", null, "OK", "", "", 1)).not.toThrow();
    expect(() => insert.run("ok10.md", "inbox", null, "OK", "", "", 10)).not.toThrow();
  });

  it("범위 밖은 에러", () => {
    expect(() => insert.run("bad0.md", "inbox", null, "Bad", "", "", 0)).toThrow();
    expect(() => insert.run("bad11.md", "inbox", null, "Bad", "", "", 11)).toThrow();
  });
});
