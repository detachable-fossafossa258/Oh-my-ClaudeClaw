#!/usr/bin/env bash
#
# check-freeze.sh — Block Edit/Write outside freeze boundary
# Returns JSON with permissionDecision: "deny" if file is out of scope
#

STATE_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.omc/state}"
FREEZE_FILE="$STATE_DIR/freeze-dir.txt"

# If no freeze file, allow everything
if [ ! -f "$FREEZE_FILE" ]; then
  exit 0
fi

FREEZE_DIR=$(cat "$FREEZE_FILE" 2>/dev/null)
if [ -z "$FREEZE_DIR" ]; then
  exit 0
fi

# Read the tool input to get file_path
# Claude Code passes tool input via stdin as JSON
INPUT=$(cat)

# Extract file_path from JSON input
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ -z "$FILE_PATH" ]; then
  # No file_path found, allow (might be a different tool input format)
  exit 0
fi

# Resolve to absolute path
if [[ "$FILE_PATH" != /* ]] && [[ ! "$FILE_PATH" =~ ^[A-Za-z]: ]]; then
  FILE_PATH="$(pwd)/$FILE_PATH"
fi

# Normalize path (handle Windows paths)
NORMALIZED_FILE=$(echo "$FILE_PATH" | sed 's|\\|/|g')
NORMALIZED_FREEZE=$(echo "$FREEZE_DIR" | sed 's|\\|/|g')

# Check if file is within freeze boundary
if [[ "$NORMALIZED_FILE" == "$NORMALIZED_FREEZE"* ]]; then
  # Within boundary, allow
  exit 0
fi

# Outside boundary — DENY
echo "BLOCKED: File '$FILE_PATH' is outside the freeze boundary '$FREEZE_DIR'. Run /unfreeze to remove the restriction."
cat <<EOF
{"permissionDecision": "deny", "message": "Blocked: edit outside freeze boundary ${FREEZE_DIR}"}
EOF
