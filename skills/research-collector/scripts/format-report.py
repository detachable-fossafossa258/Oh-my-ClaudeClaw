#!/usr/bin/env python3
"""
format-report.py — 리서치 보고서 포맷터

stdin으로 JSON을 받아 마크다운 보고서를 stdout으로 출력한다.

사용법:
  echo '{"topic":"AI Agent","type":"기술 동향","depth":"standard",...}' | python format-report.py

입력 JSON 스키마:
  {
    "topic": "리서치 주제",
    "type": "경쟁사 분석 | 기술 동향 | 인물 조사 | 시장 조사",
    "depth": "quick | standard | deep",
    "date": "YYYY-MM-DD",
    "queries_count": 5,
    "sources_count": 8,
    "findings": [
      {
        "title": "발견 제목",
        "summary": "한 줄 요약",
        "url": "https://...",
        "date": "YYYY-MM-DD",
        "reliability": "높음 | 중간 | 낮음"
      }
    ],
    "analysis": "상세 분석 마크다운 텍스트",
    "sources": [
      {
        "title": "소스 제목",
        "url": "https://...",
        "date": "YYYY-MM-DD",
        "reliability": "높음 | 중간 | 낮음"
      }
    ],
    "memory_entries": [
      {
        "title": "저장 항목 제목",
        "category": "knowledge",
        "tags": ["태그1", "태그2"],
        "importance": 6
      }
    ],
    "open_questions": [
      "추가 조사가 필요한 질문"
    ]
  }
"""

import io
import json
import sys
from datetime import datetime

# Windows 환경에서 UTF-8 출력 보장
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def format_report(data: dict) -> str:
    """JSON 데이터를 마크다운 보고서로 변환한다."""
    lines = []

    # 헤더
    topic = data.get("topic", "Unknown")
    research_type = data.get("type", "일반 조사")
    depth = data.get("depth", "standard")
    date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    queries_count = data.get("queries_count", 0)
    sources_count = data.get("sources_count", 0)

    lines.append(f"## 리서치 보고서: {topic}")
    lines.append("")
    lines.append(f"**조사 일시**: {date}")
    lines.append(f"**리서치 유형**: {research_type}")
    lines.append(f"**깊이**: {depth}")
    lines.append(f"**검색 쿼리**: {queries_count}개 | **수집 소스**: {sources_count}개")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 핵심 발견
    findings = data.get("findings", [])
    lines.append("### 핵심 발견")
    lines.append("")
    if findings:
        for i, f in enumerate(findings, 1):
            title = f.get("title", "")
            summary = f.get("summary", "")
            url = f.get("url", "")
            if url:
                lines.append(f"{i}. **{title}** — {summary} ([출처]({url}))")
            else:
                lines.append(f"{i}. **{title}** — {summary}")
    else:
        lines.append("_(발견 항목 없음)_")
    lines.append("")

    # 상세 분석
    analysis = data.get("analysis", "")
    lines.append("### 상세 분석")
    lines.append("")
    if analysis:
        lines.append(analysis)
    else:
        lines.append("_(상세 분석 없음)_")
    lines.append("")

    # 소스 목록
    sources = data.get("sources", [])
    lines.append("### 소스 목록")
    lines.append("")
    if sources:
        lines.append("| # | 제목 | URL | 날짜 | 신뢰도 |")
        lines.append("|---|------|-----|------|--------|")
        for i, s in enumerate(sources, 1):
            title = s.get("title", "")
            url = s.get("url", "")
            date_s = s.get("date", "-")
            reliability = s.get("reliability", "-")
            lines.append(f"| {i} | {title} | {url} | {date_s} | {reliability} |")
    else:
        lines.append("_(소스 없음)_")
    lines.append("")

    # 메모리 저장 내역
    memory_entries = data.get("memory_entries", [])
    lines.append("### 메모리 저장 내역")
    lines.append("")
    if memory_entries:
        lines.append("| 항목 | category | tags | importance |")
        lines.append("|------|----------|------|------------|")
        for m in memory_entries:
            title = m.get("title", "")
            category = m.get("category", "")
            tags = ", ".join(m.get("tags", []))
            importance = m.get("importance", 5)
            lines.append(f"| {title} | {category} | {tags} | {importance} |")
    else:
        lines.append("_(저장 내역 없음)_")
    lines.append("")

    # 추가 조사 필요 항목
    open_questions = data.get("open_questions", [])
    lines.append("### 추가 조사 필요 항목")
    lines.append("")
    if open_questions:
        for q in open_questions:
            lines.append(f"- {q}")
    else:
        lines.append("_(없음)_")
    lines.append("")

    return "\n".join(lines)


def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print("Error: stdin이 비어 있습니다.", file=sys.stderr)
            sys.exit(1)

        data = json.loads(raw)
        report = format_report(data)
        print(report)

    except json.JSONDecodeError as e:
        print(f"Error: JSON 파싱 실패 — {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
