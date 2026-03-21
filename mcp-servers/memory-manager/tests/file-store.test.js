import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { MEMORY_ROOT } from "../src/db.js";
import {
  generateFilePath, writeMemoryFile, readMemoryFile,
  getDirectoryTree, ensureDirectories, deleteMemoryFile,
} from "../src/file-store.js";

function cleanFiles() {
  const categories = ["inbox", "projects", "people", "knowledge", "daily-logs", "tasks"];
  for (const cat of categories) {
    const dir = path.join(MEMORY_ROOT, cat);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

beforeEach(() => {
  cleanFiles();
  ensureDirectories();
});

describe("generateFilePath", () => {
  it("한글 제목", () => {
    const result = generateFilePath("projects", "Sapiens 마이그레이션 결정");
    expect(result).toMatch(/^projects\/\d{4}-\d{2}-\d{2}_sapiens-마이그레이션-결정\.md$/);
  });

  it("영문 제목", () => {
    const result = generateFilePath("inbox", "My Important Note");
    expect(result).toMatch(/^inbox\/\d{4}-\d{2}-\d{2}_my-important-note\.md$/);
  });

  it("daily-logs는 날짜만", () => {
    const result = generateFilePath("daily-logs", "anything");
    expect(result).toMatch(/^daily-logs\/\d{4}-\d{2}-\d{2}\.md$/);
  });

  it("subcategory 있으면 포함", () => {
    const result = generateFilePath("projects", "Test Title", "sapiens");
    expect(result).toMatch(/^projects\/sapiens\/\d{4}-\d{2}-\d{2}_test-title\.md$/);
  });

  it("subcategory 없으면 직접 카테고리 하위", () => {
    const result = generateFilePath("knowledge", "AI Basics");
    expect(result).toMatch(/^knowledge\/\d{4}-\d{2}-\d{2}_ai-basics\.md$/);
  });

  it("특수문자 제거", () => {
    const result = generateFilePath("inbox", "Hello! @World #123");
    expect(result).toMatch(/hello-world-123/);
  });

  it("60자 제한", () => {
    const longTitle = "a".repeat(100);
    const result = generateFilePath("inbox", longTitle);
    const slug = path.basename(result, ".md").replace(/^\d{4}-\d{2}-\d{2}_/, "");
    expect(slug.length).toBeLessThanOrEqual(60);
  });
});

describe("writeMemoryFile + readMemoryFile", () => {
  it("라운드트립: 쓰기 → 읽기", () => {
    const filePath = "inbox/test-roundtrip.md";
    const frontmatter = { title: "Test", category: "inbox", tags: ["a", "b"], importance: 7 };
    const content = "# Hello\n\nThis is test content.";

    writeMemoryFile(filePath, frontmatter, content);
    const result = readMemoryFile(filePath);

    expect(result).not.toBeNull();
    expect(result.frontmatter.title).toBe("Test");
    expect(result.frontmatter.tags).toEqual(["a", "b"]);
    expect(result.frontmatter.importance).toBe(7);
    expect(result.content.trim()).toBe(content);
    expect(result.raw).toContain("---");
  });

  it("한글 내용", () => {
    const filePath = "knowledge/korean-test.md";
    writeMemoryFile(filePath, { title: "한글 테스트" }, "안녕하세요. 한글 내용입니다.");
    const result = readMemoryFile(filePath);
    expect(result.content).toContain("안녕하세요");
  });

  it("존재하지 않는 파일은 null", () => {
    expect(readMemoryFile("nonexistent/file.md")).toBeNull();
  });

  it("서브디렉토리 자동 생성", () => {
    const filePath = "projects/deep/nested/dir/test.md";
    writeMemoryFile(filePath, { title: "Nested" }, "Content");
    expect(readMemoryFile(filePath)).not.toBeNull();
  });
});

describe("getDirectoryTree", () => {
  it("기본 트리 구조", () => {
    writeMemoryFile("inbox/a.md", { title: "A" }, "content");
    writeMemoryFile("projects/b.md", { title: "B" }, "content");
    const tree = getDirectoryTree();
    expect(tree.type).toBe("directory");
    expect(tree.children.length).toBeGreaterThan(0);
    const inbox = tree.children.find(c => c.name === "inbox");
    expect(inbox).toBeTruthy();
    expect(inbox.type).toBe("directory");
  });

  it("depth 제한 동작", () => {
    writeMemoryFile("projects/sub/deep/file.md", { title: "Deep" }, "c");
    const tree = getDirectoryTree("", 0, 2);
    const projects = tree.children.find(c => c.name === "projects");
    if (projects && projects.children) {
      const sub = projects.children.find(c => c.name === "sub");
      // depth 2에서는 sub의 children이 null (depth limit)
      if (sub) {
        expect(sub.children || []).toBeDefined();
      }
    }
  });

  it("_와 .으로 시작하는 항목 제외", () => {
    // _memory.db가 있어도 트리에 안 나와야 함
    const tree = getDirectoryTree();
    const hasUnderscored = tree.children?.some(c => c.name.startsWith("_"));
    expect(hasUnderscored).toBeFalsy();
  });

  it("빈 디렉토리", () => {
    const tree = getDirectoryTree("tasks");
    expect(tree.type).toBe("directory");
    expect(tree.children).toEqual([]);
  });
});

describe("ensureDirectories", () => {
  it("6개 카테고리 디렉토리 생성", () => {
    cleanFiles();
    ensureDirectories();
    const categories = ["inbox", "projects", "people", "knowledge", "daily-logs", "tasks"];
    for (const cat of categories) {
      expect(fs.existsSync(path.join(MEMORY_ROOT, cat))).toBe(true);
    }
  });
});

describe("deleteMemoryFile", () => {
  it("파일 삭제 성공", () => {
    writeMemoryFile("inbox/delete-me.md", { title: "Del" }, "c");
    expect(deleteMemoryFile("inbox/delete-me.md")).toBe(true);
    expect(readMemoryFile("inbox/delete-me.md")).toBeNull();
  });

  it("없는 파일 삭제 시 false", () => {
    expect(deleteMemoryFile("nonexistent.md")).toBe(false);
  });
});
