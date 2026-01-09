---
description: Execute implementation with AAW audit trail
allowed-tools: mcp__aawctl__exec, mcp__aawctl__read_policy, Read, Edit, Glob, Grep
argument-hint: [audit-id]
---

# AAW Implementation Session

You are executing an auditable implementation session.

## Prerequisites

- You must have an active audit_id from a previous `/aaw-plan` session
- Audit ID: $1

## Steps

1. **Verify Audit Session**
   Confirm the audit_id is valid and retrieve the associated plan

2. **Review Policy**
   Call `mcp__aawctl__read_policy` to refresh policy constraints

3. **Execute Changes**
   For each code change:
   - Use `mcp__aawctl__exec` for ALL shell commands
   - Provide clear `purpose` for each execution
   - Follow the plan from the planning phase

4. **Shell Command Guidelines**
   When running commands through aawctl:
   ```
   mcp__aawctl__exec({
     scope: "frontend",
     cmd: "npm run lint",
     cwd: "./packages/frontend",
     purpose: "Verify code style after changes"
   })
   ```

5. **Code Changes**
   - Use the Edit tool for file modifications
   - Each edit should align with the approved plan
   - Document any deviations from the plan

## Important Rules

- **NEVER** use direct Bash tool - always go through aawctl
- **NEVER** skip policy checks
- **ALWAYS** provide purpose for each execution
- If blocked by policy, STOP and report - do not try to bypass

## After Implementation

Summarize:
- Changes made (files modified)
- Commands executed
- Any deviations from plan
- Ready for `/aaw-test`
