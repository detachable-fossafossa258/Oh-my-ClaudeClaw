# OpenClaw-CC v2 — Claude Code Native AI Assistant

## Project Overview
A system that implements OpenClaw's autonomous AI assistant capabilities on top of Claude Code's MCP + Skills ecosystem.
Interacts via Discord/Telegram, maintains a 3-tier persistent memory, and autonomously analyzes and executes tasks.

## User Context
- **Name**: Evan Lee (이학성)
- **Role**: Rutile Corp CEO, Sapiens Development Lead
- **Key Projects**: Sapiens (Web3 security audit AI), NEXUS (OSINT), ARCHITECT (code generation)
- **Interests**: Web3 security, AI agents, startup business

## Core Rules

### Memory First
- Always run `memory_search` for relevant context before starting any task
- Store important information via `memory_store` before ending a conversation
- Record daily logs automatically via `memory_daily_log`
- Use `memory_search(associative: true)` when associative search is needed

### 3-Tier Memory Model
| Layer | Category | TTL | Promotion Condition |
|-------|----------|-----|---------------------|
| **Episodic** | daily-logs, captures | 30d → monthly summary | access_count > 5 AND age > 7d |
| **Working** | inbox, tasks, sessions | 30d TTL | importance ≥ 7 OR access_count > 10 |
| **Long-term** | knowledge, people, projects | Permanent (importance ≥ 7) | — |

### Autonomous Execution
- Analyze task → decompose subtasks → map tools → execute → report
- Request user confirmation only when uncertain
- On failed steps, attempt alternative strategies before reporting

### Communication
- Send important results as messenger notifications (Discord/Telegram)
- Default language follows user preference; use English for English-language content
- Include English expression suggestions when preparing for business meetings

## MCP Servers (5 servers, 31 tools)

### memory-manager (9 tools)
Persistent memory CRUD. File tree + SQLite FTS5 index + associative search.
- `memory_store` — store a memory
- `memory_search` — search (FTS, tags, category, **associative mode**)
- `memory_get` — retrieve a single memory
- `memory_list` — browse tree
- `memory_update` — modify (append/replace/metadata)
- `memory_delete` — delete
- `memory_daily_log` — append to daily log
- `memory_search_date` — search by date range
- `memory_stats` — statistics

**Associative search** (v2): `memory_search(associative: true, context: { tags, related_id, date })`
Composite ranking across 5 signals: FTS, tags, graph, time, access frequency.

### knowledge-engine (6 tools)
Knowledge graph, similarity search, refinement pipeline, archive.
- `memory_link` — manage relationships between memories (related, derived, supersedes, blocks, contradicts, refines)
- `memory_graph` — BFS knowledge graph traversal (depth 1–4)
- `memory_similar` — trigram cosine similarity search
- `memory_refine` — refine memories (normalize, consolidate, upgrade)
- `memory_archive` — archive old memories (supports dry_run)
- `memory_reindex_trigrams` — rebuild similarity index

### messenger-bot (4 tools)
Bidirectional Discord/Telegram messaging.
- `messenger_send` — send message (platform: discord|telegram|all)
- `messenger_read` — read recent messages
- `messenger_poll` — poll for new messages
- `messenger_status` — check connection status

### task-scheduler (7 tools)
Cron-based task scheduling. JSON storage + claude CLI execution.
- `task_create` — create a scheduled task
- `task_list` — list tasks
- `task_update` — update a task
- `task_delete` — delete a task
- `task_run_now` — run immediately
- `task_history` — execution history
- `task_generate_crontab` — generate crontab file

### context-hub (5 tools)
Curated API/SDK documentation registry with BM25 search, annotations, and feedback. 4,400+ libraries.
- `chub_search` — search docs/skills by query, tags, language
- `chub_get` — fetch doc content by ID with language/version selection
- `chub_list` — list all available entries
- `chub_annotate` — manage persistent local annotations (workarounds, quirks)
- `chub_feedback` — rate doc quality (up/down with labels: accurate, outdated, incomplete, etc.)

**Documentation Workflow** (for any agent needing API/SDK docs):
1. `memory_search(tag: "api-docs", query: "{library}")` — check cached
2. `chub_search(query: "{library}")` — find in registry
3. `chub_get(id: "{id}", lang: "{lang}")` — fetch content
4. `memory_store(category: "knowledge", tags: ["api-docs"])` — persist
5. `chub_annotate(id: "{id}", note: "{discovery}")` — annotate for future sessions
6. `memory_link(source: doc_id, target: project_id)` — connect to project graph

### OMC Tools (via oh-my-claudecode plugin)
Code intelligence, state management, and analysis tools provided by the OMC orchestration layer:
- **LSP** (9 tools): lsp_hover, lsp_goto_definition, lsp_find_references, lsp_diagnostics, lsp_diagnostics_directory, lsp_document_symbols, lsp_workspace_symbols, lsp_rename, lsp_code_actions
- **AST** (2 tools): ast_grep_search, ast_grep_replace — structural code search/replace with meta-variables
- **State** (5 tools): state_read, state_write, state_clear, state_list_active, state_get_status
- **Notepad** (4 tools): notepad_read, notepad_write_priority, notepad_write_working, notepad_write_manual
- **Python REPL** (1 tool): python_repl — persistent REPL for data analysis and computation
- **Trace** (2 tools): trace_summary, trace_timeline — evidence-driven causal tracing

## Automated Tasks (3)

| Task | cron | Description |
|------|------|-------------|
| `nightly-refinement` | `0 3 * * *` | Detect and merge duplicates, archive stale memories, re-index trigrams |
| `weekly-decay` | `0 4 * * 0` | Apply importance decay, process layer promotion candidates |
| `monthly-summary` | `0 5 1 * *` | Generate monthly memory summary, archive old daily-logs |
| `weekly-self-optimize` | `0 2 * * 1` | Every Monday 02:00 — run self-optimization cycle |

## Builder Ethos (see docs/ETHOS.md)

5 principles: **Boil the Lake** (complete implementation) | **Search Before Building** (4-tier knowledge) | **Build for Yourself** | **Memory is Cheap** (always persist) | **Delegate or Die** (delegate to the right agent)

## Proactive Skill Suggestions

Detect the user's current phase and suggest the appropriate skill:

| Situation | Recommended Skill |
|-----------|------------------|
| Brainstorming / idea exploration | `/office-hours` |
| Debugging / error analysis | `/investigate` |
| Testing / QA | `/qa` |
| Code review | `/code-review` |
| Deployment / PR creation | `/ship` |
| Retrospective / review | `/retro` |
| Production / live system work | `/careful` |
| Restrict edit scope | `/freeze` |
| Maximum safety mode | `/guard` |
| Memory management | `/memory-ops` |
| Daily routine | `/daily-routine` |
| Web research | `/web-researcher` |
| Knowledge cleanup | `/knowledge-refiner` |
| Complex multi-file refactor | `/oh-my-claudecode:autopilot` or `/oh-my-claudecode:ultrawork` |
| Need consensus on approach | `/oh-my-claudecode:ralplan` |
| Persistent loop until done | `/oh-my-claudecode:ralph` |
| UI/UX design work | OMC `designer` agent |
| Data analysis / computation | OMC `scientist` agent + `python_repl` |
| Code cleanup / anti-slop | `/oh-my-claudecode:ai-slop-cleaner` |
| Deep requirements interview | `/oh-my-claudecode:deep-interview` |

**Proactive toggle**: `state_write("occ-proactive", "false")` — disable when the user says "stop suggesting"

## Skill Template System

Skills are auto-generated from SKILL.md.tmpl templates. Do not edit SKILL.md files directly.

```bash
node scripts/gen-skill-docs.mjs           # regenerate all skills
node scripts/gen-skill-docs.mjs ship       # regenerate a specific skill
node scripts/skill-check.mjs              # health check
```

Shared blocks (`scripts/template-blocks/`):
`{{OCC_PREAMBLE}}` `{{OCC_MEMORY_INIT}}` `{{OCC_MEMORY_PERSIST}}` `{{OCC_MESSENGER_NOTIFY}}`
`{{OCC_OMC_DELEGATION}}` `{{OCC_BASE_BRANCH_DETECT}}` `{{OCC_COMPLETION_STATUS}}`
`{{OCC_ETHOS}}` `{{OCC_TEST_BOOTSTRAP}}` `{{OCC_ASK_FORMAT}}`

## Skills (21)

### v1 Core Skills
| Skill | Triggers | Description |
|-------|----------|-------------|
| `/task-analyzer` | "분석해", "작업 계획", "이거 해줘" / "analyze", "task plan", "do this" | Autonomous task analysis, decomposition, and execution |
| `/memory-ops` | "기억해", "저장해", "메모리" / "remember", "save", "memory" | Unified memory store/search/cleanup |
| `/research-collector` | "조사해", "리서치", "찾아봐" / "research", "look it up" | Web research → structured output → store |
| `/daily-routine` | "오늘 할일", "브리핑", "주간 회고" / "today's tasks", "briefing", "weekly review" | Morning briefing, evening review, weekly retrospective |

### v2 Workflow Skills
| Skill | Triggers | Description |
|-------|----------|-------------|
| `/knowledge-refiner` | "메모리 정리", "중복 제거", "refine" / "clean memory", "remove duplicates" | Detect and merge duplicates, archive, promote layers |
| `/doc-fetcher` | "API 문서", "docs for X" / "API docs" | chub MCP + web-fallback doc lookup + annotations + feedback + knowledge graph |
| `/session-tracker` | "마지막 세션", "어디까지 했지" / "last session", "where were we" | Cross-session context continuity |
| `/code-review` | "코드 리뷰", "리뷰해줘" / "code review", "review this" | Scope drift detection + Fix-First multi-pass review + WTF-likelihood |
| `/ship` | "배포", "ship it", "PR 만들어" / "deploy", "create PR" | 8.5-step automated release (test→coverage→review→commit→PR) |
| `/investigate` | "디버깅", "버그 찾아", "왜 안 돼" / "debug", "find the bug", "why is this broken" | 6-step systematic debugging (Iron Law + reproduce + scope lock + 3-strike) |
| `/web-researcher` | "웹에서 찾아", "최신 정보" / "search the web", "latest info" | Multi-angle web search → structured output → memory store + graph link |

### v3 Safety Skills (gstack adaptation)
| Skill | Triggers | Description |
|-------|----------|-------------|
| `/freeze` | "freeze", "편집 제한", "이 폴더만" / "restrict edits", "this folder only" | Hook-based edit scope restriction (blocks Edit/Write) |
| `/careful` | "careful", "조심", "안전 모드" / "be careful", "safe mode" | Warn on dangerous commands (rm -rf, DROP, force-push, etc.) |
| `/guard` | "guard", "가드", "최대 안전" / "maximum safety" | Combined freeze + careful safety mode |
| `/unfreeze` | "unfreeze", "잠금 해제" / "unlock edits" | Release freeze edit restrictions |

### v3 Workflow Skills (gstack adaptation)
| Skill | Triggers | Description |
|-------|----------|-------------|
| `/qa` | "QA", "테스트", "버그 찾아서 고쳐" / "test", "find and fix bugs" | Test→Fix→Verify cycle + WTF-likelihood self-regulation |
| `/office-hours` | "브레인스토밍", "아이디어", "사업 아이디어" / "brainstorm", "idea", "business idea" | 6 forced questions + design document generation |
| `/retro` | "회고", "retro", "이번 주 리뷰" / "retrospective", "this week's review" | git+memory combined engineering retrospective + trend tracking |

## Refinement Pipeline

```
DETECT → ANALYZE → REFINE → STORE
  │         │         │        │
  │ 30d     │ tri-    │ merge  │ version save
  │ no-     │ gram    │ upgrade│ link create
  │ access  │ simi-   │ archive│ FTS re-index
  │ low-imp │ larity  │ decay  │ report
```

- **detector.js**: detects stale (30d), unused (7d), low-importance (< 4, 14d)
- **analyzer.js**: similarity clustering, contradiction detection, promotion eligibility check
- **refiner.js**: executes merge/upgrade/archive/decay, preserves versions

## OMC Integration (oh-my-claudecode × OpenClaw-CC)

### Agent → Memory Routing

All OMC agents must leverage OpenClaw-CC's persistent memory:

**On task start**: `memory_search(associative: true)` — auto-load relevant past context
**On task completion**: `memory_store` — persist key results, decisions, and findings

| OMC Agent | Start Search | Completion Store | Category |
|-----------|-------------|-----------------|---------|
| executor | `memory_search(query: "{task}")` | Implementation result + changed file list | projects |
| debugger | `memory_search(tag: "bug")` | Root cause + fix details | knowledge/debugging |
| tracer | `memory_search(query: "{symptom}")` | Trace path + evidence | knowledge/debugging |
| code-reviewer | `memory_search(tag: "code-review")` | Review result + issues found | projects |
| security-reviewer | `memory_search(tag: "security")` | Vulnerabilities + remediation | knowledge/security |
| architect | `memory_search(tag: "architecture")` | Design decisions + tradeoffs | projects |
| verifier | `memory_search(query: "{verification}")` | Verification evidence + test results | projects |
| test-engineer | `memory_search(tag: "test")` | Test strategy + coverage | projects |
| planner | `memory_search(query: "{plan}")` | Execution plan + dependencies | projects |
| scientist | `memory_search(query: "{research}")` | Analysis results + data | knowledge |
| designer | `memory_search(tag: "design")` | UI/UX decisions + component specs | projects |
| qa-tester | `memory_search(tag: "qa")` | Test results + verification evidence | projects |
| code-simplifier | `memory_search(tag: "refactor")` | Simplification results + before/after | projects |
| git-master | `memory_search(tag: "release")` | Commit strategy + release notes | projects |
| critic | `memory_search(tag: "review")` | Critical analysis + risk assessment | projects |
| writer | `memory_search(tag: "docs")` | Documentation artifacts | knowledge |
| product-manager | `memory_search(tag: "product")` | PRD + requirements + personas | projects |
| document-specialist | `memory_search(tag: "api-docs")` | External doc references + chub annotations | knowledge |
| explore | (none — read-only) | (none — read-only) | — |

### Messenger Notification Rules

Automatically call `messenger_send(platform: "telegram")` in the following situations:
- OMC team pipeline completes (team-verify passes)
- Verification fails (verifier returns BLOCKED)
- Long-running task completes (10+ minutes)
- cron task execution results
- Memory with importance ≥ 8 is created

### Team Decision Persistence

Auto-store the result of each OMC team pipeline stage:
```
team-plan  → memory_store(category: "projects", tags: ["team-plan", "{project}"])
team-prd   → memory_store(category: "projects", tags: ["prd", "{project}"])
team-exec  → memory_daily_log(type: "done", entry: "{summary}")
team-verify → memory_store(category: "projects", tags: ["verification", "{project}"])
team-fix   → memory_link(relation: "refines", source: fix_id, target: original_id)
```

### Project-Local Agents

OpenClaw-CC dedicated agents defined in `.claude/agents/`:
- `memory-specialist` (sonnet) — expert in 15 memory + knowledge-engine tools
- `comms-agent` (haiku) — expert in 4 messenger tools + 7 scheduler tools
- `research-agent` (sonnet) — web research + memory deduplication + graph linking
- `session-manager` (haiku) — OMC state ↔ OpenClaw-CC memory bridge

### v3 OMC Integration Skills

| Skill | Triggers | Description |
|-------|----------|-------------|
| `/autonomous-ops` | "자율 모드", "24/7" / "autonomous mode" | Messenger receive → team execute → memory store → report loop |
| `/knowledge-sync` | "지식 동기화", "sync" / "knowledge sync" | Bidirectional sync: OMC project-memory ↔ OpenClaw-CC memory |
| `/deep-research` | "심층 조사", "deep research" | 3×research-agent parallel → analyst synthesis → knowledge graph expansion |

## Directory Structure

```
openclaw-cc/
├── CLAUDE.md                  ← this file
├── .mcp.json                  ← MCP server config (4 servers)
├── .claude/
│   ├── agents/                ← project-local agents (v3)
│   │   ├── memory-specialist.md
│   │   ├── comms-agent.md
│   │   ├── research-agent.md
│   │   └── session-manager.md
│   └── settings.local.json   ← includes hooks config
├── docs/
│   └── ETHOS.md               ← builder philosophy (5 principles)
├── mcp-servers/
│   ├── memory-manager/        ← memory MCP (9 tools)
│   ├── knowledge-engine/      ← knowledge engine MCP (6 tools)
│   │   └── src/refinement/    ← refinement pipeline (detector/analyzer/refiner)
│   ├── messenger-bot/         ← Discord/Telegram MCP (4 tools)
│   └── task-scheduler/        ← task scheduler MCP (7 tools)
├── skills/                    ← 21 skills (v1:4 + v2:7 + v3-safety:4 + v3-workflow:3 + v3-omc:3)
│   ├── task-analyzer/         ← task analysis (OMC team delegation)
│   ├── memory-ops/            ← memory management
│   ├── research-collector/    ← research collection
│   ├── daily-routine/         ← daily routine
│   ├── knowledge-refiner/     ← knowledge refinement (v2)
│   ├── doc-fetcher/           ← documentation lookup (v2)
│   ├── session-tracker/       ← session tracking (v2)
│   ├── code-review/           ← multi-pass review + scope drift (v2, enhanced)
│   ├── ship/                  ← 8.5-step release automation (v2, enhanced)
│   ├── investigate/           ← 6-step systematic debugging + scope lock (v2, enhanced)
│   ├── web-researcher/        ← web research (v2)
│   ├── freeze/                ← hook-based edit scope restriction (v3, gstack)
│   ├── careful/               ← dangerous command warnings (v3, gstack)
│   ├── guard/                 ← freeze+careful combined (v3, gstack)
│   ├── unfreeze/              ← release freeze (v3, gstack)
│   ├── qa/                    ← Test→Fix→Verify QA (v3, gstack)
│   ├── office-hours/          ← idea validation + design doc (v3, gstack)
│   ├── retro/                 ← engineering retrospective (v3, gstack)
│   ├── autonomous-ops/        ← 24/7 autonomous operations (v3)
│   ├── knowledge-sync/        ← OMC↔CC memory sync (v3)
│   └── deep-research/         ← multi-agent deep research (v3)
├── memory-store/              ← persistent memory storage
│   ├── inbox/
│   ├── projects/
│   ├── people/
│   ├── knowledge/
│   ├── daily-logs/
│   └── tasks/
├── scheduler-data/            ← task scheduler data (3 cron jobs registered)
├── docs/
│   └── ETHOS.md               ← builder philosophy (5 principles)
├── package.json               ← skill build scripts
└── scripts/                   ← utility scripts
    ├── gen-skill-docs.mjs     ← SKILL.md.tmpl → SKILL.md generator
    ├── skill-check.mjs        ← skill health check
    ├── template-blocks/       ← shared template blocks (10)
    ├── setup.sh
    ├── webhook-bridge.js
    ├── daemon.sh
    ├── openclaw-cc@.service
    ├── hud-extension.mjs      ← HUD extension (v3)
    └── hooks/                 ← project hooks (v3)
        ├── session-start.mjs
        ├── pre-compact.mjs
        ├── post-memory-store.mjs
        ├── subagent-stop.mjs
        └── session-end.mjs
```
