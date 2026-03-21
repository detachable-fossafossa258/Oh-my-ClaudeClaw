---
name: memory-ops
description: >
  영구 메모리 저장/검색/정리 통합 인터페이스. "기억해", "저장해", "메모리",
  "뭐였지", "지난번에", "기록해", "잊지마", "정리해", "요약해줘" 등의 요청에
  트리거됩니다. memory-manager MCP 서버와 연동하여 트리 구조 파일 기반
  영구 메모리를 관리합니다. 대화 중 중요한 정보가 나오면 자동으로 저장을
  제안합니다.
---

# Memory Operations - 영구 메모리 관리 스킬

## 핵심 원칙

1. **모든 중요 정보는 저장한다**: 대화에서 나온 의사결정, 인사이트, 계획은 메모리에 저장
2. **구조화하여 저장한다**: 적절한 카테고리, 태그, 중요도를 지정
3. **필요할 때 꺼낸다**: 관련 컨텍스트가 필요하면 먼저 memory_search
4. **주기적으로 정리한다**: 오래된/중복 메모리 정리, 요약 통합

## 카테고리 가이드

| 카테고리 | 용도 | 서브카테고리 예시 |
|----------|------|------------------|
| `projects` | 프로젝트 관련 모든 것 | rutile, sapiens, nexus |
| `people` | 인물 정보, 관계, 미팅 노트 | ken-huang, investors |
| `knowledge` | 학습한 지식, 기술 문서 | web3-security, ai-agents |
| `tasks` | 할일, 진행중인 작업 | urgent, backlog |
| `daily-logs` | 일일 활동 로그 | (날짜 자동 생성) |
| `inbox` | 미분류 임시 저장 | (나중에 분류) |

## 자동 저장 트리거

대화 중 다음 패턴이 나타나면 메모리 저장을 **자동 제안**:

- 🔑 **의사결정**: "~하기로 했다", "~로 결정", "~방향으로"
- 📋 **계획/전략**: "앞으로 ~할 예정", "계획은 ~"
- 🤝 **인물 정보**: 새로운 사람 이름 + 역할/관계
- 💡 **인사이트**: "깨달은 게", "중요한 건", "핵심은"
- 📊 **데이터/수치**: 매출, 일정, 가격 등 구체적 수치
- ⚠️ **위험/이슈**: 문제점, 리스크, 주의사항

## 저장 워크플로우

### 1. 빠른 저장 (Quick Store)
```
사용자: "이거 기억해줘 — Ken Huang이 CSA 공동의장이고 SF에서 3/25에 만나기로 했어"

→ memory_store:
  category: "people"
  subcategory: null
  title: "Ken Huang - CSA 공동의장"
  content: "Ken Huang은 Cloud Security Alliance의 공동의장. 3/25 SF 미팅 예정."
  tags: ["ken-huang", "csa", "sf-trip", "meeting"]
  importance: 7
```

### 2. 프로젝트 컨텍스트 저장
```
사용자: "Sapiens에서 PydanticAI로 마이그레이션하기로 했어"

→ memory_store:
  category: "projects"
  subcategory: "sapiens"
  title: "Framework Migration Decision - PydanticAI"
  content: "LangGraph에서 PydanticAI로 마이그레이션 결정. 이유: ..."
  tags: ["sapiens", "migration", "pydanticai", "decision"]
  importance: 8
```

### 3. 지식 저장
```
사용자: "이 취약점 패턴 저장해줘"

→ memory_store:
  category: "knowledge"
  subcategory: "web3-security"
  title: "Reentrancy Attack Pattern - Cross-function"
  content: [detailed content]
  tags: ["vulnerability", "reentrancy", "solidity"]
  importance: 6
```

## 검색 워크플로우

### 컨텍스트 기반 자동 검색
작업 시작 전 관련 메모리를 **선제적으로 검색**:

```
사용자: "RSA Conference 준비 상황 알려줘"

→ 1. memory_search(query: "RSA Conference")
→ 2. memory_search(tag: "rsa")
→ 3. memory_search(category: "projects", query: "rutile conference")
→ 4. 결과 종합하여 응답
```

### 시간 기반 조회
```
사용자: "지난주에 뭐 했지?"

→ memory_search(category: "daily-logs")
→ 최근 7일 로그 요약
```

## 메모리 정리 워크플로우

### inbox 분류
```
memory_list(directory: "inbox")
→ 각 항목의 적절한 카테고리 판단
→ memory_update로 카테고리 이동 (또는 파일 이동 + 재인덱싱)
```

### 중복 통합
```
memory_search로 유사 항목 발견
→ 내용 통합
→ 구 항목 삭제
```

### 프로젝트 요약 갱신
```
memory_search(category: "projects", subcategory: "rutile")
→ 최근 변경사항 종합
→ _meta.md 요약 파일 업데이트
```

## 데일리 로그 패턴

매일 자동으로 또는 사용자 요청시 데일리 로그 기록:

```
memory_daily_log:
  entry: "AhnLab PoC 미팅 완료, 추가 기능 요청 받음"
  type: "meeting"
```

항목 유형: note, decision, todo, done, idea, meeting

## 메모리 트리 탐색

사용자가 "메모리 구조 보여줘" 요청 시:
```
memory_list(directory: "", max_depth: 2)
→ 전체 트리 구조 시각화하여 표시
```

## 중요도 가이드

| 점수 | 기준 | 예시 |
|------|------|------|
| 9-10 | 비즈니스 크리티컬, 법적 의무 | 투자 계약 조건, 법인 설립 결정 |
| 7-8 | 핵심 의사결정, 주요 관계 | 기술 아키텍처 결정, 핵심 파트너 정보 |
| 5-6 | 유용한 참고 정보 | 기술 노트, 미팅 요약 |
| 3-4 | 일반 기록 | 데일리 로그, 아이디어 메모 |
| 1-2 | 임시/일회성 | 빠른 메모, 곧 불필요해질 정보 |
