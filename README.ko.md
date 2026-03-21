<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQyIDAtOC0zLjU4LTgtOHMzLjU4LTggOC04IDggMy41OCA4IDgtMy41OCA4LTggOHoiLz48L3N2Zz4="/>
  <img src="https://img.shields.io/badge/MCP_Servers-5-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Skills-21-orange?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Tools-31-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>
</p>

# OpenClaw-CC

**Claude Code를 위한 자율 AI 어시스턴트 플러그인**

> Claude Code를 자기 발전하는 자율 어시스턴트로 전환하세요. 영구 메모리, 체계적 디버깅, 자동화된 릴리스, QA 사이클, 멀티에이전트 오케스트레이션을 지원합니다.

**[빠른 시작](#-빠른-시작)** · **[기능](#-기능)** · **[스킬](#-스킬-21개)** · **[아키텍처](#-아키텍처)** · **[플러그인 설치](#-플러그인-설치)** · **[기여하기](CONTRIBUTING.md)**

---

## OpenClaw-CC가 필요한 이유?

| 기존 방식 | OpenClaw-CC 사용 시 |
|----------|-------------------|
| 매 세션마다 처음부터 시작 | **3계층 영구 메모리**로 모든 세션 간 컨텍스트 유지 |
| 수동 디버깅과 추측에 의존 | **Iron Law 기반 6단계 체계적 디버깅** |
| 복붙 반복의 릴리스 작업 | **8.5단계 자동화 ship** (테스트→리뷰→PR) |
| 안전장치 없음 | **훅 기반 가드레일** (freeze, careful, guard) |
| 단일 에이전트의 한계 | **OMC 19개 에이전트** + 프로젝트 전용 4개 에이전트 오케스트레이션 |
| 외부 알림 없음 | **Discord/Telegram** 실시간 알림 |
| 오래된 API 지식 | **Context Hub를 통한 4,400개 이상의 정제된 문서** |

---

## 빠른 시작

### 방법 A: 플러그인 설치 (권장)

```bash
# 1. 마켓플레이스 추가
/plugin marketplace add https://github.com/Kit4Some/Oh-my-ClaudeClaw

# 2. 플러그인 설치
/plugin install openclaw-cc@openclaw-cc

# 3. MCP 의존성 설치
cd ~/.claude/plugins/cache/openclaw-cc/openclaw-cc/latest
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..
```

### 방법 B: 수동 설치

```bash
# 1. 클론
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. 의존성 설치
for dir in mcp-servers/*/; do (cd "$dir" && npm install); done

# 3. (선택) API 문서 조회를 위한 Context Hub 설치
npm install -g @aisuite/chub

# 4. 템플릿으로부터 스킬 생성
node scripts/gen-skill-docs.mjs

# 5. 실행
claude
```

### 환경 설정 (선택)

Discord/Telegram 연동을 위해 `.env` 파일을 생성하세요:

```bash
DISCORD_BOT_TOKEN=your_token
DISCORD_CHANNEL_ID=your_channel
DISCORD_WEBHOOK_URL=your_webhook
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 사전 요구사항

- [Claude Code](https://claude.ai/code) (활성 구독 필요)
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) 플러그인
- Node.js >= 18

---

## 기능

### 3계층 영구 메모리

```
에피소딕 (30일)  →  워킹 (30일)  →  장기 (영구)
  daily-logs         tasks              knowledge
  captures           sessions           projects
                     inbox              people
```

- **FTS5 전문 검색**: 연관 모드 지원 (5가지 신호 기반 랭킹)
- **지식 그래프**: 6가지 관계 유형 (related, derived, supersedes, blocks, contradicts, refines)
- **트라이그램 유사도 검색**: 외부 API 없이 중복 제거
- **자동 정제 파이프라인**: 야간 중복 제거, 주간 decay, 월간 요약

### 멀티에이전트 오케스트레이션

OMC 19개 에이전트 + 프로젝트 로컬 4개 에이전트, 지능형 라우팅:

| 등급 | 모델 | 에이전트 |
|------|------|---------|
| 빠른 작업 | Haiku | explore, writer, comms-agent, session-manager |
| 표준 작업 | Sonnet | executor, debugger, tracer, verifier, test-engineer, designer, scientist, memory-specialist, research-agent |
| 복잡한 작업 | Opus | analyst, planner, architect, critic, code-reviewer, code-simplifier, product-manager |

### 안전 시스템 (gstack 기반)

| 스킬 | 보호 내용 |
|------|---------|
| `/freeze` | PreToolUse 훅을 통해 지정 디렉토리 외부의 Edit/Write 차단 |
| `/careful` | `rm -rf`, `DROP TABLE`, `force-push`, `reset --hard` 등 실행 전 경고 |
| `/guard` | freeze + careful 동시 활성화 |

### 스킬 템플릿 시스템

11개의 공유 블록을 사용하는 `.tmpl` 템플릿에서 21개 스킬 생성 — 중복 제로:

```bash
node scripts/gen-skill-docs.mjs           # 전체 재생성
node scripts/gen-skill-docs.mjs ship       # 단일 재생성
node scripts/skill-check.mjs              # 헬스 대시보드
```

---

## 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                       Claude Code                            │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────────┐ │
│  │ 21개 스킬 │  │ 4개 에이전트│  │   oh-my-claudecode (OMC)  │ │
│  │ 템플릿    │  │ memory    │  │   전문화된 19개 에이전트   │ │
│  │ 자동생성  │  │ comms     │  │   팀 오케스트레이션        │ │
│  │           │  │ research  │  │   LSP/AST/Python 도구     │ │
│  │           │  │ session   │  │   상태 관리               │ │
│  └─────┬─────┘  └─────┬─────┘  └────────────┬──────────────┘ │
│        │               │                      │               │
│  ┌─────▼───────────────▼──────────────────────▼─────────────┐ │
│  │               5개 MCP 서버 (31개 도구)                    │ │
│  │                                                           │ │
│  │  memory-manager (9)  ·  knowledge-engine (6)              │ │
│  │  messenger-bot  (4)  ·  task-scheduler  (7)               │ │
│  │  context-hub    (5)                                       │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │              3계층 영구 메모리                              │ │
│  │                                                           │ │
│  │  에피소딕 (30일) ──→ 워킹 (30일) ──→ 장기 (∞)            │ │
│  │                                                           │ │
│  │  SQLite FTS5 · 지식 그래프 · 트라이그램 유사도            │ │
│  │  연관 검색 (5가지 신호) · 자동 정제                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │           외부 연동                                        │ │
│  │  Discord · Telegram · Context Hub (4,400개 이상 API 문서)  │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## MCP 서버 (5개 서버, 31개 도구)

| 서버 | 도구 수 | 주요 기능 |
|------|--------|---------|
| **memory-manager** | 9 | `memory_store` `memory_search` `memory_get` `memory_update` `memory_delete` `memory_daily_log` `memory_search_date` `memory_list` `memory_stats` |
| **knowledge-engine** | 6 | `memory_link` `memory_graph` `memory_similar` `memory_refine` `memory_archive` `memory_reindex_trigrams` |
| **messenger-bot** | 4 | `messenger_send` `messenger_read` `messenger_poll` `messenger_status` |
| **task-scheduler** | 7 | `task_create` `task_list` `task_update` `task_delete` `task_run_now` `task_history` `task_generate_crontab` |
| **context-hub** | 5 | `chub_search` `chub_get` `chub_list` `chub_annotate` `chub_feedback` |

---

## 스킬 (21개)

### 워크플로우 스킬

| 스킬 | 기능 |
|------|-----|
| `/ship` | **8.5단계 릴리스 자동화**: 사전 점검 → 머지 베이스 → 테스트 → 커버리지 감사 → 사전 랜딩 리뷰 → 버전 범프 → 변경 로그 → bisectable 커밋 → 검증 게이트 → 푸시 → PR → 알림 |
| `/investigate` | **6단계 체계적 디버깅**: 증거 수집 → 재현 → 범위 고정 → 패턴 분석 → 가설 검증 (3회 시도 규칙) → 회귀 테스트 포함 검증된 수정 |
| `/code-review` | **멀티패스 리뷰**: 범위 이탈 감지 → 기계적 자동 수정 (Pass 1) → 보안 감사 (Pass 2) → 판단 항목 (Pass 3) → 문서 최신성 확인 → WTF-likelihood 게이트 |
| `/qa` | **테스트-수정-검증 사이클**: 기준선 → 트리아지 (Quick/Standard/Exhaustive) → 원자적 커밋으로 수정 루프 → 회귀 테스트 → WTF-likelihood 자기조절 (최대 50회 수정 상한) |
| `/office-hours` | **아이디어 검증**: 스타트업 모드 (6개 강제 질문) 또는 빌더 모드 (생성적 브레인스토밍) → 시장 조사 → 전제 도전 → 대안 강제 → 설계 문서 |
| `/retro` | **엔지니어링 회고**: git + 메모리 데이터 → 지표 테이블 → 시간 분포 → 세션 감지 → 커밋 분석 → 핫스팟 → 포커스 점수 → 연속 기록 → 트렌드 비교 |

### 핵심 스킬

| 스킬 | 기능 |
|------|-----|
| `/task-analyzer` | 복잡한 작업 분해 → 적절한 에이전트 라우팅 → 실행 → 보고 |
| `/memory-ops` | 중요도 점수와 함께 영구 메모리 저장, 검색, 정리 |
| `/research-collector` | 다각도 웹 리서치 → 구조화된 출력 → 중복 제거 → 저장 |
| `/daily-routine` | 모닝 브리핑, 작업 관리, 저녁 리뷰, 주간 회고 |
| `/doc-fetcher` | Context Hub (4,400개 이상 라이브러리)에서 주석 및 피드백 포함 API 문서 조회 |

### 안전 스킬

| 스킬 | 기능 |
|------|-----|
| `/freeze` | 지정 디렉토리 외부의 Edit/Write 차단 (훅 기반, 세션 범위) |
| `/careful` | 파괴적 명령 실행 전 경고: `rm -rf`, `DROP TABLE`, `force-push`, `reset --hard` |
| `/guard` | 최고 수준의 안전을 위해 freeze + careful 동시 활성화 |
| `/unfreeze` | 편집 제한 해제 |

### 고급 스킬

| 스킬 | 기능 |
|------|-----|
| `/knowledge-refiner` | 중복 감지, 병합, 스테일 아카이브, 레이어 승격, 재인덱싱 |
| `/session-tracker` | 세션 간 연속성을 위해 OMC 상태 + 영구 메모리 이중 기록 |
| `/web-researcher` | 증거 랭킹과 지식 그래프 통합을 포함한 다각도 웹 검색 |
| `/autonomous-ops` | 24/7 메신저 기반 자율 루프: 폴링 → 분석 → 디스패치 → 저장 → 보고 |
| `/knowledge-sync` | OMC 일시 상태와 영구 메모리 간 양방향 동기화 |
| `/deep-research` | 3개 병렬 리서치 에이전트 → 분석가 종합 → 비평가 리뷰 → 지식 그래프 |

---

## 빌더 철학

`{{OCC_ETHOS}}` 템플릿 블록을 통해 모든 스킬에 내재된 5가지 원칙 ([전문 보기](docs/ETHOS.md)):

| 원칙 | 핵심 아이디어 |
|------|-------------|
| **호수를 끓여라 (Boil the Lake)** | AI는 완전한 구현을 거의 무비용으로 만든다. 매번 완전한 것을 만들어라. |
| **만들기 전에 검색하라 (Search Before Building)** | 메모리 (L0) → 표준 패턴 (L1) → 최신 트렌드 (L2) → 제1원칙 (L3) |
| **자신을 위해 만들어라 (Build for Yourself)** | 실제 문제의 구체성이 가상 문제의 일반성을 이긴다. |
| **메모리는 저렴하다 (Memory is Cheap)** | 항상 저장하고, 항상 검색하라. 정제 파이프라인이 정리를 담당한다. |
| **위임하거나 죽어라 (Delegate or Die)** | 적합한 에이전트, 적합한 모델. 자기 승인은 금물. 작성과 리뷰는 분리하라. |

---

## 프로젝트 구조

```
Oh-my-ClaudeClaw/
├── .claude-plugin/
│   ├── plugin.json            # 플러그인 매니페스트
│   └── marketplace.json       # 마켓플레이스 카탈로그
├── .claude/
│   ├── agents/                # 4개 프로젝트 로컬 에이전트 (OMC 수준 프롬프트)
│   └── settings.local.json    # 5개 라이프사이클 훅
├── .mcp.json                  # 5개 MCP 서버 설정
├── CLAUDE.md                  # 프로젝트 지침 (Claude Code가 로드)
│
├── skills/                    # 21개 스킬
│   ├── {skill}/SKILL.md.tmpl  #   템플릿 소스 (이 파일을 편집)
│   └── {skill}/SKILL.md       #   자동 생성 (편집하지 말 것)
│
├── mcp-servers/
│   ├── memory-manager/        # 9개 도구 — SQLite FTS5 + 연관 검색
│   ├── knowledge-engine/      # 6개 도구 — 그래프, 유사도, 정제
│   ├── messenger-bot/         # 4개 도구 — Discord/Telegram
│   └── task-scheduler/        # 7개 도구 — cron + claude CLI 실행
│
├── scripts/
│   ├── gen-skill-docs.mjs     # SKILL.md.tmpl → SKILL.md 생성기
│   ├── skill-check.mjs        # 헬스 대시보드
│   ├── template-blocks/       # 11개 공유 블록 (preamble, memory 등)
│   └── hooks/                 # 5개 라이프사이클 훅 (.mjs)
│
├── memory-store/              # 영구 메모리 (gitignore 데이터)
├── docs/ETHOS.md              # 빌더 철학
├── package.json               # 빌드 스크립트
├── LICENSE                    # MIT
└── CONTRIBUTING.md            # 기여 가이드라인
```

---

## 작동 원리

```
사용자: "이 인증 오류 디버깅해줘"
     │
     ▼
┌─ 키워드 감지 ────────────────────────────────┐
│  일치: "debug" → /investigate 제안           │
└───────────────────────────┬───────────────────┘
                            ▼
┌─ /investigate 스킬 ───────────────────────────┐
│  1. memory_search(tag: "bug") → 과거 컨텍스트 │
│  2. OMC tracer 에이전트 → 증거 수집           │
│  3. LSP 도구 → 정밀 코드 탐색                │
│  4. 재현 → 범위 고정 → 패턴 매칭             │
│  5. 3회 시도 가설 검증                       │
│  6. OMC executor → 수정 구현                 │
│  7. OMC verifier → 검증 + 회귀 테스트        │
│  8. memory_store → 미래를 위해 저장           │
│  9. messenger_send → 완료 알림               │
└───────────────────────────────────────────────┘
```

---

## 번역

| 언어 | 링크 |
|------|------|
| 영어 | [README.md](README.md) |
| 한국어 | [README.ko.md](README.ko.md) (현재 파일) |
| 중국어 (中文) | [README.zh.md](README.zh.md) |
| 일본어 (日本語) | [README.ja.md](README.ja.md) |

---

## 기여하기

기여를 환영합니다! 다음 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요:
- 개발 환경 설정 및 워크플로우
- 새로운 스킬, MCP 도구, 에이전트 추가 방법
- 템플릿 시스템 규칙
- Pull request 체크리스트

---

## 크레딧

다음 프로젝트를 기반으로 제작되었습니다:
- [Claude Code](https://claude.ai/code) — Anthropic
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) — Yeachan Heo
- [gstack](https://github.com/garrytan/gstack) 패턴 — Garry Tan
- [Context Hub](https://github.com/andrewyng/context-hub) — Andrew Ng

## 라이선스

[MIT](LICENSE) © Evan Lee (Kit4Some)
