# OpenClaw-CC

**Claude Code용 자율 AI 어시스턴트 플러그인**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 5개 MCP 서버 · 21개 스킬 · 3계층 영구 메모리 · 지식 그래프 · 멀티에이전트 오케스트레이션 · Discord/Telegram 연동

OpenClaw-CC는 Claude Code를 세션 간 영구 메모리, 체계적 디버깅, 자동 릴리스, QA 사이클, 팀 오케스트레이션을 갖춘 자기학습형 자율 어시스턴트로 변환합니다.

---

## 빠른 시작

### 전제조건
- [Claude Code](https://claude.ai/code) 활성 구독
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) 플러그인 설치
- Node.js ≥ 18

### 설치

```bash
# 1. 리포지토리 클론
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. MCP 서버 의존성 설치
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..

# 3. Context Hub 설치 (선택 — API 문서 조회용)
npm install -g @aisuite/chub

# 4. 스킬 문서 생성
node scripts/gen-skill-docs.mjs

# 5. Claude Code에서 열기
claude
```

### 환경 변수 (선택)

메신저 연동을 위한 `.env` 파일:

```bash
DISCORD_BOT_TOKEN=your_token
DISCORD_CHANNEL_ID=your_channel
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## MCP 서버 (5개, 31개 도구)

| 서버 | 도구 수 | 설명 |
|------|---------|------|
| **memory-manager** | 9 | FTS5 + 연관 검색 기반 영구 메모리 |
| **knowledge-engine** | 6 | 지식 그래프, 트라이그램 유사도, 정제 파이프라인 |
| **messenger-bot** | 4 | Discord/Telegram 양방향 메시징 |
| **task-scheduler** | 7 | cron 기반 태스크 스케줄링 |
| **context-hub** | 5 | 큐레이션된 API/SDK 문서 레지스트리 (4,400+ 라이브러리) |

---

## 스킬 (21개)

### 핵심 스킬
| 스킬 | 트리거 | 설명 |
|------|--------|------|
| `/task-analyzer` | "분석해", "이거 해줘" | 자율 작업 분해·실행 |
| `/memory-ops` | "기억해", "저장해" | 메모리 CRUD |
| `/ship` | "배포", "ship it" | 8.5단계 자동 릴리스 |
| `/investigate` | "디버깅", "버그 찾아" | 6단계 체계적 디버깅 (Iron Law) |
| `/code-review` | "코드 리뷰" | 스코프 드리프트 감지 + Fix-First 리뷰 |
| `/qa` | "QA", "테스트" | Test→Fix→Verify + WTF-likelihood |
| `/office-hours` | "브레인스토밍" | 6가지 강제 질문 + 디자인 문서 |
| `/retro` | "회고", "retro" | git+메모리 결합 엔지니어링 회고 |

### 안전 스킬
| 스킬 | 트리거 | 설명 |
|------|--------|------|
| `/freeze` | "편집 제한" | 훅 기반 편집 범위 제한 |
| `/careful` | "조심", "안전 모드" | 위험 명령 경고 |
| `/guard` | "가드", "최대 안전" | freeze + careful 복합 |

---

## 빌더 철학

모든 스킬에 내장된 5가지 원칙 ([전문](docs/ETHOS.md)):

1. **Boil the Lake** — AI로 완전한 구현의 한계비용이 0에 가까울 때, 완전하게
2. **Search Before Building** — 메모리(Layer 0) → 정설(L1) → 트렌드(L2) → 1원칙(L3)
3. **Build for Yourself** — 실제 문제를 해결
4. **Memory is Cheap** — 항상 저장, 항상 검색
5. **Delegate or Die** — 적절한 에이전트에 위임

---

## 번역

- [English](README.md)
- [中文 (Chinese)](README.zh.md)
- [日本語 (Japanese)](README.ja.md)

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 라이선스

[MIT](LICENSE) © Evan Lee (Kit4Some)
