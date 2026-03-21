#!/usr/bin/env python3
"""
generate-briefing.py — 메모리 검색 결과를 브리핑 마크다운으로 변환

사용법:
  echo '{"type":"morning","yesterday_logs":[],"todos":[],"schedule":[]}' | python generate-briefing.py
  echo '{"type":"evening","daily_log":[],"completed":[],"incomplete":[]}' | python generate-briefing.py
  echo '{"type":"weekly","weekly_logs":[],"projects":[],"decisions":[]}' | python generate-briefing.py
"""

import json
import sys
import io
from datetime import datetime, timedelta

# Windows cp949 인코딩 문제 방지
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")

WEEKDAYS_KO = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]

PRIORITY_ORDER = {"priority-high": 0, "priority-mid": 1, "priority-low": 2}
PRIORITY_ICONS = {"priority-high": "🔴", "priority-mid": "🟡", "priority-low": "🟢"}
PRIORITY_LABELS = {"priority-high": "긴급", "priority-mid": "중요", "priority-low": "일반"}


def get_weekday_ko(dt):
    """datetime 객체에서 한국어 요일 반환"""
    return WEEKDAYS_KO[dt.weekday()]


def get_priority(tags):
    """태그 목록에서 우선순위 추출"""
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",")]
    for tag in tags:
        if tag in PRIORITY_ORDER:
            return tag
    return "priority-low"


def sort_by_priority(items):
    """할일 목록을 우선순위별로 정렬"""
    return sorted(items, key=lambda x: PRIORITY_ORDER.get(get_priority(x.get("tags", [])), 99))


def group_by_priority(items):
    """할일 목록을 우선순위별로 그룹핑"""
    groups = {"priority-high": [], "priority-mid": [], "priority-low": []}
    for item in items:
        priority = get_priority(item.get("tags", []))
        groups[priority].append(item)
    return groups


def format_todo_item(item):
    """할일 항목을 포맷팅"""
    title = item.get("title", "제목 없음")
    tags = item.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",")]
    project = next((t for t in tags if t not in PRIORITY_ORDER and t not in ("todo", "done")), "")
    suffix = f" — {project}" if project else ""
    return f"{title}{suffix}"


def generate_morning_briefing(yesterday_logs, todos, schedule, news=None):
    """모닝 브리핑 마크다운 생성"""
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    weekday = get_weekday_ko(now)

    lines = [f"## ☀️ 모닝 브리핑 — {today} ({weekday})", ""]

    # 어제 요약
    lines.append("### 📋 어제 요약")
    if yesterday_logs:
        for log in yesterday_logs[:3]:
            snippet = log.get("snippet", log.get("title", ""))
            lines.append(f"- {snippet}")
    else:
        lines.append("- 어제 기록이 없습니다.")
    lines.append("")

    # 오늘 할일
    grouped = group_by_priority(todos)
    total = len(todos)
    lines.append(f"### ☐ 오늘 할일 ({total}건)")

    for priority_key in ["priority-high", "priority-mid", "priority-low"]:
        icon = PRIORITY_ICONS[priority_key]
        label = PRIORITY_LABELS[priority_key]
        items = grouped[priority_key]
        lines.append(f"**{icon} {label} ({priority_key})**")
        if items:
            for i, item in enumerate(items, 1):
                lines.append(f"{i}. {format_todo_item(item)}")
        else:
            lines.append("없음")
        lines.append("")

    # 오늘 일정
    lines.append("### 📅 오늘 일정")
    if schedule:
        for event in schedule:
            time_str = event.get("time", "")
            content = event.get("title", event.get("snippet", ""))
            lines.append(f"- {time_str} {content}")
    else:
        lines.append("- 예정된 일정이 없습니다.")
    lines.append("")

    # 업계 동향 (선택)
    lines.append("### 📰 업계 동향")
    if news:
        for item in news[:3]:
            keyword = item.get("keyword", "뉴스")
            summary = item.get("summary", "")
            url = item.get("url", "")
            if url:
                lines.append(f"- **{keyword}**: {summary} ([출처]({url}))")
            else:
                lines.append(f"- **{keyword}**: {summary}")
    else:
        lines.append("- 뉴스 수집을 건너뛰었습니다.")
    lines.append("")

    # 푸터
    lines.append("---")
    lines.append(f"*생성: {now.strftime('%H:%M')} | 할일 {total}건 | 일정 {len(schedule)}건*")

    return "\n".join(lines)


def generate_evening_review(daily_log, completed, incomplete):
    """저녁 리뷰 마크다운 생성"""
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    weekday = get_weekday_ko(now)

    lines = [f"## 🌙 데일리 리뷰 — {today} ({weekday})", ""]

    # 완료 항목
    lines.append(f"### ✅ 완료한 것 ({len(completed)}건)")
    if completed:
        for item in completed:
            title = item.get("title", "제목 없음")
            updated = item.get("updated_at", item.get("updated", ""))
            time_str = ""
            if updated:
                try:
                    dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                    time_str = f" — {dt.strftime('%H:%M')}"
                except (ValueError, AttributeError):
                    pass
            lines.append(f"- ✅ {title}{time_str}")
    else:
        lines.append("- 오늘 완료한 항목이 없습니다.")
    lines.append("")

    # 미완료 항목
    lines.append(f"### ☐ 미완료 ({len(incomplete)}건)")
    if incomplete:
        for item in sort_by_priority(incomplete):
            title = item.get("title", "제목 없음")
            importance = item.get("importance", 5)
            action = "이월" if importance >= 7 else "보류"
            lines.append(f"- ☐ {title} (importance: {importance}) → {action}")
    else:
        lines.append("- 모든 할일을 완료했습니다! 🎉")
    lines.append("")

    # 장기 미완료
    lines.append("### ⚠️ 장기 미완료 (3일 이상)")
    long_overdue = []
    for item in incomplete:
        created = item.get("created_at", item.get("created", ""))
        if created:
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                days = (now - created_dt.replace(tzinfo=None)).days
                if days >= 3:
                    long_overdue.append((item, days))
            except (ValueError, AttributeError):
                pass
    if long_overdue:
        for item, days in long_overdue:
            title = item.get("title", "제목 없음")
            created = item.get("created_at", item.get("created", ""))[:10]
            lines.append(f"- ⚠️ {title} — {created}부터 {days}일째 미완료")
    else:
        lines.append("- 없음")
    lines.append("")

    # 생산성 스코어
    total = len(completed) + len(incomplete)
    pct = round(len(completed) / total * 100) if total > 0 else 0
    emoji = "🔥" if pct >= 80 else "👍" if pct >= 50 else "💪"
    lines.append("### 📊 생산성 스코어")
    lines.append(f"**{len(completed)} / {total} = {pct}%** {emoji}")
    lines.append("")

    # 푸터
    carryover = sum(1 for item in incomplete if item.get("importance", 5) >= 7)
    lines.append("---")
    lines.append(f"*리뷰 생성: {now.strftime('%H:%M')} | 완료 {len(completed)}건 | 이월 {carryover}건*")

    return "\n".join(lines)


def generate_weekly_review(weekly_logs, projects, decisions):
    """주간 회고 마크다운 생성"""
    now = datetime.now()
    week_number = now.isocalendar()[1]

    # 이번 주 월~일 범위 계산
    monday = now - timedelta(days=now.weekday())
    sunday = monday + timedelta(days=6)
    date_range_start = monday.strftime("%m/%d")
    date_range_end = sunday.strftime("%m/%d")

    lines = [f"## 📊 주간 회고 — Week {week_number} ({date_range_start} ~ {date_range_end})", ""]

    # 프로젝트별 진행
    lines.append("### 프로젝트별 진행상황")
    if projects:
        grouped = {}
        for p in projects:
            cat = p.get("subcategory", p.get("category", "기타"))
            grouped.setdefault(cat, []).append(p)

        for project_name, items in grouped.items():
            lines.append(f"\n**{project_name}**")
            completed_items = [i for i in items if "done" in str(i.get("tags", ""))]
            in_progress = [i for i in items if "todo" in str(i.get("tags", ""))]
            lines.append(f"- 완료: {', '.join(i.get('title', '') for i in completed_items) or '없음'}")
            lines.append(f"- 진행중: {', '.join(i.get('title', '') for i in in_progress) or '없음'}")
    else:
        lines.append("이번 주 프로젝트 활동이 기록되지 않았습니다.")
    lines.append("")

    # 의사결정
    lines.append("### 주요 의사결정")
    if decisions:
        for i, d in enumerate(decisions, 1):
            content = d.get("content", d.get("title", ""))
            date = d.get("date", "")
            lines.append(f"{i}. **{content}** ({date})")
    else:
        lines.append("이번 주 기록된 의사결정이 없습니다.")
    lines.append("")

    # 주간 통계
    all_tasks = [p for p in projects if p.get("category") == "tasks"] if projects else []
    done_count = sum(1 for t in all_tasks if "done" in str(t.get("tags", "")))
    todo_count = sum(1 for t in all_tasks if "todo" in str(t.get("tags", "")))
    total_tasks = len(all_tasks) if all_tasks else done_count + todo_count

    lines.append("### 주간 통계")
    lines.append("| 항목 | 수치 |")
    lines.append("|------|------|")
    lines.append(f"| 총 할일 | {total_tasks}건 |")
    pct = round(done_count / total_tasks * 100) if total_tasks > 0 else 0
    lines.append(f"| 완료 | {done_count}건 ({pct}%) |")
    lines.append(f"| 이월 | {todo_count}건 |")
    lines.append(f"| 메모리 저장 | {len(weekly_logs)}건 |")
    lines.append("")

    # 다음 주 우선순위
    lines.append("### 다음 주 우선순위")
    remaining_high = [t for t in all_tasks
                      if "todo" in str(t.get("tags", "")) and t.get("importance", 5) >= 7]
    remaining_high.sort(key=lambda x: x.get("importance", 5), reverse=True)

    if remaining_high:
        icons = ["🔴", "🟡", "🟢"]
        for i, item in enumerate(remaining_high[:3]):
            icon = icons[i] if i < len(icons) else "·"
            lines.append(f"{i+1}. {icon} {item.get('title', '미정')}")
    else:
        lines.append("1. 🔴 (다음 주 계획 미정)")
        lines.append("2. 🟡 (다음 주 계획 미정)")
        lines.append("3. 🟢 (다음 주 계획 미정)")
    lines.append("")

    # 푸터
    lines.append("---")
    project_count = len(set(p.get("subcategory", p.get("category", "")) for p in projects)) if projects else 0
    lines.append(f"*회고 생성: {now.strftime('%Y-%m-%d %H:%M')} | {project_count}개 프로젝트 | {done_count}건 완료*")

    return "\n".join(lines)


def main():
    """stdin에서 JSON을 읽어 해당 타입의 브리핑을 stdout으로 출력"""
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}", file=sys.stderr)
        sys.exit(1)

    briefing_type = data.get("type", "morning")

    if briefing_type == "morning":
        result = generate_morning_briefing(
            yesterday_logs=data.get("yesterday_logs", []),
            todos=data.get("todos", []),
            schedule=data.get("schedule", []),
            news=data.get("news"),
        )
    elif briefing_type == "evening":
        result = generate_evening_review(
            daily_log=data.get("daily_log", []),
            completed=data.get("completed", []),
            incomplete=data.get("incomplete", []),
        )
    elif briefing_type == "weekly":
        result = generate_weekly_review(
            weekly_logs=data.get("weekly_logs", []),
            projects=data.get("projects", []),
            decisions=data.get("decisions", []),
        )
    else:
        print(f"알 수 없는 브리핑 타입: {briefing_type}", file=sys.stderr)
        sys.exit(1)

    print(result)


if __name__ == "__main__":
    main()
