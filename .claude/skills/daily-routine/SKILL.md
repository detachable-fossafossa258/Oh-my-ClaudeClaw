---
name: daily-routine
description: >
  일일 루틴 자동화 스킬. "오늘 할일", "데일리", "모닝 브리핑", "오늘 일정",
  "할일 정리", "하루 마무리", "이번주 요약" 등의 요청에 트리거됩니다.
  모닝 브리핑, 할일 관리, 저녁 리뷰, 주간 회고를 자동화합니다.
  task-scheduler MCP로 cron 등록하면 자동 실행됩니다.
---

# Daily Routine — 일일 루틴 자동화 엔진

## 역할

사용자의 하루를 구조화하는 4가지 루틴(모닝 브리핑, 할일 관리, 저녁 리뷰, 주간 회고)을
memory-manager와 messenger-bot MCP 도구를 활용해 자동화한다.
task-scheduler에 cron으로 등록하면 완전 자율 실행이 가능하다.

## 워크플로우 1: 모닝 브리핑

실행 시점: 평일 오전 9시 자동 실행 또는 "모닝 브리핑", "오늘 브리핑" 요청 시

### Step 1 — 어제 요약 수집

```
memory_search:
  category: "daily-logs"
  limit: 1
→ 어제 날짜의 데일리 로그 조회
→ 주요 활동 3줄로 요약
```

### Step 2 — 미완료 할일 수집

```
memory_search:
  tag: "todo"
  limit: 20
→ 결과를 importance 기준 내림차순 정렬
→ priority-high > priority-mid > priority-low 순서로 그룹핑
```

### Step 3 — 오늘 예정 일정 수집

```
memory_search:
  tag: "{오늘 날짜, 예: 2026-03-21}"
  limit: 10
→ 미팅, 마감, 이벤트 등 시간순 정렬
```

### Step 4 — 업계 뉴스 수집 (선택)

```
web_search:
  query: "{사용자 관심 분야} 최신 뉴스"
→ Web3 보안, AI 에이전트, 스타트업 관련
→ 상위 3건만 한 줄 요약
→ 이 단계는 선택적이며, 네트워크 실패 시 건너뛴다
```

### Step 5 — 브리핑 생성 & 전송

`references/routine-templates.md`의 모닝 브리핑 템플릿에 수집 데이터를 채운다.

```
messenger_send:
  platform: "telegram"
  message: "{생성된 브리핑 마크다운}"
```

브리핑을 데일리 로그에도 기록:

```
memory_daily_log:
  entry: "모닝 브리핑 생성 및 전송 완료"
  type: "note"
```

## 워크플로우 2: 할일 관리

### 할일 추가

사용자가 할일을 언급하면 아래와 같이 저장한다:

```
memory_store:
  category: "tasks"
  title: "{할일 제목}"
  content: "{상세 설명 (있으면)}"
  tags: ["todo", "priority-{high|mid|low}", "{프로젝트명}"]
  importance: {high=9, mid=7, low=6}
```

저장 후 확인 기록:

```
memory_daily_log:
  entry: "할일 추가: {할일 제목}"
  type: "todo"
```

### 할일 완료 처리

```
memory_update:
  id: {해당 메모리 ID}
  mode: "metadata"
  tags: ["done", ...기존 태그에서 "todo" 제거]

memory_daily_log:
  entry: "{할일 제목} 완료"
  type: "done"
```

### 할일 리뷰

"할일 정리", "오늘 할일" 요청 시 실행:

```
memory_search:
  tag: "todo"
  limit: 30
→ importance 내림차순 정렬
→ priority-high (🔴), priority-mid (🟡), priority-low (🟢) 아이콘으로 시각화
→ 기한 초과 항목은 ⚠️ 표시
```

## 워크플로우 3: 저녁 리뷰

실행 시점: 매일 21시 자동 실행 또는 "하루 마무리", "저녁 리뷰" 요청 시

### Step 1 — 오늘 데일리 로그 조회

```
memory_search:
  category: "daily-logs"
  limit: 1
→ 오늘 날짜의 로그 전체 조회
```

### Step 2 — 완료/미완료 분류

```
memory_search:
  tag: "done"
  category: "tasks"
  limit: 20
→ 오늘 완료된 항목 수집

memory_search:
  tag: "todo"
  limit: 20
→ 아직 미완료인 항목 수집
```

### Step 3 — 이월 항목 식별

미완료 항목 중:
- `importance >= 7` → 자동 이월 (내일 할일로 유지)
- `importance < 7` → 이월 여부 사용자에게 확인 제안
- 3일 이상 미완료 항목 → ⚠️ 경고 표시

### Step 4 — 리뷰 생성

`references/routine-templates.md`의 저녁 리뷰 템플릿에 데이터를 채운다.

리뷰를 데일리 로그에 기록:

```
memory_daily_log:
  entry: "데일리 리뷰 완료 — 완료 {N}건, 미완료 {M}건, 이월 {K}건"
  type: "note"
```

## 워크플로우 4: 주간 회고

실행 시점: 일요일 20시 자동 실행 또는 "이번주 요약", "주간 회고" 요청 시

### Step 1 — 이번 주 데일리 로그 7일 조회

```
memory_search:
  category: "daily-logs"
  limit: 7
→ 월요일~일요일 로그를 날짜순으로 수집
```

### Step 2 — 프로젝트별 진척도

```
memory_search:
  category: "projects"
  limit: 20
→ 이번 주 updated_at 기준 필터링
→ 프로젝트별로 그룹핑하여 진행 현황 정리
```

### Step 3 — 의사결정 로그

데일리 로그에서 `type: "decision"` 항목을 추출하여 정리한다.

### Step 4 — 다음 주 계획

미완료 할일 + 프로젝트 진행 상황을 기반으로 다음 주 우선순위 Top 3를 제안한다.

### Step 5 — 회고 생성 & 전송

`references/routine-templates.md`의 주간 회고 템플릿에 데이터를 채운다.

```
messenger_send:
  platform: "telegram"
  message: "{생성된 주간 회고 마크다운}"
```

회고를 메모리에 영구 저장:

```
memory_store:
  category: "daily-logs"
  title: "주간 회고 — Week {N}"
  content: "{회고 마크다운}"
  tags: ["weekly-review", "{연-월}"]
  importance: 6
```

## cron 등록 예시

task-scheduler MCP의 `task_create`를 호출하여 자동 실행을 등록한다:

### 모닝 브리핑 (평일 09:00)

```
task_create:
  name: "모닝 브리핑"
  prompt: "모닝 브리핑 생성하고 Telegram으로 전송"
  cron: "0 9 * * 1-5"
  allowedTools: ["memory-manager", "messenger-bot"]
  tags: ["routine", "morning"]
  enabled: true
```

### 저녁 리뷰 (매일 21:00)

```
task_create:
  name: "저녁 리뷰"
  prompt: "하루 마무리 리뷰 작성"
  cron: "0 21 * * *"
  allowedTools: ["memory-manager"]
  tags: ["routine", "evening"]
  enabled: true
```

### 주간 회고 (일요일 20:00)

```
task_create:
  name: "주간 회고"
  prompt: "이번 주 회고 생성하고 Telegram 전송"
  cron: "0 20 * * 0"
  allowedTools: ["memory-manager", "messenger-bot"]
  tags: ["routine", "weekly"]
  enabled: true
```

## 가용 도구 테이블

| 작업 | MCP 도구 | 비고 |
|------|----------|------|
| 데일리 로그 조회 | `memory_search` | category:"daily-logs" |
| 할일 조회 | `memory_search` | tag:"todo" |
| 일정 조회 | `memory_search` | tag:날짜 |
| 할일 저장 | `memory_store` | category:"tasks" |
| 할일 완료 처리 | `memory_update` | mode:"metadata" |
| 로그 기록 | `memory_daily_log` | type별 이모지 자동 |
| 메모리 현황 | `memory_stats` | 주간 회고 통계용 |
| 메시지 전송 | `messenger_send` | platform:"telegram" |
| 자동 실행 등록 | `task_create` | cron 표현식 |

## 참조 문서

- 출력 템플릿 3종: `references/routine-templates.md`
- 브리핑 생성 스크립트: `scripts/generate-briefing.py`
