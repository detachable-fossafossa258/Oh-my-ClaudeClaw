## Base Branch Detection

Detect the correct base branch for diff and PR operations:

```bash
# Method 1: Check if there's an existing PR for this branch
BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null)

# Method 2: Check repo default branch
if [ -z "$BASE" ]; then
  BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null)
fi

# Method 3: Fallback to common defaults
if [ -z "$BASE" ]; then
  if git show-ref --verify --quiet refs/heads/main 2>/dev/null; then
    BASE="main"
  elif git show-ref --verify --quiet refs/heads/master 2>/dev/null; then
    BASE="master"
  else
    BASE="main"
  fi
fi

echo "Base branch: $BASE"
```

Use `$BASE` for all subsequent operations:
- `git diff origin/$BASE...HEAD` — Changes on this branch
- `git log origin/$BASE..HEAD` — Commits on this branch
- `gh pr create --base $BASE` — PR targeting correct branch
