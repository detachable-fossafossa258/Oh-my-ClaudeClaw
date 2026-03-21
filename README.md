<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQyIDAtOC0zLjU4LTgtOHMzLjU4LTggOC04IDggMy41OCA4IDgtMy41OCA4LTggOHoiLz48L3N2Zz4="/>
  <img src="https://img.shields.io/badge/MCP_Servers-5-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Skills-21-orange?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Tools-31-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>
</p>

# OpenClaw-CC

**Autonomous AI Assistant Plugin for Claude Code**

> Turn Claude Code into a self-improving autonomous assistant with persistent memory, systematic debugging, automated releases, QA cycles, and multi-agent orchestration.

**[Quick Start](#-quick-start)** · **[Features](#-features)** · **[Skills](#-skills-21)** · **[Architecture](#-architecture)** · **[Plugin Install](#-plugin-installation)** · **[Contributing](CONTRIBUTING.md)**

---

## Why OpenClaw-CC?

| Without | With OpenClaw-CC |
|---------|-----------------|
| Every session starts from zero | **3-tier persistent memory** across all sessions |
| Manual debugging guesswork | **6-step systematic debugging** with Iron Law |
| Copy-paste release workflow | **8.5-step automated ship** (test→review→PR) |
| No safety nets | **Hook-based guardrails** (freeze, careful, guard) |
| Single-agent limitations | **19 OMC agents** + 4 project agents orchestrated |
| No external notifications | **Discord/Telegram** real-time alerts |
| Stale API knowledge | **4,400+ curated docs** via Context Hub |

---

## Quick Start

### Option A: Plugin Installation (Recommended)

```bash
# 1. Add marketplace
/plugin marketplace add https://github.com/Kit4Some/Oh-my-ClaudeClaw

# 2. Install plugin
/plugin install openclaw-cc@openclaw-cc

# 3. Install MCP dependencies
cd ~/.claude/plugins/cache/openclaw-cc/openclaw-cc/latest
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..
```

### Option B: Manual Installation

```bash
# 1. Clone
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. Install dependencies
for dir in mcp-servers/*/; do (cd "$dir" && npm install); done

# 3. (Optional) Install Context Hub for API doc fetching
npm install -g @aisuite/chub

# 4. Generate skills from templates
node scripts/gen-skill-docs.mjs

# 5. Launch
claude
```

### Environment Setup (Optional)

For Discord/Telegram integration, create `.env`:

```bash
DISCORD_BOT_TOKEN=your_token
DISCORD_CHANNEL_ID=your_channel
DISCORD_WEBHOOK_URL=your_webhook
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Prerequisites

- [Claude Code](https://claude.ai/code) with active subscription
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) plugin
- Node.js >= 18

---

## Features

### 3-Tier Persistent Memory

```
Episodic (30d)  →  Working (30d)  →  Long-term (permanent)
  daily-logs         tasks              knowledge
  captures           sessions           projects
                     inbox              people
```

- **FTS5 full-text search** with associative mode (5-signal ranking)
- **Knowledge graph** with 6 relation types (related, derived, supersedes, blocks, contradicts, refines)
- **Trigram similarity search** for deduplication (no external API)
- **Automatic refinement pipeline**: nightly dedup, weekly decay, monthly summary

### Multi-Agent Orchestration

19 OMC agents + 4 project-local agents with intelligent routing:

| Tier | Model | Agents |
|------|-------|--------|
| Quick | Haiku | explore, writer, comms-agent, session-manager |
| Standard | Sonnet | executor, debugger, tracer, verifier, test-engineer, designer, scientist, memory-specialist, research-agent |
| Complex | Opus | analyst, planner, architect, critic, code-reviewer, code-simplifier, product-manager |

### Safety System (from gstack)

| Skill | Protection |
|-------|-----------|
| `/freeze` | Blocks Edit/Write outside a chosen directory via PreToolUse hooks |
| `/careful` | Warns before `rm -rf`, `DROP TABLE`, `force-push`, `reset --hard`, etc. |
| `/guard` | Activates both freeze + careful simultaneously |

### Skill Template System

21 skills generated from `.tmpl` templates with 11 shared blocks — zero duplication:

```bash
node scripts/gen-skill-docs.mjs           # regenerate all
node scripts/gen-skill-docs.mjs ship       # regenerate one
node scripts/skill-check.mjs              # health dashboard
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Claude Code                            │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────────┐ │
│  │ 21 Skills │  │ 4 Agents  │  │   oh-my-claudecode (OMC)  │ │
│  │ template  │  │ memory    │  │   19 specialized agents   │ │
│  │ generated │  │ comms     │  │   team orchestration      │ │
│  │           │  │ research  │  │   LSP/AST/Python tools    │ │
│  │           │  │ session   │  │   state management        │ │
│  └─────┬─────┘  └─────┬─────┘  └────────────┬──────────────┘ │
│        │               │                      │               │
│  ┌─────▼───────────────▼──────────────────────▼─────────────┐ │
│  │               5 MCP Servers (31 tools)                    │ │
│  │                                                           │ │
│  │  memory-manager (9)  ·  knowledge-engine (6)              │ │
│  │  messenger-bot  (4)  ·  task-scheduler  (7)               │ │
│  │  context-hub    (5)                                       │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │              3-Tier Persistent Memory                      │ │
│  │                                                           │ │
│  │  Episodic (30d) ──→ Working (30d) ──→ Long-term (∞)      │ │
│  │                                                           │ │
│  │  SQLite FTS5 · Knowledge Graph · Trigram Similarity       │ │
│  │  Associative Search (5 signals) · Auto-Refinement         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │           External Integrations                            │ │
│  │  Discord · Telegram · Context Hub (4,400+ API docs)       │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## MCP Servers (5 servers, 31 tools)

| Server | Tools | Key Capabilities |
|--------|-------|-----------------|
| **memory-manager** | 9 | `memory_store` `memory_search` `memory_get` `memory_update` `memory_delete` `memory_daily_log` `memory_search_date` `memory_list` `memory_stats` |
| **knowledge-engine** | 6 | `memory_link` `memory_graph` `memory_similar` `memory_refine` `memory_archive` `memory_reindex_trigrams` |
| **messenger-bot** | 4 | `messenger_send` `messenger_read` `messenger_poll` `messenger_status` |
| **task-scheduler** | 7 | `task_create` `task_list` `task_update` `task_delete` `task_run_now` `task_history` `task_generate_crontab` |
| **context-hub** | 5 | `chub_search` `chub_get` `chub_list` `chub_annotate` `chub_feedback` |

---

## Skills (21)

### Workflow Skills

| Skill | What It Does |
|-------|-------------|
| `/ship` | **8.5-step release automation**: pre-flight → merge base → test → coverage audit → pre-landing review → version bump → changelog → bisectable commits → verification gate → push → PR → notify |
| `/investigate` | **6-step systematic debugging**: gather evidence → reproduce → scope lock → pattern analysis → hypothesis testing (3-strike rule) → verified fix with regression test |
| `/code-review` | **Multi-pass review**: scope drift detection → mechanical auto-fix (Pass 1) → security audit (Pass 2) → judgment items (Pass 3) → doc staleness check → WTF-likelihood gate |
| `/qa` | **Test-Fix-Verify cycle**: baseline → triage (Quick/Standard/Exhaustive) → fix loop with atomic commits → regression tests → WTF-likelihood self-regulation (hard cap: 50 fixes) |
| `/office-hours` | **Idea validation**: Startup mode (6 forcing questions) or Builder mode (generative brainstorming) → landscape search → premise challenge → forced alternatives → design document |
| `/retro` | **Engineering retrospective**: git + memory data → metrics table → time distribution → session detection → commit analysis → hotspots → focus score → streak tracking → trend comparison |

### Core Skills

| Skill | What It Does |
|-------|-------------|
| `/task-analyzer` | Decompose complex tasks → route to appropriate agents → execute → report |
| `/memory-ops` | Store, search, organize persistent memories with importance scoring |
| `/research-collector` | Multi-angle web research → structured output → dedup → store |
| `/daily-routine` | Morning briefing, task management, evening review, weekly retrospective |
| `/doc-fetcher` | Fetch API docs from Context Hub (4,400+ libraries) with annotations and feedback |

### Safety Skills

| Skill | What It Does |
|-------|-------------|
| `/freeze` | Block Edit/Write outside a chosen directory (hook-based, session-scoped) |
| `/careful` | Warn before destructive commands: `rm -rf`, `DROP TABLE`, `force-push`, `reset --hard` |
| `/guard` | Activate freeze + careful simultaneously for maximum safety |
| `/unfreeze` | Remove edit restrictions |

### Advanced Skills

| Skill | What It Does |
|-------|-------------|
| `/knowledge-refiner` | Detect duplicates, merge, archive stale, promote layers, reindex |
| `/session-tracker` | Dual-write to OMC state + persistent memory for cross-session continuity |
| `/web-researcher` | Multi-angle web search with evidence ranking and knowledge graph integration |
| `/autonomous-ops` | 24/7 messenger-driven autonomous loop: poll → analyze → dispatch → persist → report |
| `/knowledge-sync` | Bidirectional sync between OMC ephemeral state and persistent memory |
| `/deep-research` | 3 parallel research agents → analyst synthesis → critic review → knowledge graph |

---

## Builder Ethos

Five principles embedded in every skill via `{{OCC_ETHOS}}` template block ([full document](docs/ETHOS.md)):

| Principle | Core Idea |
|-----------|-----------|
| **Boil the Lake** | AI makes complete implementation near-free. Do the complete thing, every time. |
| **Search Before Building** | Memory (L0) → Standard patterns (L1) → Current trends (L2) → First principles (L3) |
| **Build for Yourself** | Specificity of a real problem beats generality of a hypothetical one |
| **Memory is Cheap** | Always store, always search. Let the refinement pipeline handle cleanup. |
| **Delegate or Die** | Right agent, right model. Never self-approve. Separate authoring from review. |

---

## Project Structure

```
Oh-my-ClaudeClaw/
├── .claude-plugin/
│   ├── plugin.json            # Plugin manifest
│   └── marketplace.json       # Marketplace catalog
├── .claude/
│   ├── agents/                # 4 project-local agents (OMC-quality prompts)
│   └── settings.local.json    # 5 lifecycle hooks
├── .mcp.json                  # 5 MCP server configurations
├── CLAUDE.md                  # Project instructions (loaded by Claude Code)
│
├── skills/                    # 21 skills
│   ├── {skill}/SKILL.md.tmpl  #   Template source (edit this)
│   └── {skill}/SKILL.md       #   Auto-generated (don't edit)
│
├── mcp-servers/
│   ├── memory-manager/        # 9 tools — SQLite FTS5 + associative search
│   ├── knowledge-engine/      # 6 tools — graph, similarity, refinement
│   ├── messenger-bot/         # 4 tools — Discord/Telegram
│   └── task-scheduler/        # 7 tools — cron + claude CLI execution
│
├── scripts/
│   ├── gen-skill-docs.mjs     # SKILL.md.tmpl → SKILL.md generator
│   ├── skill-check.mjs        # Health dashboard
│   ├── template-blocks/       # 11 shared blocks (preamble, memory, etc.)
│   └── hooks/                 # 5 lifecycle hooks (.mjs)
│
├── memory-store/              # Persistent memory (gitignored data)
├── docs/ETHOS.md              # Builder philosophy
├── package.json               # Build scripts
├── LICENSE                    # MIT
└── CONTRIBUTING.md            # Contribution guidelines
```

---

## How It Works

```
User says: "debug this auth error"
     │
     ▼
┌─ Keyword Detection ──────────────────────────┐
│  Matches: "debug" → suggests /investigate     │
└───────────────────────────┬───────────────────┘
                            ▼
┌─ /investigate Skill ──────────────────────────┐
│  1. memory_search(tag: "bug") → past context  │
│  2. OMC tracer agent → evidence gathering     │
│  3. LSP tools → precise code navigation       │
│  4. Reproduce → Scope lock → Pattern match    │
│  5. 3-strike hypothesis testing               │
│  6. OMC executor → implement fix              │
│  7. OMC verifier → verify + regression test   │
│  8. memory_store → persist for future         │
│  9. messenger_send → notify completion        │
└───────────────────────────────────────────────┘
```

---

## Translations

| Language | Link |
|----------|------|
| English | [README.md](README.md) (this file) |
| Korean (한국어) | [README.ko.md](README.ko.md) |
| Chinese (中文) | [README.zh.md](README.zh.md) |
| Japanese (日本語) | [README.ja.md](README.ja.md) |

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup and workflow
- How to add new skills, MCP tools, or agents
- Template system conventions
- Pull request checklist

---

## Credits

Built on top of:
- [Claude Code](https://claude.ai/code) by Anthropic
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) by Yeachan Heo
- [gstack](https://github.com/garrytan/gstack) patterns by Garry Tan
- [Context Hub](https://github.com/andrewyng/context-hub) by Andrew Ng

## License

[MIT](LICENSE) © Evan Lee (Kit4Some)
