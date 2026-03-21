#!/bin/bash
# OpenClaw-CC Setup Script
# Claude Code Native AI Assistant 설치 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔══════════════════════════════════════════════╗"
echo "║       OpenClaw-CC Setup Script               ║"
echo "║   Claude Code Native AI Assistant            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── 1. Check Prerequisites ─────────────────────────────────
echo "▶ [1/7] Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js v20+ first."
    echo "   brew install node  (macOS)"
    echo "   sudo apt install nodejs  (Ubuntu)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js v20+ required. Current: $(node -v)"
    exit 1
fi

if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude Code CLI not found. Install it first:"
    echo "   npm install -g @anthropic-ai/claude-code"
    echo "   (Continuing setup, but CLI needed for runtime)"
fi

echo "✅ Node.js $(node -v) detected"

# ─── 2. Install MCP Server Dependencies ─────────────────────
echo ""
echo "▶ [2/7] Installing MCP server dependencies..."

for server_dir in "$PROJECT_DIR"/mcp-servers/*/; do
    if [ -f "$server_dir/package.json" ]; then
        server_name=$(basename "$server_dir")
        echo "   📦 Installing $server_name..."
        (cd "$server_dir" && npm install --silent 2>&1 | tail -1)
    fi
done

echo "✅ MCP servers installed"

# ─── 3. Initialize Memory Store ─────────────────────────────
echo ""
echo "▶ [3/7] Initializing memory store..."

MEMORY_ROOT="$PROJECT_DIR/memory-store"
mkdir -p "$MEMORY_ROOT"/{inbox,projects,people,knowledge,daily-logs,tasks}

# Create initial index
if [ ! -f "$MEMORY_ROOT/projects/rutile/_meta.md" ]; then
    mkdir -p "$MEMORY_ROOT/projects/rutile"
    cat > "$MEMORY_ROOT/projects/rutile/_meta.md" << 'EOF'
---
title: Rutile Corp
category: projects
subcategory: rutile
tags: [rutile, startup, web3, security]
importance: 9
created: 2026-01-01T00:00:00Z
---

# Rutile Corp

Delaware C-Corporation. Web3 스마트 컨트랙트 보안 감사 AI 플랫폼 Sapiens 개발.

## 핵심 정보
- 법인: Delaware C-Corp (Clerky 통해 설립)
- 지분: 80/10/10 (학성/진겸/...)
- 은행: Mercury
- 주요 제품: Sapiens

## 관련 메모리
- projects/sapiens/ — Sapiens 플랫폼 상세
EOF
fi

if [ ! -f "$MEMORY_ROOT/projects/sapiens/_meta.md" ]; then
    mkdir -p "$MEMORY_ROOT/projects/sapiens"
    cat > "$MEMORY_ROOT/projects/sapiens/_meta.md" << 'EOF'
---
title: Sapiens Platform
category: projects
subcategory: sapiens
tags: [sapiens, ai, security, audit, web3]
importance: 9
created: 2026-01-01T00:00:00Z
---

# Sapiens — AI-Powered Smart Contract Security Audit

## Tech Stack
- AI: Claude, LangGraph (→ PydanticAI migration 검토중)
- Graph DB: Neo4j (Code Property Graph)
- Infra: GKE, LiteLLM
- Chains: Solidity, Rust, Move, Go AST 추출

## PoC Partners
- AhnLab, Theori, B-Harvest, OtterSec
- Inbound: Aikido Security (Series B)
EOF
fi

echo "✅ Memory store initialized"

# ─── 4. Setup Environment File ──────────────────────────────
echo ""
echo "▶ [4/7] Setting up environment..."

ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << 'EOF'
# OpenClaw-CC Environment Configuration
# Fill in your tokens below

# ─── Discord ───────────────────────────────
# 1. Go to https://discord.com/developers/applications
# 2. Create a bot and copy the token
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_ID=
DISCORD_WEBHOOK_URL=

# ─── Telegram ──────────────────────────────
# 1. Talk to @BotFather on Telegram
# 2. Create a bot with /newbot
# 3. Copy the token
TELEGRAM_BOT_TOKEN=
# Your chat ID (talk to @userinfobot to find it)
TELEGRAM_CHAT_ID=

# ─── Paths (auto-configured) ──────────────
MEMORY_ROOT=${PROJECT_DIR}/memory-store
SCHEDULER_DATA=${PROJECT_DIR}/scheduler-data
OPENCLAW_PROJECT_DIR=${PROJECT_DIR}
EOF
    echo "✅ .env file created at $ENV_FILE"
    echo "   ⚠️  Please fill in your Discord/Telegram tokens!"
else
    echo "✅ .env file already exists"
fi

# ─── 5. Configure Claude Code MCP ───────────────────────────
echo ""
echo "▶ [5/7] Configuring Claude Code MCP..."

# Update .mcp.json with actual paths
cat > "$PROJECT_DIR/.mcp.json" << EOF
{
  "mcpServers": {
    "memory-manager": {
      "type": "stdio",
      "command": "node",
      "args": ["$PROJECT_DIR/mcp-servers/memory-manager/src/index.js"],
      "env": {
        "MEMORY_ROOT": "$PROJECT_DIR/memory-store"
      }
    },
    "messenger-bot": {
      "type": "stdio",
      "command": "node",
      "args": ["$PROJECT_DIR/mcp-servers/messenger-bot/src/index.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "\${DISCORD_BOT_TOKEN}",
        "DISCORD_CHANNEL_ID": "\${DISCORD_CHANNEL_ID}",
        "DISCORD_WEBHOOK_URL": "\${DISCORD_WEBHOOK_URL}",
        "TELEGRAM_BOT_TOKEN": "\${TELEGRAM_BOT_TOKEN}",
        "TELEGRAM_CHAT_ID": "\${TELEGRAM_CHAT_ID}"
      }
    },
    "task-scheduler": {
      "type": "stdio",
      "command": "node",
      "args": ["$PROJECT_DIR/mcp-servers/task-scheduler/src/index.js"],
      "env": {
        "SCHEDULER_DATA": "$PROJECT_DIR/scheduler-data",
        "OPENCLAW_PROJECT_DIR": "$PROJECT_DIR"
      }
    }
  }
}
EOF

echo "✅ .mcp.json configured"

# ─── 6. Install Skills ──────────────────────────────────────
echo ""
echo "▶ [6/7] Installing skills..."

SKILLS_TARGET="$PROJECT_DIR/.claude/skills"
mkdir -p "$SKILLS_TARGET"

for skill_dir in "$PROJECT_DIR"/skills/*/; do
    skill_name=$(basename "$skill_dir")
    target="$SKILLS_TARGET/$skill_name"
    if [ ! -L "$target" ] && [ ! -d "$target" ]; then
        ln -s "$skill_dir" "$target"
        echo "   🔗 Linked /$(basename "$skill_dir")"
    fi
done

echo "✅ Skills installed"

# ─── 7. Create Daemon Script ────────────────────────────────
echo ""
echo "▶ [7/7] Creating daemon script..."

mkdir -p "$PROJECT_DIR/scheduler-data/logs"

cat > "$PROJECT_DIR/scripts/daemon.sh" << 'DAEMON'
#!/bin/bash
# OpenClaw-CC Daemon - Polls for messages and executes scheduled tasks
# Usage: ./scripts/daemon.sh [start|stop|status]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/scheduler-data/daemon.pid"
LOG_FILE="$PROJECT_DIR/scheduler-data/logs/daemon.log"
POLL_INTERVAL=${POLL_INTERVAL:-60}

source "$PROJECT_DIR/.env" 2>/dev/null || true

start_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Daemon already running (PID: $(cat "$PID_FILE"))"
        return
    fi

    echo "Starting OpenClaw-CC daemon (poll interval: ${POLL_INTERVAL}s)..."
    
    (
        while true; do
            # 1. Poll for new Telegram messages
            if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
                RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=-1&limit=1&timeout=0")
                HAS_MESSAGE=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('ok') and data.get('result'):
    msg = data['result'][-1].get('message', {})
    text = msg.get('text', '')
    if text.startswith('/ask '):
        print(text[5:])
" 2>/dev/null)
                
                if [ -n "$HAS_MESSAGE" ]; then
                    echo "[$(date)] Processing Telegram message: $HAS_MESSAGE" >> "$LOG_FILE"
                    cd "$PROJECT_DIR" && claude -p "$HAS_MESSAGE" \
                        --allowedTools "memory-manager,messenger-bot" \
                        --output-format text >> "$LOG_FILE" 2>&1
                fi
            fi
            
            sleep "$POLL_INTERVAL"
        done
    ) &
    
    echo $! > "$PID_FILE"
    echo "Daemon started (PID: $(cat "$PID_FILE"))"
    echo "Log: $LOG_FILE"
}

stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            rm "$PID_FILE"
            echo "Daemon stopped (PID: $PID)"
        else
            rm "$PID_FILE"
            echo "Daemon was not running (stale PID file removed)"
        fi
    else
        echo "Daemon is not running"
    fi
}

status_daemon() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Daemon is running (PID: $(cat "$PID_FILE"))"
        echo "Last 5 log entries:"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "  (no logs yet)"
    else
        echo "Daemon is not running"
    fi
}

case "${1:-start}" in
    start)  start_daemon ;;
    stop)   stop_daemon ;;
    status) status_daemon ;;
    *)      echo "Usage: $0 {start|stop|status}" ;;
esac
DAEMON

chmod +x "$PROJECT_DIR/scripts/daemon.sh"
echo "✅ Daemon script created"

# ─── Done ────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           ✅ Setup Complete!                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo ""
echo "  1. Fill in your tokens:"
echo "     vim $PROJECT_DIR/.env"
echo ""
echo "  2. Start Claude Code in this project:"
echo "     cd $PROJECT_DIR && claude"
echo ""
echo "  3. Test memory system:"
echo "     > 테스트 메모리 저장해줘"
echo ""
echo "  4. Test messenger (after tokens set):"
echo "     > Discord로 '안녕' 보내줘"
echo ""
echo "  5. Set up scheduled tasks:"
echo "     > 매일 오전 9시에 모닝 브리핑 생성하고 Telegram으로 보내는 태스크 만들어"
echo ""
echo "  6. (Optional) Start daemon for 24/7 polling:"
echo "     ./scripts/daemon.sh start"
echo ""
echo "  7. (Optional) Install crontab:"
echo "     > crontab 생성해줘"
echo "     crontab $PROJECT_DIR/scheduler-data/generated.crontab"
echo ""
