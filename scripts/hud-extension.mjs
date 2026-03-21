#!/usr/bin/env node

/**
 * hud-extension.mjs — OpenClaw-CC HUD Status Extension
 *
 * Extends OMC's HUD with OpenClaw-CC system status.
 * Shows: memory count, messenger status, next cron task, refinement health.
 *
 * Usage: Set in statusLine config or chain after OMC HUD.
 *   node scripts/hud-extension.mjs
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");
const DB_PATH = path.join(MEMORY_ROOT, "_memory.db");
const SCHEDULER_DATA = process.env.SCHEDULER_DATA
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/scheduler-data");

const parts = [];

// ─── Memory Stats ───────────────────────────────────────────
try {
  if (fs.existsSync(DB_PATH)) {
    const db = new Database(DB_PATH, { readonly: true });
    const total = db.prepare("SELECT COUNT(*) as cnt FROM memories").get();
    const layers = db.prepare(
      "SELECT layer, COUNT(*) as cnt FROM memories GROUP BY layer"
    ).all();

    const layerMap = {};
    for (const l of layers) layerMap[l.layer || "working"] = l.cnt;

    const e = layerMap.episodic || 0;
    const w = layerMap.working || 0;
    const lt = layerMap.longterm || 0;

    parts.push(`MEM:${total.cnt}(E${e}/W${w}/L${lt})`);
    db.close();
  } else {
    parts.push("MEM:--");
  }
} catch {
  parts.push("MEM:err");
}

// ─── Scheduler Status ───────────────────────────────────────
try {
  const tasksFile = path.join(SCHEDULER_DATA, "tasks.json");
  if (fs.existsSync(tasksFile)) {
    const tasks = JSON.parse(fs.readFileSync(tasksFile, "utf-8"));
    const enabled = tasks.filter(t => t.enabled).length;
    parts.push(`CRON:${enabled}`);
  } else {
    parts.push("CRON:0");
  }
} catch {
  parts.push("CRON:err");
}

// ─── Messenger Status ───────────────────────────────────────
try {
  const hasTg = !!process.env.TELEGRAM_BOT_TOKEN;
  const hasDc = !!process.env.DISCORD_BOT_TOKEN;
  const status = [];
  if (hasTg) status.push("TG");
  if (hasDc) status.push("DC");
  parts.push(status.length > 0 ? `MSG:${status.join("+")}` : "MSG:off");
} catch {
  parts.push("MSG:err");
}

// ─── Knowledge Graph Stats ──────────────────────────────────
try {
  if (fs.existsSync(DB_PATH)) {
    const db = new Database(DB_PATH, { readonly: true });
    const links = db.prepare("SELECT COUNT(*) as cnt FROM memory_links").get();
    const trigrams = db.prepare("SELECT COUNT(DISTINCT memory_id) as cnt FROM memory_trigrams").get();
    parts.push(`GRAPH:${links.cnt}links/${trigrams.cnt}idx`);
    db.close();
  }
} catch {
  // Skip silently
}

// ─── Output ─────────────────────────────────────────────────
const output = `[CC] ${parts.join(" | ")}`;
process.stdout.write(output);
