## Test Framework Detection & Bootstrap

Detect the project's test framework automatically:

```bash
# Check package.json for test command
TEST_CMD=""
if [ -f "package.json" ]; then
  TEST_CMD=$(node -e "try{const p=require('./package.json');console.log(p.scripts&&p.scripts.test||'')}catch(e){}" 2>/dev/null)
fi

# Check for common test runners
if [ -z "$TEST_CMD" ]; then
  if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
    TEST_CMD="npx jest"
  elif [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    TEST_CMD="npx vitest run"
  elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
    TEST_CMD="python -m pytest"
  elif [ -f "Cargo.toml" ]; then
    TEST_CMD="cargo test"
  elif [ -f "go.mod" ]; then
    TEST_CMD="go test ./..."
  fi
fi

if [ -n "$TEST_CMD" ]; then
  echo "Test command detected: $TEST_CMD"
else
  echo "No test framework detected"
fi
```

**If no test framework detected**:
- Check CLAUDE.md for test commands
- Ask the user if they have a preferred test command
- If none available, skip test-dependent steps and note in output

**Usage**: Run detected command with `$TEST_CMD`
