# 작업 분해 패턴 라이브러리

> task-analyzer가 Phase 2에서 작업을 서브태스크로 분해할 때 참조하는 12가지 패턴.
> 각 패턴은 **적용 상황**, **구조(트리)**, **실제 예시**를 포함한다.

---

## 1. 순차 패턴 (Sequential)

**적용 상황**: 각 단계의 출력이 다음 단계의 입력이 되는 작업

**구조**:
```
[작업]
├── Step 1: A (선행)
├── Step 2: B (A 결과 필요)
└── Step 3: C (B 결과 필요)
```

**예시**:
- 요청: "Sapiens README를 영어로 번역해줘"
- 분해:
```
[README 번역]
├── [조회] memory_search("Sapiens README") → 기존 번역 이력 확인
├── [읽기] README.md 파일 읽기
├── [번역] 한국어 → 영어 번역
├── [저장] README_EN.md 파일 생성
└── [기록] memory_daily_log(type:"done", "Sapiens README 영문 번역 완료")
```

---

## 2. 병렬 패턴 (Parallel)

**적용 상황**: 서로 독립적인 서브태스크가 여러 개인 작업

**구조**:
```
[작업]
├── ∥ Task A (독립)
├── ∥ Task B (독립)
├── ∥ Task C (독립)
└── [수집] 결과 병합
```

**예시**:
- 요청: "Discord, Telegram, Slack 각 플랫폼의 봇 API rate limit 조사해줘"
- 분해:
```
[API Rate Limit 조사]
├── ∥ [조사] Discord Bot API rate limit → web_search
├── ∥ [조사] Telegram Bot API rate limit → web_search
├── ∥ [조사] Slack Bot API rate limit → web_search
├── [병합] 비교 테이블 작성
└── [저장] memory_store(category:"knowledge", tags:["api","rate-limit"])
```

---

## 3. 하이브리드 패턴 (Hybrid)

**적용 상황**: 병렬 수집 → 순차 분석 → 병렬 출력이 필요한 복합 작업

**구조**:
```
[작업]
├── Phase A (병렬 수집)
│   ├── ∥ 수집 1
│   └── ∥ 수집 2
├── Phase B (순차 분석)
│   └── 통합 분석
└── Phase C (병렬 출력)
    ├── ∥ 보고서 생성
    └── ∥ 알림 전송
```

**예시**:
- 요청: "경쟁사 분석 보고서 작성해서 Telegram으로 보내줘"
- 분해:
```
[경쟁사 분석 보고서]
├── [컨텍스트] memory_search("경쟁사") → 기존 데이터
├── [수집 — 병렬]
│   ├── ∥ 경쟁사 A 최신 뉴스 → web_search
│   ├── ∥ 경쟁사 B 최신 뉴스 → web_search
│   └── ∥ 경쟁사 C 최신 뉴스 → web_search
├── [분석] 강점/약점 비교 매트릭스 작성
├── [출력 — 병렬]
│   ├── ∥ 보고서 파일 생성
│   └── ∥ memory_store(category:"projects", tags:["경쟁사","분석"])
└── [알림] messenger_send(platform:"telegram", message:"경쟁사 분석 보고서 완성")
```

---

## 4. 조건부 분기 패턴 (Conditional Branch)

**적용 상황**: 이전 단계의 결과에 따라 다른 경로를 택해야 하는 작업

**구조**:
```
[작업]
├── Step 1: 상태 확인
├── IF 조건 A → Branch A
├── IF 조건 B → Branch B
└── ELSE → Branch C (폴백)
```

**예시**:
- 요청: "Sapiens 프로젝트 최신 상태 확인하고 필요하면 업데이트해줘"
- 분해:
```
[Sapiens 상태 확인]
├── [확인] memory_search("Sapiens 상태") → 마지막 기록 조회
├── IF 7일 이상 경과
│   ├── [조사] web_search("Sapiens 프로젝트 최신") → 새 정보 수집
│   ├── [갱신] memory_update(mode:"append", content: 새 정보)
│   └── [알림] messenger_send("Sapiens 상태 업데이트 완료")
├── IF 7일 미만
│   └── [보고] "최근 업데이트됨, 추가 조치 불필요"
└── IF 기록 없음
    ├── [생성] 새 프로젝트 메모리 생성 → memory_store
    └── [조사] 초기 정보 수집 → web_search
```

---

## 5. 리서치형 패턴 (Research)

**적용 상황**: 정보 검색 → 수집 → 분석 → 정리가 필요한 조사 작업

**구조**:
```
[리서치]
├── [계획] 검색 쿼리 설계 (한국어 + 영어)
├── [수집] 다중 소스 검색 (∥ 병렬)
├── [필터] 관련성/신뢰도 평가
├── [분석] 패턴/인사이트 도출
├── [정리] 구조화된 보고서 작성
└── [저장] memory_store
```

**예시**:
- 요청: "2026년 Web3 보안 감사 시장 트렌드 조사해줘"
- 분해:
```
[Web3 보안 감사 트렌드]
├── [계획] 쿼리 설계: "Web3 security audit 2026 trends", "웹3 보안감사 시장"
├── [수집 — 병렬]
│   ├── ∥ web_search("Web3 security audit market 2026")
│   ├── ∥ web_search("smart contract audit trends 2026")
│   └── ∥ web_search("웹3 보안감사 시장 동향 2026")
├── [필터] 최근 6개월 이내, 신뢰 소스 우선
├── [분석] 주요 트렌드 5가지 도출
├── [정리] 트렌드 보고서 작성
└── [저장] memory_store(category:"knowledge", subcategory:"web3", tags:["보안","트렌드","2026"])
```

---

## 6. 생성형 패턴 (Creation)

**적용 상황**: 문서, 코드, 프레젠테이션 등 산출물을 새로 만드는 작업

**구조**:
```
[생성]
├── [계획] 목적, 대상 독자, 구조 설계
├── [참조] 기존 자료/템플릿 조회
├── [초안] 초안 작성
├── [검토] 품질 검증, 누락 확인
├── [완성] 최종본 작성
└── [저장] 파일 저장 + 메모리 기록
```

**예시**:
- 요청: "투자자 피칭 덱 개요 작성해줘"
- 분해:
```
[투자자 피칭 덱 개요]
├── [참조] memory_search("Rutile 투자") → 기존 자료 확인
├── [참조] memory_search("Sapiens 기술") → 제품 정보
├── [계획] 슬라이드 구조: Problem → Solution → Market → Business Model → Team → Ask
├── [초안] 각 슬라이드 핵심 메시지 초안
├── [검토] 투자자 관점에서 설득력 검증
├── [완성] 피칭-덱-개요.md 파일 생성
└── [저장] memory_store(category:"projects", subcategory:"rutile", tags:["투자","피칭"])
```

---

## 7. 분석형 패턴 (Analysis)

**적용 상황**: 데이터를 수집하고 패턴을 발견하여 결론을 도출하는 작업

**구조**:
```
[분석]
├── [수집] 분석 대상 데이터 확보
├── [정제] 데이터 정리/분류
├── [패턴] 패턴/상관관계 발견
├── [결론] 인사이트 도출
└── [보고] 분석 결과 문서화
```

**예시**:
- 요청: "지난 한 달간 내 작업 패턴 분석해줘"
- 분해:
```
[작업 패턴 분석]
├── [수집] memory_search(category:"daily-logs") → 30일간 로그
├── [수집] memory_search(category:"tasks") → 완료된 태스크
├── [정제] 카테고리별 분류, 시간대별 그룹핑
├── [패턴] 가장 생산적인 시간대, 주요 작업 유형 빈도
├── [결론] 생산성 인사이트 3-5개 도출
├── [보고] 분석 보고서 작성
└── [저장] memory_store(category:"knowledge", tags:["생산성","분석","패턴"])
```

---

## 8. 자동화형 패턴 (Automation)

**적용 상황**: 반복 작업을 자동화 파이프라인으로 구성하는 작업

**구조**:
```
[자동화]
├── [설계] 트리거 조건 + 액션 정의
├── [구현] 태스크 등록 (task_create)
├── [검증] 테스트 실행 (task_run_now)
├── [활성화] crontab 생성 (task_generate_crontab)
└── [보고] 등록 결과 보고
```

**예시**:
- 요청: "매일 아침 9시에 업계 뉴스 요약해서 Telegram으로 보내줘"
- 분해:
```
[뉴스 요약 자동화]
├── [확인] task_list() → 유사 태스크 존재 여부
├── [등록] task_create(
│       name: "업계 뉴스 브리핑",
│       prompt: "Web3 보안 업계 뉴스 검색 후 요약하여 Telegram 전송",
│       cron: "0 9 * * *",
│       allowedTools: ["memory-manager","messenger-bot"]
│   )
├── [테스트] task_run_now(id: 새 태스크 ID) → 동작 확인
├── [활성화] task_generate_crontab()
└── [보고] "매일 09:00 뉴스 브리핑 자동화 완료" + 테스트 결과
```

---

## 9. 비교형 패턴 (Comparison)

**적용 상황**: 2개 이상의 대상을 동일 기준으로 조사하여 비교하는 작업

**구조**:
```
[비교]
├── [기준] 비교 기준 항목 정의
├── [조사 — 병렬]
│   ├── ∥ 대상 A 조사
│   └── ∥ 대상 B 조사
├── [매트릭스] 비교 테이블 작성
├── [평가] 종합 평가 및 추천
└── [저장] 비교 결과 저장
```

**예시**:
- 요청: "PydanticAI vs LangChain 비교해줘"
- 분해:
```
[PydanticAI vs LangChain 비교]
├── [기준] 성능, 학습곡선, 커뮤니티, 유지보수성, 라이선스
├── [조사 — 병렬]
│   ├── ∥ web_search("PydanticAI features benchmark 2026")
│   ├── ∥ web_search("LangChain features benchmark 2026")
│   ├── ∥ memory_search("PydanticAI") → 기존 사용 경험
│   └── ∥ memory_search("LangChain") → 기존 사용 경험
├── [매트릭스] 5개 기준 × 2개 프레임워크 비교 테이블
├── [평가] Sapiens 프로젝트 기준 추천
└── [저장] memory_store(category:"knowledge", subcategory:"tech", tags:["AI","프레임워크","비교"])
```

---

## 10. 모니터링형 패턴 (Monitoring)

**적용 상황**: 특정 상태를 주기적으로 확인하고 변화 시 알림하는 작업

**구조**:
```
[모니터링]
├── [기준] 모니터링 대상 + 변화 판정 기준 정의
├── [현재] 현재 상태 캡처
├── [비교] 이전 상태와 비교 (memory_search)
├── IF 변화 감지
│   ├── [기록] memory_store 또는 memory_update
│   └── [알림] messenger_send
├── [등록] 반복 모니터링 필요 시 task_create
└── [보고] 결과 요약
```

**예시**:
- 요청: "경쟁사 웹사이트 변경 모니터링해줘"
- 분해:
```
[경쟁사 웹사이트 모니터링]
├── [현재] web_fetch("경쟁사URL") → 현재 콘텐츠 캡처
├── [비교] memory_search("경쟁사 웹사이트 스냅샷") → 이전 캡처와 비교
├── IF 변화 있음
│   ├── [기록] memory_store(변경 내용, tags:["경쟁사","모니터링"])
│   └── [알림] messenger_send("경쟁사 웹사이트 변경 감지")
├── [등록] task_create(cron: "0 */6 * * *", prompt: "경쟁사 웹사이트 변경 확인")
└── [보고] 현재 상태 + 모니터링 스케줄 안내
```

---

## 11. 마이그레이션형 패턴 (Migration)

**적용 상황**: 기존 시스템/데이터를 새로운 구조로 전환하는 작업

**구조**:
```
[마이그레이션]
├── [분석] 현재 상태 파악 (AS-IS)
├── [설계] 목표 상태 정의 (TO-BE)
├── [계획] 전환 단계 수립 + 롤백 전략
├── [실행] 단계별 전환
├── [검증] 데이터 무결성 확인
└── [보고] 마이그레이션 결과
```

**예시**:
- 요청: "Notion 메모를 OpenClaw-CC 메모리로 이전해줘"
- 분해:
```
[Notion → OpenClaw-CC 메모리 이전]
├── [분석] Notion 데이터 구조 파악 (페이지 수, 카테고리)
├── [설계] OpenClaw-CC 카테고리 매핑 (Notion DB → memory-store 6개 카테고리)
├── [계획] 이전 순서: projects → knowledge → people → tasks → inbox
├── [실행 — 순차]
│   ├── projects 카테고리 이전 → memory_store × N
│   ├── knowledge 카테고리 이전 → memory_store × N
│   └── ... (카테고리별)
├── [검증] memory_stats() → 건수 비교, memory_search 샘플 검증
└── [보고] 이전 결과: 총 X건, 성공 Y건, 실패 Z건
```

---

## 12. 디버깅형 패턴 (Debugging)

**적용 상황**: 문제의 원인을 추적하고 해결하는 작업

**구조**:
```
[디버깅]
├── [증상] 문제 현상 정확히 기록
├── [가설] 가능한 원인 2-3개 나열
├── [검증 — 순차]
│   ├── 가설 1 검증 → 확인/기각
│   ├── 가설 2 검증 → 확인/기각
│   └── ...
├── [수정] 원인에 맞는 수정 적용
├── [확인] 수정 후 문제 재현 안 됨 확인
└── [기록] memory_store (해결 방법 기록)
```

**예시**:
- 요청: "memory_search가 한글 검색이 안 돼, 원인 찾아줘"
- 분해:
```
[한글 검색 디버깅]
├── [증상] memory_search(query:"한글키워드") → 결과 0건
├── [가설]
│   ├── H1: FTS5 토크나이저가 한글 미지원
│   ├── H2: 인덱싱 시 한글이 깨짐
│   └── H3: 검색 쿼리 인코딩 문제
├── [검증]
│   ├── H1: db.js의 tokenize 설정 확인 → unicode61 확인
│   ├── H2: memory_get으로 저장된 파일 원본 확인
│   └── H3: search.js에서 쿼리 로깅 추가
├── [수정] 원인에 맞는 코드 수정
├── [확인] memory_store → memory_search 한글 검색 테스트
└── [기록] memory_store(category:"knowledge", tags:["디버깅","한글","FTS5"])
```
