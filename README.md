# OpenClaw-CC

**Autonomous AI Assistant Plugin for Claude Code**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 5 MCP servers · 21 skills · 3-tier persistent memory · knowledge graph · multi-agent orchestration · Discord/Telegram integration

OpenClaw-CC transforms Claude Code into a self-improving autonomous assistant with persistent memory across sessions, systematic debugging, automated releases, QA cycles, and team orchestration.

---

## Quick Start

### Prerequisites
- [Claude Code](https://claude.ai/code) with active subscription
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) plugin installed
- Node.js ≥ 18

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. Install MCP server dependencies
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..

# 3. Install Context Hub (optional — for API doc fetching)
npm install -g @aisuite/chub

# 4. Generate skill documents from templates
node scripts/gen-skill-docs.mjs

# 5. Open in Claude Code
claude
```

### Environment Variables (optional)

Create a `.env` file for messenger integration:

```bash
DISCORD_BOT_TOKEN=your_token
DISCORD_CHANNEL_ID=your_channel
DISCORD_WEBHOOK_URL=your_webhook
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Claude Code                       │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ 21 Skills│  │ 4 Agents │  │ oh-my-claudecode   │ │
│  │ (.tmpl)  │  │ (.claude/)│  │ (19 OMC agents)    │ │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘ │
│       │              │                  │             │
│  ┌────▼──────────────▼──────────────────▼───────────┐│
│  │              5 MCP Servers (31 tools)             ││
│  │  memory · knowledge · messenger · scheduler · chub││
│  └──────────────────────────────────────────────────┘│
│       │                                               │
│  ┌────▼──────────────────────────────────────────────┐│
│  │           3-Tier Persistent Memory                ││
│  │  Episodic (30d) → Working (30d) → Long-term (∞)  ││
│  │  + Knowledge Graph · Similarity Search · FTS5     ││
│  └───────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## MCP Servers (5 servers, 31 tools)

| Server | Tools | Description |
|--------|-------|-------------|
| **memory-manager** | 9 | Persistent memory CRUD with FTS5 + associative search |
| **knowledge-engine** | 6 | Knowledge graph, trigram similarity, refinement pipeline |
| **messenger-bot** | 4 | Discord/Telegram bidirectional messaging |
| **task-scheduler** | 7 | Cron-based task scheduling with claude CLI execution |
| **context-hub** | 5 | Curated API/SDK docs registry (4,400+ libraries) |

---

## Skills (21)

### Core Skills
| Skill | Trigger | Description |
|-------|---------|-------------|
| `/task-analyzer` | "analyze", "do this" | Autonomous task decomposition and execution |
| `/memory-ops` | "remember", "save" | Memory store/search/cleanup |
| `/research-collector` | "research", "look it up" | Web research → structured output |
| `/daily-routine` | "briefing", "daily" | Morning briefing, evening review, weekly retro |

### Workflow Skills
| Skill | Trigger | Description |
|-------|---------|-------------|
| `/ship` | "ship", "deploy", "PR" | 8.5-step automated release (test→coverage→review→commit→PR) |
| `/investigate` | "debug", "why broken" | 6-step systematic debugging with Iron Law |
| `/code-review` | "review", "check code" | Scope drift detection + Fix-First multi-pass review |
| `/qa` | "QA", "test and fix" | Test→Fix→Verify cycle with WTF-likelihood self-regulation |
| `/office-hours` | "brainstorm", "idea" | 6 forcing questions + design document |
| `/retro` | "retro", "retrospective" | Git + memory combined engineering retrospective |
| `/doc-fetcher` | "API docs", "docs for X" | Context Hub MCP + annotations + feedback |

### Safety Skills
| Skill | Trigger | Description |
|-------|---------|-------------|
| `/freeze` | "freeze", "restrict edits" | Hook-based edit scope restriction |
| `/careful` | "careful", "safe mode" | Destructive command warnings |
| `/guard` | "guard", "max safety" | Combined freeze + careful |
| `/unfreeze` | "unfreeze", "unlock" | Remove edit restrictions |

### Advanced Skills
| Skill | Description |
|-------|-------------|
| `/knowledge-refiner` | Detect duplicates, merge, archive, promote layers |
| `/session-tracker` | Cross-session context continuity |
| `/web-researcher` | Multi-angle web research + knowledge graph |
| `/autonomous-ops` | 24/7 messenger-driven autonomous loop |
| `/knowledge-sync` | OMC ↔ OpenClaw-CC memory sync |
| `/deep-research` | 3× parallel research agents + synthesis |

---

## Skill Template System

Skills are auto-generated from `.tmpl` templates with shared blocks:

```bash
node scripts/gen-skill-docs.mjs           # regenerate all
node scripts/gen-skill-docs.mjs ship       # regenerate one
node scripts/skill-check.mjs              # health check
```

**10 shared template blocks:** `{{OCC_PREAMBLE}}` `{{OCC_MEMORY_INIT}}` `{{OCC_MEMORY_PERSIST}}` `{{OCC_COMPLETION_STATUS}}` and more — eliminating duplication across 21 skills.

---

## Builder Ethos

Five principles embedded in every skill ([full document](docs/ETHOS.md)):

1. **Boil the Lake** — Complete implementation when AI makes marginal cost near-zero
2. **Search Before Building** — Layer 0 (memory) → Layer 1 (standard) → Layer 2 (trends) → Layer 3 (first principles)
3. **Build for Yourself** — Solve real problems, not hypothetical ones
4. **Memory is Cheap** — Always store, always search, let refinement pipeline clean up
5. **Delegate or Die** — Right agent for the right job, never self-approve

---

## Project Structure

```
openclaw-cc/
├── CLAUDE.md                  # Project instructions for Claude Code
├── .mcp.json                  # 5 MCP server configurations
├── .claude/
│   ├── agents/                # 4 project-local agents
│   └── settings.local.json    # Hooks configuration
├── skills/                    # 21 skills (SKILL.md.tmpl → SKILL.md)
├── mcp-servers/
│   ├── memory-manager/        # 9 tools — persistent memory
│   ├── knowledge-engine/      # 6 tools — knowledge graph
│   ├── messenger-bot/         # 4 tools — Discord/Telegram
│   └── task-scheduler/        # 7 tools — cron scheduling
├── scripts/
│   ├── gen-skill-docs.mjs     # Template generator
│   ├── skill-check.mjs        # Health dashboard
│   ├── template-blocks/       # 11 shared blocks
│   └── hooks/                 # 5 lifecycle hooks
├── memory-store/              # Persistent memory storage
├── docs/ETHOS.md              # Builder philosophy
└── package.json               # Build scripts
```

---

## Translations

- [한국어 (Korean)](README.ko.md)
- [中文 (Chinese)](README.zh.md)
- [日本語 (Japanese)](README.ja.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © Evan Lee (Kit4Some)
