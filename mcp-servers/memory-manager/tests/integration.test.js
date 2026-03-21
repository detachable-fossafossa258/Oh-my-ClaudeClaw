import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { db, MEMORY_ROOT } from "../src/db.js";
import { ensureDirectories } from "../src/file-store.js";
import {
  handleMemoryStore, handleMemorySearch, handleMemoryGet,
  handleMemoryList, handleMemoryUpdate, handleMemoryDelete,
  handleMemoryDailyLog, handleMemoryStats,
} from "../src/tools.js";

function parseResponse(response) {
  return JSON.parse(response.content[0].text);
}

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

describe("전체 라이프사이클: store → search → get → update → get → delete → get", () => {
  it("CRUD 사이클 완주", () => {
    // 1. Store
    const storeRes = parseResponse(handleMemoryStore({
      category: "projects",
      subcategory: "sapiens",
      title: "PydanticAI 마이그레이션",
      content: "PydanticAI로 에이전트 프레임워크를 전환하기로 결정",
      tags: ["sapiens", "pydantic", "migration"],
      importance: 8,
      summary: "프레임워크 전환 결정",
    }));
    expect(storeRes.success).toBe(true);
    expect(storeRes.id).toBeTruthy();
    expect(storeRes.path).toContain("projects/sapiens");
    const memoryId = storeRes.id;

    // 2. Search
    const searchRes = parseResponse(handleMemorySearch({ query: "PydanticAI" }));
    expect(searchRes.count).toBe(1);
    expect(searchRes.results[0].title).toBe("PydanticAI 마이그레이션");

    // 3. Get
    const getRes = parseResponse(handleMemoryGet({ id: memoryId }));
    expect(getRes.title).toBe("PydanticAI 마이그레이션");
    expect(getRes.content).toContain("PydanticAI");
    expect(getRes.frontmatter.tags).toContain("sapiens");

    // 4. Update (append)
    const updateRes = parseResponse(handleMemoryUpdate({
      id: memoryId,
      mode: "append",
      content: "2단계: API 호환성 테스트 완료",
    }));
    expect(updateRes.success).toBe(true);

    // 5. Get (확인)
    const getUpdated = parseResponse(handleMemoryGet({ id: memoryId }));
    expect(getUpdated.content).toContain("2단계");
    expect(getUpdated.content).toContain("PydanticAI");

    // 6. Delete
    const deleteRes = parseResponse(handleMemoryDelete({ id: memoryId }));
    expect(deleteRes.success).toBe(true);

    // 7. Get (없음)
    const getDeleted = parseResponse(handleMemoryGet({ id: memoryId }));
    expect(getDeleted.error).toBe("Memory not found.");
  });
});

describe("memory_update 모드", () => {
  it("replace 모드", () => {
    const store = parseResponse(handleMemoryStore({
      category: "inbox", title: "Replace Test", content: "Original",
    }));
    handleMemoryUpdate({ id: store.id, mode: "replace", content: "Replaced Content" });
    const get = parseResponse(handleMemoryGet({ id: store.id }));
    expect(get.content.trim()).toBe("Replaced Content");
    expect(get.content).not.toContain("Original");
  });

  it("metadata 모드", () => {
    const store = parseResponse(handleMemoryStore({
      category: "inbox", title: "Meta Test", content: "Content", tags: ["old"], importance: 3,
    }));
    handleMemoryUpdate({ id: store.id, mode: "metadata", tags: ["new", "updated"], importance: 9 });
    const get = parseResponse(handleMemoryGet({ id: store.id }));
    expect(get.frontmatter.tags).toContain("new");
    expect(get.frontmatter.importance).toBe(9);
  });
});

describe("memory_daily_log", () => {
  it("같은 날 여러 번 추가", () => {
    const r1 = parseResponse(handleMemoryDailyLog({ entry: "첫 번째 로그", type: "note" }));
    expect(r1.success).toBe(true);

    const r2 = parseResponse(handleMemoryDailyLog({ entry: "두 번째 로그", type: "decision" }));
    expect(r2.success).toBe(true);

    const r3 = parseResponse(handleMemoryDailyLog({ entry: "세 번째 로그", type: "todo" }));
    expect(r3.success).toBe(true);

    // 파일이 하나만 존재하고 3개 항목 포함
    const today = new Date().toISOString().slice(0, 10);
    const filePath = path.join(MEMORY_ROOT, "daily-logs", `${today}.md`);
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("첫 번째 로그");
    expect(content).toContain("두 번째 로그");
    expect(content).toContain("세 번째 로그");
    expect(content).toContain("📝");
    expect(content).toContain("⚖️");
    expect(content).toContain("☐");
  });
});

describe("memory_stats", () => {
  it("저장 후 통계 정확도", () => {
    handleMemoryStore({ category: "projects", title: "P1", content: "c", tags: ["a"], importance: 7 });
    handleMemoryStore({ category: "projects", title: "P2", content: "c", tags: ["a"], importance: 9 });
    handleMemoryStore({ category: "inbox", title: "I1", content: "c", importance: 3 });

    const stats = parseResponse(handleMemoryStats());
    expect(stats.total_memories).toBe(3);

    const projects = stats.by_category.find(c => c.category === "projects");
    expect(projects.count).toBe(2);

    const inbox = stats.by_category.find(c => c.category === "inbox");
    expect(inbox.count).toBe(1);

    expect(stats.recent_activity.length).toBe(3);
  });
});

describe("memory_list", () => {
  it("트리 + 최근 목록 반환", () => {
    handleMemoryStore({ category: "inbox", title: "List Test", content: "c" });
    const res = parseResponse(handleMemoryList({ directory: "", max_depth: 2, limit: 10 }));
    expect(res.tree).toBeTruthy();
    expect(res.tree.type).toBe("directory");
    expect(res.recent.length).toBe(1);
  });
});

describe("memory_search 복합", () => {
  it("태그 검색", () => {
    handleMemoryStore({ category: "projects", title: "Web App", content: "c", tags: ["react", "web"] });
    handleMemoryStore({ category: "knowledge", title: "ML Guide", content: "c", tags: ["ml", "python"] });

    const res = parseResponse(handleMemorySearch({ tag: "react" }));
    expect(res.count).toBe(1);
    expect(res.results[0].title).toBe("Web App");
  });

  it("카테고리 검색", () => {
    handleMemoryStore({ category: "people", title: "Kim", content: "c" });
    handleMemoryStore({ category: "projects", title: "Proj", content: "c" });

    const res = parseResponse(handleMemorySearch({ category: "people" }));
    expect(res.count).toBe(1);
  });

  it("전체 목록 (조건 없음)", () => {
    handleMemoryStore({ category: "inbox", title: "A", content: "c" });
    handleMemoryStore({ category: "inbox", title: "B", content: "c" });

    const res = parseResponse(handleMemorySearch({}));
    expect(res.count).toBe(2);
  });
});

describe("에러 케이스", () => {
  it("잘못된 category", () => {
    const res = handleMemoryStore({ category: "invalid", title: "T", content: "c" });
    const data = parseResponse(res);
    expect(data.success).toBe(false);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("필수 필드 누락", () => {
    const res = handleMemoryStore({ category: "inbox" });
    const data = parseResponse(res);
    expect(data.success).toBe(false);
  });

  it("존재하지 않는 id로 get", () => {
    const res = parseResponse(handleMemoryGet({ id: 99999 }));
    expect(res.error).toBeTruthy();
  });

  it("존재하지 않는 id로 update", () => {
    const res = parseResponse(handleMemoryUpdate({ id: 99999, mode: "append", content: "c" }));
    expect(res.error).toBeTruthy();
  });

  it("존재하지 않는 id로 delete", () => {
    const res = parseResponse(handleMemoryDelete({ id: 99999 }));
    expect(res.error).toBeTruthy();
  });

  it("잘못된 mode", () => {
    const res = handleMemoryUpdate({ id: 1, mode: "invalid" });
    const data = parseResponse(res);
    expect(data.success).toBe(false);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("daily_log entry 누락", () => {
    const res = handleMemoryDailyLog({});
    const data = parseResponse(res);
    expect(data.success).toBe(false);
  });
});
