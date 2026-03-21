#!/usr/bin/env node

/**
 * session-end.mjs — Hook: Stop
 *
 * On session end, creates a session summary in OpenClaw-CC memory.
 * Optionally sends a brief notification via Telegram.
 */

import fs from "fs";
import path from "path";

const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");

try {
  const sessionsDir = path.join(MEMORY_ROOT, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  const fileName = `session-${dateStr}-${timeStr.replace(":", "")}.md`;
  const filePath = path.join(sessionsDir, fileName);

  // Don't overwrite if already exists (prevent duplicate on multiple stop signals)
  if (fs.existsSync(filePath)) {
    process.exit(0);
  }

  const content = `---
title: "Session ${dateStr} ${timeStr}"
category: sessions
tags:
  - session
  - "${dateStr}"
importance: 3
created: ${now.toISOString()}
updated: ${now.toISOString()}
---

# Session ${dateStr} ${timeStr}

Session ended at ${timeStr}.

## Summary
(Auto-generated session end marker. Full summary is populated by session-tracker skill.)

## Carry Forward
- Check previous session for unfinished items
`;

  fs.writeFileSync(filePath, content, "utf-8");

  // Also append to today's daily log
  const dailyLogPath = path.join(MEMORY_ROOT, "daily-logs", `${dateStr}.md`);
  if (fs.existsSync(dailyLogPath)) {
    fs.appendFileSync(dailyLogPath, `\n- 🔚 **[${timeStr}]** Session ended`, "utf-8");
  }

  console.log(`Session end recorded: ${fileName}`);
} catch (e) {
  // Silent failure
  process.exit(0);
}
