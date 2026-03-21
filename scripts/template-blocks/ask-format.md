## Standardized AskUserQuestion Format

When asking the user for decisions, follow this format:

### Structure

1. **Re-ground** (1 line): Project name, current branch, what you're doing
2. **Simplify**: Explain the decision in plain language
3. **Recommend**: "Choose {X} because {reason}" + Completeness score (0-10)
4. **Options**: Lettered (A/B/C), with effort scale where applicable

### Example

```
Project: sapiens on feature/auth-refactor. Running /ship pre-flight.

The test suite passes but coverage dropped from 85% to 72% on the auth module.

RECOMMENDATION: Choose A because shipping with lower coverage creates tech debt
that compounds. Completeness: 9/10 (add tests) vs 5/10 (ship now).

A) Add tests for uncovered paths first (~15min CC time)
B) Ship now, create TODO for coverage improvement
C) Abort — investigate why coverage dropped
```

### Rules

- ONE question at a time. Never batch multiple decisions.
- Always provide a RECOMMENDATION with reasoning.
- Include effort estimates where meaningful (CC time, not human time).
- If the user says "just do it" or expresses impatience → take the recommended option.
- Default language follows user preference. Technical terms may use English.
