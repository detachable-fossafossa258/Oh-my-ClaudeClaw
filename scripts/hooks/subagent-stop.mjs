#!/usr/bin/env node

/**
 * subagent-stop.mjs — Hook: SubagentComplete
 *
 * When an OMC agent (executor, debugger, tracer, etc.) completes,
 * logs a brief summary to OpenClaw-CC's daily log.
 */

import fs from "fs";
import path from "path";

const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");

try {
  // Read agent info from environment or stdin
  const agentType = process.env.AGENT_TYPE || "agent";
  const agentResult = process.env.AGENT_RESULT || "completed";

  const today = new Date().toISOString().slice(0, 10);
  const time = new Date().toTimeString().slice(0, 5);
  const filePath = path.join(MEMORY_ROOT, "daily-logs", `${today}.md`);

  const logEntry = `\n- 🤖 **[${time}]** ${agentType} agent ${agentResult}`;

  if (fs.existsSync(filePath)) {
    fs.appendFileSync(filePath, logEntry, "utf-8");
  } else {
    // Create with frontmatter
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const content = `---
title: "Daily Log - ${today}"
category: daily-logs
tags:
  - daily
  - "${today}"
importance: 3
created: ${new Date().toISOString()}
updated: ${new Date().toISOString()}
---

# ${today} Daily Log
${logEntry}`;
    fs.writeFileSync(filePath, content, "utf-8");
  }

  console.log(`Agent activity logged: ${agentType}`);
} catch (e) {
  // Silent failure
  process.exit(0);
}
