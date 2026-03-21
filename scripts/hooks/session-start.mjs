#!/usr/bin/env node

/**
 * session-start.mjs — Hook: Prompt (first prompt)
 *
 * Loads the most recent session summary from OpenClaw-CC memory
 * and injects it as additional context for the conversation.
 */

import { execSync } from "child_process";
import path from "path";

const MEMORY_ROOT = process.env.MEMORY_ROOT
  || path.join(process.env.HOME || process.env.USERPROFILE, "openclaw-cc/memory-store");

try {
  // Find the most recent session file
  const { readdirSync, readFileSync, existsSync } = await import("fs");
  const sessionsDir = path.join(MEMORY_ROOT, "sessions");

  if (!existsSync(sessionsDir)) {
    process.exit(0); // No sessions directory yet
  }

  const files = readdirSync(sessionsDir)
    .filter(f => f.endsWith(".md"))
    .sort()
    .reverse();

  if (files.length === 0) {
    process.exit(0);
  }

  const lastSession = readFileSync(path.join(sessionsDir, files[0]), "utf-8");

  // Extract frontmatter title and first 500 chars of content
  const titleMatch = lastSession.match(/^title:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1] : files[0].replace(".md", "");

  // Strip frontmatter
  const contentStart = lastSession.indexOf("---", 3);
  const content = contentStart > 0
    ? lastSession.slice(contentStart + 3).trim().slice(0, 500)
    : lastSession.slice(0, 500);

  console.log(`Previous session: ${title}\n${content}`);
} catch (e) {
  // Silent failure — hook should never block
  process.exit(0);
}
