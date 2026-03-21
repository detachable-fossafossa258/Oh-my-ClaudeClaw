#!/usr/bin/env node

/**
 * OpenClaw-CC Skill Document Generator
 *
 * Converts SKILL.md.tmpl files to SKILL.md by resolving {{PLACEHOLDER}} references
 * from scripts/template-blocks/*.md files.
 *
 * Usage:
 *   node scripts/gen-skill-docs.mjs           # Generate all skills
 *   node scripts/gen-skill-docs.mjs ship       # Generate specific skill
 *   node scripts/gen-skill-docs.mjs --dry-run  # Preview without writing
 *
 * Inspired by gstack's gen-skill-docs.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const BLOCKS_DIR = join(__dirname, 'template-blocks');
const HEADER = '<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Run: node scripts/gen-skill-docs.mjs -->\n\n';

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');
const targetSkill = args.find(a => !a.startsWith('-'));

// Load all template blocks
function loadBlocks() {
  const blocks = new Map();

  if (!existsSync(BLOCKS_DIR)) {
    console.error(`ERROR: Template blocks directory not found: ${BLOCKS_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const name = basename(file, '.md');
    // Convert kebab-case filename to UPPER_SNAKE placeholder
    // e.g., "memory-init.md" -> "OCC_MEMORY_INIT"
    const placeholder = 'OCC_' + name.toUpperCase().replace(/-/g, '_');
    const content = readFileSync(join(BLOCKS_DIR, file), 'utf-8').trim();
    blocks.set(placeholder, content);

    if (verbose) {
      console.log(`  Loaded block: {{${placeholder}}} from ${file}`);
    }
  }

  return blocks;
}

// Find all skill directories with .tmpl files
function findSkills(target) {
  const skills = [];

  if (!existsSync(SKILLS_DIR)) {
    console.error(`ERROR: Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const dirs = readdirSync(SKILLS_DIR).filter(d => {
    const fullPath = join(SKILLS_DIR, d);
    return statSync(fullPath).isDirectory();
  });

  for (const dir of dirs) {
    if (target && dir !== target) continue;

    const tmplPath = join(SKILLS_DIR, dir, 'SKILL.md.tmpl');
    const outPath = join(SKILLS_DIR, dir, 'SKILL.md');

    if (existsSync(tmplPath)) {
      skills.push({ name: dir, tmplPath, outPath });
    }
  }

  return skills;
}

// Resolve all {{PLACEHOLDER}} references in template content
function resolveTemplate(content, blocks, skillName) {
  let resolved = content;
  let unresolvedCount = 0;
  const unresolvedNames = [];

  // Replace all {{PLACEHOLDER}} patterns
  resolved = resolved.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (blocks.has(name)) {
      return blocks.get(name);
    }

    // Check for skill-specific placeholder (no error, just leave it)
    unresolvedCount++;
    unresolvedNames.push(name);
    return match; // Leave unresolved placeholders as-is
  });

  if (unresolvedCount > 0 && verbose) {
    console.warn(`  ⚠ ${skillName}: ${unresolvedCount} unresolved placeholder(s): ${unresolvedNames.join(', ')}`);
  }

  return resolved;
}

// Compute simple hash for change detection
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

// Main
function main() {
  console.log('OpenClaw-CC Skill Document Generator');
  console.log('====================================\n');

  if (dryRun) console.log('DRY RUN — no files will be written\n');

  // Load blocks
  const blocks = loadBlocks();
  console.log(`Loaded ${blocks.size} template blocks from ${BLOCKS_DIR}\n`);

  // Find skills
  const skills = findSkills(targetSkill);

  if (skills.length === 0) {
    if (targetSkill) {
      console.error(`No SKILL.md.tmpl found for skill: ${targetSkill}`);
      console.log(`\nAvailable skills with templates:`);
      const all = findSkills(null);
      all.forEach(s => console.log(`  - ${s.name}`));
    } else {
      console.log('No SKILL.md.tmpl files found. Create templates first.');
      console.log(`\nSkills without templates:`);
      const dirs = readdirSync(SKILLS_DIR).filter(d => {
        const fullPath = join(SKILLS_DIR, d);
        return statSync(fullPath).isDirectory() && !existsSync(join(fullPath, 'SKILL.md.tmpl'));
      });
      dirs.forEach(d => console.log(`  - ${d}`));
    }
    process.exit(1);
  }

  // Process each skill
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const skill of skills) {
    try {
      const tmplContent = readFileSync(skill.tmplPath, 'utf-8');
      const resolved = resolveTemplate(tmplContent, blocks, skill.name);
      const output = HEADER + resolved;

      // Check if output differs from existing
      if (existsSync(skill.outPath)) {
        const existing = readFileSync(skill.outPath, 'utf-8');
        if (existing === output) {
          if (verbose) console.log(`  ✓ ${skill.name}: unchanged (skipped)`);
          skipped++;
          continue;
        }
      }

      if (!dryRun) {
        writeFileSync(skill.outPath, output, 'utf-8');
      }

      console.log(`  ${dryRun ? '○' : '●'} ${skill.name}: generated`);
      generated++;

    } catch (err) {
      console.error(`  ✗ ${skill.name}: ERROR — ${err.message}`);
      errors++;
    }
  }

  // Summary
  console.log(`\n────────────────────────────────`);
  console.log(`Total: ${skills.length} skills`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Unchanged: ${skipped}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
  console.log(`────────────────────────────────`);

  if (errors > 0) process.exit(1);
}

main();
