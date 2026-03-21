# 복합 작업 실행 예시

> task-analyzer의 5-Phase 프로세스가 실제 복합 작업에 어떻게 적용되는지 보여주는 3가지 예시.

---

## 예시 1: 경쟁사 분석 보고서 작성

**유형**: 리서치 + 분석 + 생성 (하이브리드 패턴)

### 원래 요청
> "Web3 보안 감사 시장의 주요 경쟁사 3곳을 분석해서 비교 보고서 만들어줘. Telegram으로 완성 알림도 보내줘."

### Phase 1 — 요청 이해

| 축 | 분석 |
|----|------|
| **What** | Web3 보안 감사 시장 경쟁사 3곳 비교 분석 보고서 |
| **Done when** | 비교 매트릭스 포함 보고서 파일 완성 + Telegram 알림 |
| **With what** | 기존 메모리(경쟁사 데이터), 웹 검색, 파일 생성 도구 |
| **Constraints** | 3곳 한정, 한국어, 보고서 형태 |

### Phase 2 — 작업 분해

```
[경쟁사 분석 보고서]
├── 1. [컨텍스트] memory_search("Web3 보안 감사 경쟁사")
├── 2. [수집 — 병렬]
│   ├── ∥ 2a. web_search("CertiK audit service 2026")
│   ├── ∥ 2b. web_search("Trail of Bits blockchain audit")
│   └── ∥ 2c. web_search("OpenZeppelin security audit")
├── 3. [상세 — 병렬]
│   ├── ∥ 3a. web_fetch(CertiK 서비스 페이지)
│   ├── ∥ 3b. web_fetch(Trail of Bits 서비스 페이지)
│   └── ∥ 3c. web_fetch(OpenZeppelin 서비스 페이지)
├── 4. [분석] 비교 매트릭스 작성 (서비스, 가격, 고객, 강점/약점)
├── 5. [생성] 보고서 파일 작성
├── 6. [저장] memory_store(category:"projects", subcategory:"sapiens")
└── 7. [알림] messenger_send(platform:"telegram")
```

### Phase 3 — 실행 전략

**하이브리드**: 단계 2a/2b/2c 병렬 → 단계 3a/3b/3c 병렬 → 단계 4~7 순차

### Phase 4 — 도구 호출 순서

```
1. memory_search(query:"Web3 보안 감사 경쟁사", category:"projects")
   → 기존 데이터 2건 발견 (CertiK 2025년 분석, 시장 규모 데이터)

2. [병렬 실행]
   web_search("CertiK blockchain security audit 2026 services pricing")
   web_search("Trail of Bits smart contract audit 2026")
   web_search("OpenZeppelin security services audit 2026")

3. [병렬 실행]
   web_fetch("https://www.certik.com/services")
   web_fetch("https://www.trailofbits.com/services")
   web_fetch("https://www.openzeppelin.com/security-audits")

4. [분석] 수집된 데이터로 비교 매트릭스 작성
   | 항목 | CertiK | Trail of Bits | OpenZeppelin |
   |------|--------|---------------|--------------|
   | 설립 | ... | ... | ... |
   | 주요 서비스 | ... | ... | ... |
   | 차별점 | ... | ... | ... |

5. [파일 생성] competitor-analysis-2026-03-21.md

6. memory_store({
     category: "projects",
     subcategory: "sapiens",
     title: "Web3 보안 감사 경쟁사 비교 분석 (2026-03)",
     content: "[보고서 전문]",
     tags: ["경쟁사", "보안감사", "CertiK", "TrailOfBits", "OpenZeppelin"],
     importance: 7
   })

7. messenger_send({
     platform: "telegram",
     message: "경쟁사 분석 보고서 완성: Web3 보안 감사 시장 3사 비교\n주요 인사이트: ..."
   })

8. memory_daily_log({ entry: "경쟁사 분석 보고서 작성 완료 (CertiK/ToB/OZ)", type: "done" })
```

### Phase 5 — 최종 출력

```markdown
## 작업 완료 보고

**요청**: Web3 보안 감사 시장 경쟁사 3곳 비교 분석
**상태**: 완료

### 실행 단계
1. 기존 메모리 조회 — 완료: 2건 기존 데이터 활용
2. 웹 검색 (3곳 병렬) — 완료: 각 경쟁사별 5-8개 소스 수집
3. 상세 페이지 수집 — 완료: 서비스 페이지 3건
4. 비교 매트릭스 작성 — 완료: 8개 항목 기준
5. 보고서 파일 생성 — 완료: competitor-analysis-2026-03-21.md
6. 메모리 저장 — 완료: projects/sapiens/ (importance: 7)
7. Telegram 알림 — 완료

### 주요 결과물
- competitor-analysis-2026-03-21.md (비교 보고서)

### 메모리 저장
- projects/sapiens/2026-03-21_web3-보안-감사-경쟁사-비교-분석.md (importance: 7)

### 다음 단계 제안
- 각 경쟁사의 최근 감사 보고서 샘플 분석
- Sapiens와의 차별화 전략 수립
```

---

## 예시 2: RSA Conference 참석 준비

**유형**: 리서치 + 스케줄링 + 문서 생성 (하이브리드 패턴)

### 원래 요청
> "다음 달 RSA Conference 참석 준비 도와줘. 관심 세션 정리하고, 미팅 일정 잡고, 명함에 넣을 자기소개도 준비해."

### Phase 1 — 요청 이해

| 축 | 분석 |
|----|------|
| **What** | RSA Conference 참석 준비 (세션 + 미팅 + 자기소개) |
| **Done when** | 관심 세션 리스트, 미팅 스케줄 초안, 영문 자기소개 완성 |
| **With what** | 웹 검색(RSA 일정), 메모리(사용자 프로필), 파일 생성 |
| **Constraints** | 영어 콘텐츠 (해외 행사), 비즈니스 톤 |

### Phase 2 — 작업 분해

```
[RSA Conference 준비]
├── 1. [컨텍스트] memory_search("RSA Conference") + memory_search("Evan Lee 프로필")
├── 2. [세션 리서치 — 병렬]
│   ├── ∥ 2a. web_search("RSA Conference 2026 agenda Web3 security")
│   └── ∥ 2b. web_search("RSA Conference 2026 schedule blockchain")
├── 3. [세션 정리] 관심 세션 리스트 작성 (시간순 정렬)
├── 4. [자기소개] 영문 자기소개 초안 (CEO, Sapiens, Web3 Security)
├── 5. [미팅] 미팅 요청 이메일 템플릿 작성
├── 6. [리마인더] task_create("RSA 준비 리마인드", cron: 행사 3일 전)
├── 7. [저장] memory_store × 3 (세션, 자기소개, 미팅템플릿)
└── 8. [알림] messenger_send("RSA 준비 완료")
```

### Phase 3 — 실행 전략

**하이브리드**: 컨텍스트 조회(순차) → 세션 리서치(병렬) → 문서 생성 3건(병렬 가능) → 저장/알림

### Phase 4 — 도구 호출 순서

```
1. memory_search(query:"RSA Conference") → 작년 참석 이력 확인
   memory_search(query:"Evan Lee") → 프로필 정보 확인

2. [병렬]
   web_search("RSA Conference 2026 April agenda Web3 security sessions")
   web_search("RSA Conference 2026 blockchain smart contract sessions speakers")

3. 관심 세션 리스트 작성 (rsa-sessions-2026.md)
   - Web3/블록체인 보안 관련 세션 필터링
   - 시간순 정렬 + 우선순위 표시

4. 영문 자기소개 작성 (intro-rsa-2026.md)
   "Evan Lee, CEO of Rutile Corp. Leading Sapiens, an AI-powered Web3 security..."

5. 미팅 요청 이메일 템플릿 작성 (meeting-template-rsa.md)

6. task_create({
     name: "RSA Conference 준비 리마인드",
     prompt: "RSA Conference 참석 준비물 체크리스트 Telegram 전송",
     cron: null,  // 수동 실행 또는 날짜 지정
     allowedTools: ["memory-manager", "messenger-bot"]
   })

7. [병렬]
   memory_store({category:"projects", subcategory:"rutile", title:"RSA 2026 관심 세션", ...})
   memory_store({category:"projects", subcategory:"rutile", title:"RSA 2026 자기소개", ...})
   memory_store({category:"projects", subcategory:"rutile", title:"RSA 2026 미팅 템플릿", ...})

8. messenger_send({platform:"telegram", message:"RSA Conference 준비 완료: 세션 N개, 자기소개, 미팅 템플릿"})
   memory_daily_log({entry:"RSA Conference 2026 참석 준비 완료", type:"done"})
```

### Phase 5 — 최종 출력

```markdown
## 작업 완료 보고

**요청**: RSA Conference 참석 준비 (세션, 미팅, 자기소개)
**상태**: 완료

### 실행 단계
1. 기존 메모리 조회 — 완료: 프로필 정보 활용
2. 세션 리서치 — 완료: Web3/블록체인 관련 12개 세션 발견
3. 관심 세션 리스트 — 완료: 상위 5개 세션 우선순위 지정
4. 영문 자기소개 — 완료: 150단어 비즈니스 톤
5. 미팅 이메일 템플릿 — 완료: 3가지 시나리오별 템플릿
6. 리마인더 등록 — 완료: 태스크 ID #3
7. 메모리 저장 — 완료: projects/rutile/ 3건

### 주요 결과물
- rsa-sessions-2026.md (관심 세션 리스트)
- intro-rsa-2026.md (영문 자기소개)
- meeting-template-rsa.md (미팅 요청 이메일 템플릿)

### 메모리 저장
- projects/rutile/2026-03-21_rsa-2026-관심-세션.md (importance: 6)
- projects/rutile/2026-03-21_rsa-2026-자기소개.md (importance: 5)
- projects/rutile/2026-03-21_rsa-2026-미팅-템플릿.md (importance: 5)
```

---

## 예시 3: Sapiens 기술 문서 업데이트

**유형**: 조사 + 수정 + 검증 (순차 + 조건부 분기 패턴)

### 원래 요청
> "Sapiens의 기술 문서가 PydanticAI 마이그레이션 이후 업데이트 안 됐어. 현재 코드베이스 기준으로 문서 업데이트해줘."

### Phase 1 — 요청 이해

| 축 | 분석 |
|----|------|
| **What** | Sapiens 기술 문서를 현재 코드베이스(PydanticAI 기반)에 맞게 업데이트 |
| **Done when** | 문서가 현재 아키텍처/API를 정확히 반영 |
| **With what** | 메모리(마이그레이션 이력), 코드베이스 읽기, 파일 편집 |
| **Constraints** | 기존 문서 구조 유지, 변경된 부분만 수정 |

### Phase 2 — 작업 분해

```
[기술 문서 업데이트]
├── 1. [컨텍스트] memory_search("Sapiens PydanticAI 마이그레이션")
├── 2. [현황 — 병렬]
│   ├── ∥ 2a. 현재 기술 문서 읽기 (파일 시스템)
│   └── ∥ 2b. 현재 코드 구조 파악 (파일 시스템)
├── 3. [비교] 문서 vs 코드 불일치 항목 식별
├── 4. [수정 — 순차] 불일치 항목별 문서 수정
│   ├── 4a. 아키텍처 다이어그램 업데이트
│   ├── 4b. API 레퍼런스 업데이트
│   ├── 4c. 설치/설정 가이드 업데이트
│   └── 4d. 예제 코드 업데이트
├── 5. [검증] 수정된 문서의 코드 예제 동작 확인
├── 6. [저장] memory_store(마이그레이션 후 문서 업데이트 이력)
└── 7. [알림] messenger_send("기술 문서 업데이트 완료")
```

### Phase 3 — 실행 전략

**순차 + 조건부**: 현황 파악(병렬) → 불일치 식별(순차) → 수정은 불일치 항목 수에 따라 동적

### Phase 4 — 도구 호출 순서

```
1. memory_search(query:"Sapiens PydanticAI 마이그레이션", category:"projects")
   → 마이그레이션 결정 이유, 변경 범위, 날짜 확인

2. [병렬 — 파일 시스템 읽기]
   현재 기술 문서 파일들 읽기 (README.md, docs/*.md)
   현재 소스 코드 구조 파악 (src/ 디렉토리 탐색)

3. 불일치 분석 결과:
   - 아키텍처: LangChain → PydanticAI 전환 미반영 (4곳)
   - API: 엔드포인트 3개 추가, 2개 삭제 미반영
   - 설정: 환경 변수 5개 변경 미반영
   - 예제: 코드 스니펫 8개 구버전

4. [순차 수정]
   4a. docs/architecture.md 수정 — PydanticAI 기반 구조도
   4b. docs/api-reference.md 수정 — 엔드포인트 추가/삭제 반영
   4c. docs/setup-guide.md 수정 — 환경 변수 변경 반영
   4d. 각 문서 내 코드 스니펫 8개 업데이트

5. [검증] 수정된 예제 코드 중 실행 가능한 것 bash로 테스트

6. memory_store({
     category: "projects",
     subcategory: "sapiens",
     title: "기술 문서 업데이트 (PydanticAI 마이그레이션 반영)",
     content: "변경 요약: 아키텍처 4곳, API 5곳, 설정 5곳, 예제 8곳 수정",
     tags: ["sapiens", "문서", "PydanticAI", "마이그레이션"],
     importance: 6
   })

7. messenger_send({
     platform: "telegram",
     message: "Sapiens 기술 문서 업데이트 완료\n- 아키텍처: 4곳\n- API: 5곳\n- 설정: 5곳\n- 예제: 8곳"
   })
   memory_daily_log({entry:"Sapiens 기술 문서 PydanticAI 반영 업데이트 완료", type:"done"})
```

### Phase 5 — 최종 출력

```markdown
## 작업 완료 보고

**요청**: Sapiens 기술 문서 PydanticAI 마이그레이션 반영 업데이트
**상태**: 완료

### 실행 단계
1. 마이그레이션 이력 조회 — 완료: 2026-02 마이그레이션 기록 확인
2. 현황 파악 — 완료: 문서 4개 + 소스 코드 구조 분석
3. 불일치 식별 — 완료: 22개 항목 발견
4. 문서 수정 — 완료: 4개 문서, 22개 항목 수정
5. 예제 코드 검증 — 완료: 8개 중 8개 정상 동작
6. 메모리 저장 — 완료: projects/sapiens/

### 주요 결과물
- docs/architecture.md — PydanticAI 기반 구조도 반영
- docs/api-reference.md — 엔드포인트 추가/삭제 반영
- docs/setup-guide.md — 환경 변수 변경 반영
- 코드 스니펫 8개 업데이트

### 메모리 저장
- projects/sapiens/2026-03-21_기술-문서-업데이트-pydanticai.md (importance: 6)

### 다음 단계 제안
- CHANGELOG.md 업데이트
- 외부 개발자용 퀵스타트 가이드 작성
```
