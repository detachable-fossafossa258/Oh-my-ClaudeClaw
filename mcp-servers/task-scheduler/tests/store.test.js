import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { loadJSON, saveJSON, getNextId } from "../src/store.js";

const TMP_DIR = path.join(os.tmpdir(), "openclaw-store-test");
const TEST_FILE = path.join(TMP_DIR, "test.json");

beforeEach(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("loadJSON", () => {
  it("파일이 없으면 fallback 반환", () => {
    expect(loadJSON("/nonexistent/file.json", [])).toEqual([]);
    expect(loadJSON("/nonexistent/file.json", {})).toEqual({});
  });

  it("유효한 JSON 파일을 파싱", () => {
    fs.writeFileSync(TEST_FILE, JSON.stringify([{ id: 1, name: "test" }]), "utf-8");
    const result = loadJSON(TEST_FILE, []);
    expect(result).toEqual([{ id: 1, name: "test" }]);
  });

  it("잘못된 JSON이면 fallback 반환", () => {
    fs.writeFileSync(TEST_FILE, "not json{{{", "utf-8");
    expect(loadJSON(TEST_FILE, "default")).toBe("default");
  });

  it("빈 파일이면 fallback 반환", () => {
    fs.writeFileSync(TEST_FILE, "", "utf-8");
    expect(loadJSON(TEST_FILE, [])).toEqual([]);
  });
});

describe("saveJSON", () => {
  it("데이터를 JSON으로 저장하고 다시 읽기", () => {
    const data = [{ id: 1, name: "테스트 태스크" }];
    saveJSON(TEST_FILE, data);
    const loaded = JSON.parse(fs.readFileSync(TEST_FILE, "utf-8"));
    expect(loaded).toEqual(data);
  });

  it("기존 파일을 덮어쓰기", () => {
    saveJSON(TEST_FILE, { old: true });
    saveJSON(TEST_FILE, { new: true });
    const loaded = JSON.parse(fs.readFileSync(TEST_FILE, "utf-8"));
    expect(loaded).toEqual({ new: true });
  });

  it("한글 데이터 저장", () => {
    const data = { name: "모닝 브리핑", prompt: "오늘 일정 알려줘" };
    saveJSON(TEST_FILE, data);
    const loaded = JSON.parse(fs.readFileSync(TEST_FILE, "utf-8"));
    expect(loaded.name).toBe("모닝 브리핑");
  });

  it("pretty-print (2 space indent)", () => {
    saveJSON(TEST_FILE, { a: 1 });
    const raw = fs.readFileSync(TEST_FILE, "utf-8");
    expect(raw).toContain("  ");
  });
});

describe("getNextId", () => {
  it("빈 배열이면 1 반환", () => {
    expect(getNextId([])).toBe(1);
  });

  it("기존 태스크의 max(id) + 1 반환", () => {
    expect(getNextId([{ id: 3 }, { id: 1 }, { id: 5 }])).toBe(6);
  });

  it("단일 태스크", () => {
    expect(getNextId([{ id: 10 }])).toBe(11);
  });

  it("비연속 ID 처리", () => {
    expect(getNextId([{ id: 1 }, { id: 100 }])).toBe(101);
  });
});
