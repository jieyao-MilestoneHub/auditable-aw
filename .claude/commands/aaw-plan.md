---
description: Start an AAW planning session with policy check
allowed-tools: mcp__aawctl__start_session, mcp__aawctl__read_policy, Read, Glob, Grep
argument-hint: [ticket-id] [scope]
---

# AAW Planning Session

You are starting an auditable planning session.

## Context

- Ticket ID: $1
- Scope: $2 (defaults to "global" if not specified)

## Steps

1. **Start Session**
   Call `mcp__aawctl__start_session` with:
   - scope: "$2" or "global"
   - ticket: "$1"
   - mode: "plan"

2. **Read Policy**
   Call `mcp__aawctl__read_policy` to understand constraints for the scope

3. **Analyze Codebase**
   - Read relevant files to understand current state
   - Identify files that need modification
   - Note any dependencies or risks

4. **Create Implementation Plan**
   Document a plan that includes:
   - List of files to be modified with rationale
   - Specific changes for each file
   - Potential risks and mitigations
   - Test requirements

5. **Output Format**
   Present the plan in this structure:
   ```
   ## Audit ID: {audit_id}
   ## Ticket: {ticket}
   ## Scope: {scope}

   ### Files to Modify
   1. path/to/file.ts - Description of changes

   ### Implementation Steps
   1. Step description

   ### Risks
   - Risk description and mitigation

   ### Test Plan
   - What tests to run
   ```

## Important

- This is an auditable session - all actions are logged
- Follow the aaw-security skill guidelines
- Do NOT proceed to implementation without user approval
