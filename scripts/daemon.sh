#!/usr/bin/env bash

# OpenClaw-CC Daemon Script
# Telegram 폴링 루프 + webhook-bridge 관리
#
# Usage:
#   ./scripts/daemon.sh start   — 데몬 시작
#   ./scripts/daemon.sh stop    — 데몬 중지
#   ./scripts/daemon.sh status  — 데몬 상태 확인
#   ./scripts/daemon.sh restart — 재시작

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$PROJECT_DIR/scheduler-data/daemon.pid"
LOG_FILE="$PROJECT_DIR/scheduler-data/logs/daemon.log"
POLL_INTERVAL="${POLL_INTERVAL:-60}"

# .env 소싱
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

TELEGRAM_TOKEN="${TELEGRAM_BOT_TOKEN:-}"

# ─── Helper Functions ────────────────────────────────────────

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

ensure_dirs() {
  mkdir -p "$PROJECT_DIR/scheduler-data/logs"
}

is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    else
      rm -f "$PID_FILE"
      return 1
    fi
  fi
  return 1
}

# ─── Polling Loop ────────────────────────────────────────────

poll_loop() {
  local offset=0

  log "Polling loop started (interval: ${POLL_INTERVAL}s)"

  while true; do
    if [ -z "$TELEGRAM_TOKEN" ]; then
      log "WARN: TELEGRAM_BOT_TOKEN not set, sleeping..."
      sleep "$POLL_INTERVAL"
      continue
    fi

    # Telegram getUpdates
    local response
    response=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}&limit=10&timeout=30" 2>/dev/null || echo '{"ok":false}')

    # Parse updates
    local ok
    ok=$(echo "$response" | node -e "
      const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
      if (!data.ok || !data.result?.length) { console.log('none'); process.exit(0); }
      for (const u of data.result) {
        if (u.message?.text) {
          const t = u.message.text;
          const chatId = u.message.chat.id;
          const user = u.message.from?.username || 'unknown';
          console.log(JSON.stringify({id: u.update_id, chatId, user, text: t}));
        }
      }
    " 2>/dev/null || echo "none")

    if [ "$ok" != "none" ] && [ -n "$ok" ]; then
      echo "$ok" | while IFS= read -r line; do
        [ -z "$line" ] && continue
        [ "$line" = "none" ] && continue

        local update_id chat_id text
        update_id=$(echo "$line" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).id)" 2>/dev/null || echo "0")
        chat_id=$(echo "$line" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).chatId)" 2>/dev/null || echo "0")
        text=$(echo "$line" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).text)" 2>/dev/null || echo "")

        # offset 업데이트
        if [ "$update_id" -gt "0" ] 2>/dev/null; then
          offset=$((update_id + 1))
        fi

        # /ask 또는 일반 텍스트만 Claude에 전달
        if echo "$text" | grep -q "^/ask "; then
          local prompt="${text#/ask }"
          log "Processing /ask from chat $chat_id: $prompt"

          # 처리 중 알림
          curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{\"chat_id\":${chat_id},\"text\":\"⏳ 처리 중...\"}" >/dev/null 2>&1

          # Claude 호출
          local claude_response
          claude_response=$(cd "$PROJECT_DIR" && claude -p "${prompt}" --allowedTools "memory-manager,messenger-bot" --output-format text 2>/dev/null | head -c 4000 || echo "⚠️ 처리 중 오류 발생")

          # 응답 전송
          curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -H "Content-Type: application/json" \
            -d "$(node -e "console.log(JSON.stringify({chat_id:${chat_id},text:process.argv[1],parse_mode:'Markdown'}))" "$claude_response" 2>/dev/null)" >/dev/null 2>&1

          log "Response sent to chat $chat_id"

        elif echo "$text" | grep -q "^/status$"; then
          curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{\"chat_id\":${chat_id},\"text\":\"🟢 OpenClaw-CC daemon is running\"}" >/dev/null 2>&1

        elif ! echo "$text" | grep -q "^/"; then
          # 일반 텍스트 → /ask와 동일 처리
          log "Processing message from chat $chat_id: $text"

          curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{\"chat_id\":${chat_id},\"text\":\"⏳ 처리 중...\"}" >/dev/null 2>&1

          local claude_response
          claude_response=$(cd "$PROJECT_DIR" && claude -p "${text}" --allowedTools "memory-manager,messenger-bot" --output-format text 2>/dev/null | head -c 4000 || echo "⚠️ 처리 중 오류 발생")

          curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -H "Content-Type: application/json" \
            -d "$(node -e "console.log(JSON.stringify({chat_id:${chat_id},text:process.argv[1],parse_mode:'Markdown'}))" "$claude_response" 2>/dev/null)" >/dev/null 2>&1
        fi
      done
    fi

    sleep "$POLL_INTERVAL"
  done
}

# ─── Commands ────────────────────────────────────────────────

cmd_start() {
  ensure_dirs

  if is_running; then
    local pid
    pid=$(cat "$PID_FILE")
    echo "Daemon already running (PID: $pid)"
    exit 1
  fi

  log "Starting OpenClaw-CC daemon..."
  nohup "$0" _run >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  echo "Daemon started (PID: $!)"
  log "Daemon started (PID: $!)"
}

cmd_stop() {
  if ! is_running; then
    echo "Daemon is not running"
    exit 0
  fi

  local pid
  pid=$(cat "$PID_FILE")
  log "Stopping daemon (PID: $pid)..."
  kill "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "Daemon stopped"
  log "Daemon stopped"
}

cmd_status() {
  if is_running; then
    local pid
    pid=$(cat "$PID_FILE")
    echo "🟢 Daemon is running (PID: $pid)"
    echo "   Log: $LOG_FILE"
    echo "   Poll interval: ${POLL_INTERVAL}s"
    echo "   Telegram: ${TELEGRAM_TOKEN:+configured}"
    echo "   Telegram: ${TELEGRAM_TOKEN:-not configured}"
  else
    echo "🔴 Daemon is not running"
  fi
}

cmd_restart() {
  cmd_stop
  sleep 1
  cmd_start
}

# ─── Main ────────────────────────────────────────────────────

case "${1:-help}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  status)  cmd_status ;;
  restart) cmd_restart ;;
  _run)    poll_loop ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    exit 1
    ;;
esac
