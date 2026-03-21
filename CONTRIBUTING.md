# Contributing to OpenClaw-CC

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

Be respectful, constructive, and inclusive. We welcome contributors of all experience levels.

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/Kit4Some/Oh-my-ClaudeClaw/issues)
- Include: steps to reproduce, expected vs actual behavior, environment details
- Label appropriately: `bug`, `feature`, `documentation`, `question`

### Submitting Changes

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Oh-my-ClaudeClaw.git
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following the conventions below
5. **Test** your changes:
   ```bash
   node scripts/gen-skill-docs.mjs    # Regenerate skills
   node scripts/skill-check.mjs       # Verify all skills healthy
   ```
6. **Commit** with conventional commit messages:
   ```bash
   git commit -m "feat: add new skill for X"
   git commit -m "fix: resolve memory dedup issue"
   ```
7. **Push** and create a Pull Request

### Commit Message Convention

```
<type>: <description>

[optional body]

Co-Authored-By: Your Name <email>
```

**Types:** `feat` (new feature), `fix` (bug fix), `docs` (documentation), `refactor` (code change that neither fixes nor adds), `test` (tests), `chore` (maintenance)

## Development Guide

### Adding a New Skill

1. Create `skills/your-skill/SKILL.md.tmpl` with YAML frontmatter
2. Use template placeholders for shared blocks:
   - `{{OCC_PREAMBLE}}` — universal preamble
   - `{{OCC_MEMORY_INIT}}` — memory context loading
   - `{{OCC_MEMORY_PERSIST}}` — result persistence
   - `{{OCC_COMPLETION_STATUS}}` — completion codes
3. Run `node scripts/gen-skill-docs.mjs your-skill` to generate
4. Run `node scripts/skill-check.mjs` to verify

### Modifying Template Blocks

1. Edit files in `scripts/template-blocks/*.md`
2. Run `node scripts/gen-skill-docs.mjs` to regenerate ALL skills
3. Verify no regressions with `node scripts/skill-check.mjs`

### Adding an MCP Tool

1. Add the tool implementation in the appropriate `mcp-servers/*/src/` directory
2. Register in the server's `index.js`
3. Update `CLAUDE.md` tool documentation
4. Update relevant agent files in `.claude/agents/`

### Modifying Agents

1. Edit files in `.claude/agents/*.md`
2. Follow the OMC pattern: Role, Why_This_Matters, Success_Criteria, Investigation_Protocol, Failure_Modes_To_Avoid, Final_Checklist

## File Structure Rules

- **Never edit `SKILL.md` directly** — edit `.tmpl` files and regenerate
- **Template blocks are shared** — changes affect all skills using that block
- **Agents use OMC patterns** — structured sections, not freeform prose
- **All content in English** — Korean trigger keywords in YAML `description:` are OK for matching

## Pull Request Checklist

- [ ] `node scripts/skill-check.mjs` passes (all skills FRESH)
- [ ] No hardcoded absolute paths
- [ ] All new content in English
- [ ] Conventional commit messages used
- [ ] CLAUDE.md updated if adding tools/skills/agents

## Questions?

Open an issue with the `question` label.
