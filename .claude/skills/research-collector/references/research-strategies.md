# research-strategies.md — 리서치 유형별 상세 검색 전략

> **용도**: SKILL.md의 검색 전략을 보완하는 상세 참조 문서
> **참조**: SKILL.md Step 2 (검색 전략), Step 3 (정보 수집)

---

## 1. 검색 쿼리 생성 원칙

### 1.1 이중 언어 전략

모든 주제에 대해 한국어·영어 쿼리를 반드시 쌍으로 생성한다.

| 목적 | 한국어 쿼리 | 영어 쿼리 |
|------|------------|-----------|
| 국내 시장 정보 | 효과적 | 제한적 |
| 글로벌 트렌드 | 제한적 | 효과적 |
| 기술 문서 | 제한적 | 효과적 |
| 인물 정보 (한국인) | 효과적 | 보조적 |
| 인물 정보 (외국인) | 보조적 | 효과적 |

### 1.2 검색 연산자 활용

```
"정확한 구문"           → 정확한 문구 매칭
site:techcrunch.com     → 특정 사이트 내 검색
-제외어                 → 특정 단어 제외
filetype:pdf            → 파일 형식 지정
after:2025-01-01        → 날짜 필터 (Google)
```

### 1.3 날짜 키워드 패턴

최신성이 중요한 리서치에서 사용:

| 목적 | 한국어 키워드 | 영어 키워드 |
|------|-------------|-------------|
| 올해 | "2026", "올해" | "2026", "this year" |
| 최근 | "최근", "최신", "신규" | "latest", "recent", "new" |
| 특정 분기 | "2026 1분기", "2026 상반기" | "2026 Q1", "2026 H1" |
| 지난 N개월 | "최근 3개월" | "last 3 months", "past quarter" |

---

## 2. 유형별 상세 검색 전략

### 2.1 경쟁사 분석

**Phase A — 경쟁사 식별** (기존 목록이 없을 때):

```
쿼리 예시:
  KR: "{제품/서비스} 대안 비교 2026"
  EN: "{product} alternatives competitors 2026"
  KR: "{제품} vs"
  EN: "companies like {company} {industry}"
```

**Phase B — 개별 경쟁사 조사**:

```
쿼리 예시 (경쟁사 X에 대해):
  뉴스:    "{X} funding announcement 2026" / "{X} 투자 유치"
  제품:    "{X} product launch update" / "{X} 신제품 출시"
  기술:    "{X} tech stack engineering blog" / "{X} 기술 블로그"
  채용:    "{X} hiring jobs" (채용 동향 = 성장 방향 시그널)
  재무:    "{X} revenue valuation" / "{X} 매출 기업가치"
```

**Phase C — 비교 매트릭스 축**:

| 비교 축 | 데이터 소스 |
|---------|------------|
| 제품 기능 | 공식 사이트, Product Hunt |
| 가격 정책 | 공식 Pricing 페이지 |
| 기술 스택 | 엔지니어링 블로그, StackShare |
| 팀 규모/구성 | LinkedIn, Crunchbase |
| 펀딩 히스토리 | Crunchbase, PitchBook |
| 고객/사용 사례 | 케이스 스터디, G2 리뷰 |

### 2.2 기술 동향

**쿼리 구조 (기술 T에 대해)**:

```
일반 동향:
  KR: "{T} 최신 동향 2026"
  EN: "{T} trend 2026 state of"

릴리즈/업데이트:
  KR: "{T} 새 버전 릴리즈"
  EN: "{T} release changelog what's new"

비교/벤치마크:
  KR: "{T} vs {대안} 비교"
  EN: "{T} vs {alternative} benchmark comparison"

채택/사용 사례:
  KR: "{T} 도입 사례 후기"
  EN: "{T} adoption case study production"

전문가 의견:
  EN: "{T} opinion analysis hacker news"
  KR: "{T} 전망 분석"
```

**소스 우선순위 (기술 동향)**:

1. 공식 릴리즈 노트 / 체인지로그
2. 공식 블로그 / RFC / 제안서
3. 주요 테크 미디어 (InfoQ, The New Stack, ZDNet)
4. 컨퍼런스 발표 자료 (YouTube, SlideShare)
5. Hacker News / Reddit 토론

### 2.3 인물 조사

**쿼리 구조 (인물 P, 소속 O에 대해)**:

```
기본 프로필:
  KR: "{P} {O}"
  EN: "{P} {O} LinkedIn"

전문 활동:
  EN: "{P} conference speaker presentation"
  EN: "{P} {O} interview podcast"
  KR: "{P} 발표 인터뷰"

저작/기고:
  EN: "{P} blog post medium substack"
  EN: "{P} paper publication"
  KR: "{P} 기고 칼럼"

소셜:
  EN: "{P} twitter X github"
```

**소스 우선순위 (인물 조사)**:

1. LinkedIn 프로필
2. 소속 기관 공식 페이지
3. 컨퍼런스/밋업 발표 기록
4. 인터뷰/팟캐스트 출연
5. 개인 블로그/GitHub/Twitter

### 2.4 시장 조사

**쿼리 구조 (시장 M에 대해)**:

```
시장 규모:
  KR: "{M} 시장 규모 전망 2026"
  EN: "{M} market size forecast 2026"

성장률:
  EN: "{M} market CAGR growth rate"
  KR: "{M} 시장 성장률"

주요 플레이어:
  KR: "{M} 시장 주요 기업 점유율"
  EN: "{M} market key players market share leaders"

투자 동향:
  KR: "{M} 투자 M&A 2026"
  EN: "{M} investment funding M&A 2026"

규제:
  KR: "{M} 규제 정책 법안"
  EN: "{M} regulation policy compliance"
```

**소스 우선순위 (시장 조사)**:

1. 시장 리서치 기관 (Gartner, IDC, Statista, Grand View Research)
2. 산업 협회 / 정부 통계 (KISA, KOTRA, 통계청)
3. 투자/금융 리포트 (CB Insights, PitchBook)
4. 주요 경제 미디어 (Bloomberg, Forbes, 매일경제, 한국경제)
5. 컨설팅 기관 보고서 (McKinsey, BCG, Deloitte)

---

## 3. 소스 신뢰도 매트릭스

| 소스 유형 | 신뢰도 | 수치 데이터 | 정성 분석 | 최신성 |
|----------|--------|-----------|----------|--------|
| 공식 발표/보도자료 | 높음 | 높음 | 중간 | 높음 |
| 리서치 기관 보고서 | 높음 | 높음 | 높음 | 중간 |
| 주요 테크 미디어 | 높음 | 중간 | 높음 | 높음 |
| 정부/협회 통계 | 높음 | 높음 | 낮음 | 낮음 |
| 전문가 블로그 | 중간 | 낮음 | 높음 | 높음 |
| 커뮤니티 토론 | 낮음 | 낮음 | 중간 | 높음 |
| 위키피디아 | 중간 | 중간 | 중간 | 낮음 |

**규칙**: 수치 데이터는 반드시 신뢰도 "높음" 소스에서만 인용. 정성 분석은 "중간" 이상 허용.

---

## 4. 수집 품질 체크리스트

수집 완료 후 다음 항목을 점검한다:

- [ ] 모든 수치에 출처 URL이 첨부되었는가?
- [ ] 한국어·영어 양측 소스가 포함되었는가?
- [ ] 6개월 이상 오래된 정보에 시점이 표기되었는가?
- [ ] 동일 사실에 대해 2개 이상 소스를 교차 확인했는가? (수치 데이터)
- [ ] 기존 메모리와 중복되는 정보를 제거했는가?
- [ ] memory_store 파라미터(category, tags, importance)가 매핑 규칙과 일치하는가?
