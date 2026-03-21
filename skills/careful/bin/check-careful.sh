#!/usr/bin/env bash
#
# check-careful.sh — Warn before destructive bash commands
# Returns JSON with permissionDecision: "ask" if destructive pattern detected
#

INPUT=$(cat)

# Extract command from JSON input
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Decode common escape sequences
DECODED=$(echo "$COMMAND" | sed 's/\\n/ /g; s/\\t/ /g')

# Safe exceptions — skip warning for these
SAFE_PATTERNS=(
  "rm -rf node_modules"
  "rm -rf .next"
  "rm -rf dist"
  "rm -rf __pycache__"
  "rm -rf .cache"
  "rm -rf build"
  "rm -rf .turbo"
  "rm -rf coverage"
  "rm -rf .omc"
  "rm -rf tmp"
  "rm -rf /tmp/"
)

for SAFE in "${SAFE_PATTERNS[@]}"; do
  if echo "$DECODED" | grep -qi "$SAFE"; then
    exit 0
  fi
done

# Destructive patterns to check
WARNING=""

if echo "$DECODED" | grep -qiE 'rm\s+-(rf|fr|r\s|.*recursive)'; then
  WARNING="⚠️ DESTRUCTIVE: Recursive delete detected (rm -rf). This permanently removes files."
elif echo "$DECODED" | grep -qiE 'DROP\s+(TABLE|DATABASE)'; then
  WARNING="⚠️ DESTRUCTIVE: SQL DROP detected. This permanently removes database objects."
elif echo "$DECODED" | grep -qiE 'TRUNCATE\s'; then
  WARNING="⚠️ DESTRUCTIVE: SQL TRUNCATE detected. This removes all rows from the table."
elif echo "$DECODED" | grep -qiE 'DELETE\s+FROM\s+\w+\s*;?\s*$'; then
  WARNING="⚠️ DESTRUCTIVE: DELETE without WHERE clause detected. This removes all rows."
elif echo "$DECODED" | grep -qiE 'git\s+push\s+.*(-f|--force)'; then
  WARNING="⚠️ DESTRUCTIVE: Force push detected. This rewrites remote history."
elif echo "$DECODED" | grep -qiE 'git\s+reset\s+--hard'; then
  WARNING="⚠️ DESTRUCTIVE: Hard reset detected. This discards uncommitted changes."
elif echo "$DECODED" | grep -qiE 'git\s+(checkout|restore)\s+\.'; then
  WARNING="⚠️ DESTRUCTIVE: Discard all changes detected. This loses uncommitted work."
elif echo "$DECODED" | grep -qiE 'kubectl\s+delete'; then
  WARNING="⚠️ DESTRUCTIVE: kubectl delete detected. This affects production resources."
elif echo "$DECODED" | grep -qiE 'docker\s+(rm\s+-f|system\s+prune)'; then
  WARNING="⚠️ DESTRUCTIVE: Docker cleanup detected. This removes containers/images."
fi

if [ -n "$WARNING" ]; then
  echo "$WARNING"
  echo "Command: $COMMAND"
  cat <<EOF
{"permissionDecision": "ask", "message": "$WARNING"}
EOF
fi
