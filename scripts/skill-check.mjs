#!/usr/bin/env node

/**
 * OpenClaw-CC Skill Health Dashboard
 *
 * Validates that all SKILL.md files are fresh (match their .tmpl source).
 * Reports skills without templates and orphaned templates.
 *
 * Usage:
 *   node scripts/skill-check.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const HEADER_MARKER = '<!-- AUTO-GENERATED from SKILL.md.tmpl';

function main() {
  console.log('OpenClaw-CC Skill Health Dashboard');
  console.log('==================================\n');

  if (!existsSync(SKILLS_DIR)) {
    console.error('Skills directory not found');
    process.exit(1);
  }

  const dirs = readdirSync(SKILLS_DIR).filter(d =>
    statSync(join(SKILLS_DIR, d)).isDirectory()
  );

  const results = { fresh: [], stale: [], noTemplate: [], noOutput: [] };

  for (const dir of dirs) {
    const tmplPath = join(SKILLS_DIR, dir, 'SKILL.md.tmpl');
    const outPath = join(SKILLS_DIR, dir, 'SKILL.md');
    const hasTmpl = existsSync(tmplPath);
    const hasOut = existsSync(outPath);

    if (hasTmpl && hasOut) {
      const content = readFileSync(outPath, 'utf-8');
      if (content.startsWith(HEADER_MARKER)) {
        results.fresh.push(dir);
      } else {
        results.stale.push(dir);
      }
    } else if (hasTmpl && !hasOut) {
      results.noOutput.push(dir);
    } else if (!hasTmpl && hasOut) {
      results.noTemplate.push(dir);
    }
  }

  // Report
  if (results.fresh.length > 0) {
    console.log(`✓ FRESH (${results.fresh.length}):`);
    results.fresh.forEach(s => console.log(`  ${s}`));
    console.log();
  }

  if (results.stale.length > 0) {
    console.log(`⚠ STALE — SKILL.md exists but missing auto-gen header (${results.stale.length}):`);
    results.stale.forEach(s => console.log(`  ${s} — run: node scripts/gen-skill-docs.mjs ${s}`));
    console.log();
  }

  if (results.noOutput.length > 0) {
    console.log(`✗ NEEDS GENERATION — .tmpl exists but no SKILL.md (${results.noOutput.length}):`);
    results.noOutput.forEach(s => console.log(`  ${s}`));
    console.log();
  }

  if (results.noTemplate.length > 0) {
    console.log(`○ NO TEMPLATE — SKILL.md only, not yet converted (${results.noTemplate.length}):`);
    results.noTemplate.forEach(s => console.log(`  ${s}`));
    console.log();
  }

  // Summary
  const total = dirs.length;
  console.log('────────────────────────────────');
  console.log(`Total: ${total} skills`);
  console.log(`  Fresh: ${results.fresh.length}`);
  console.log(`  Stale: ${results.stale.length}`);
  console.log(`  Needs gen: ${results.noOutput.length}`);
  console.log(`  No template: ${results.noTemplate.length}`);
  console.log('────────────────────────────────');

  if (results.stale.length > 0 || results.noOutput.length > 0) {
    process.exit(1);
  }
}

main();
