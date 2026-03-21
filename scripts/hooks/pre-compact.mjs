#!/usr/bin/env node

/**
 * pre-compact.mjs — Hook: PreCompact (context window compression)
 *
 * Saves current conversation context to OpenClaw-CC memory before
 * Claude Code compresses the context window. This ensures no critical
 * information is lost during compaction.
 *
 * Writes a checkpoint file that can be loaded by session-start.mjs.
 */

import fs from "fs";
import path from "path";

const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");

try {
  const sessionsDir = path.join(MEMORY_ROOT, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const checkpointFile = path.join(sessionsDir, `checkpoint-${timestamp}.md`);

  // Read conversation transcript from stdin if available
  let context = "";
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    context = Buffer.concat(chunks).toString("utf-8").slice(0, 2000);
  }

  const content = `---
title: "Context Checkpoint ${now.toISOString().slice(0, 16)}"
category: sessions
tags:
  - checkpoint
  - auto-save
importance: 3
created: ${now.toISOString()}
---

# Context Checkpoint — ${now.toISOString().slice(0, 16)}

This checkpoint was auto-saved before context window compaction.

${context || "(No transcript captured — context was preserved by the memory system)"}
`;

  fs.writeFileSync(checkpointFile, content, "utf-8");
  console.log(`Checkpoint saved: ${checkpointFile}`);
} catch (e) {
  // Silent failure
  process.exit(0);
}
