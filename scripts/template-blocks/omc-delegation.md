## OMC Agent Delegation

When delegating work to OMC agents, follow these patterns:

### Delegation Protocol

1. **Select the right agent** for the task:

   | Task Type | Agent | Model |
   |-----------|-------|-------|
   | Code implementation | executor | sonnet (opus for complex) |
   | Code review | code-reviewer | opus |
   | Security audit | security-reviewer | sonnet |
   | Architecture decisions | architect | opus |
   | Debugging/tracing | tracer | sonnet |
   | Test writing | test-engineer | sonnet |
   | Verification | verifier | sonnet |
   | Planning | planner | opus |
   | Research synthesis | scientist | sonnet |
   | Git operations | git-master | sonnet |

2. **Provide complete context** in the delegation prompt:
   ```
   Agent(subagent_type: "oh-my-claudecode:{agent}", model: "{model}", prompt: "
     Task: {clear description}
     Context: {relevant background from memory}
     Files: {specific files to examine/modify}
     Constraints: {safety limits, scope boundaries}
     Output: {expected deliverable format}
   ")
   ```

3. **Capture results** after delegation:
   - Store significant findings in memory
   - Link to related memories in the knowledge graph
   - Report results to the user

### Safety Rules

- **Never self-approve**: Use `code-reviewer` or `verifier` for the approval pass
- **Separate authoring from review**: Writer pass creates, reviewer evaluates later
- **Parallel when possible**: Run independent agents concurrently (e.g., code-reviewer + security-reviewer)
- **Memory handoff**: Pass `memory_search` results to agents as context
