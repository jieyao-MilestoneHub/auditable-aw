---
name: aaw-sop
description: Enforces AAW standard operating procedures. Use this when working on any code changes that need to be auditable. Ensures proper workflow: plan -> implement -> test -> evidence.
allowed-tools:
  - mcp__aawctl__start_session
  - mcp__aawctl__exec
  - mcp__aawctl__read_policy
  - mcp__aawctl__run_tests
  - mcp__aawctl__capture_artifact
  - mcp__aawctl__bundle_evidence
  - Read
  - Glob
  - Grep
  - Edit
---

# AAW Standard Operating Procedures

This skill ensures all code changes follow the auditable workflow required by enterprise compliance.

## Core Principle

All code changes MUST follow the auditable workflow:

```
/aaw-plan → /aaw-implement → /aaw-test → /aaw-evidence
```

## Workflow Requirements

### Phase 1: Planning (Required)

Before ANY code change:

1. Start an audit session with `mcp__aawctl__start_session`
2. Read and understand policy with `mcp__aawctl__read_policy`
3. Create a detailed implementation plan
4. Get user approval before proceeding

**Never skip planning.** Even small changes need documentation.

### Phase 2: Implementation (Required)

During code changes:

1. Use `mcp__aawctl__exec` for ALL shell commands
2. Never use direct Bash tool
3. Provide clear `purpose` for each execution
4. Follow scope-specific policies
5. Document any deviations from the plan

### Phase 3: Testing (Required)

After implementation:

1. Run tests via `mcp__aawctl__run_tests`
2. Capture test artifacts via `mcp__aawctl__capture_artifact`
3. Do not proceed if tests fail - report and wait for decision

### Phase 4: Evidence (Required)

After successful testing:

1. Generate evidence bundle via `mcp__aawctl__bundle_evidence`
2. Provide bundle location to user
3. Bundle must be reviewed before deployment

## Policy Hierarchy

```
Global Policy: /aaw.policy.yaml
     ↓
Package Policy: packages/{name}/aaw.policy.yaml
     ↓
(Package policy extends global, can only be MORE restrictive)
```

## Audit ID

Every session has an `audit_id`. This ID:

- Links all actions in a session
- Must be passed between phases
- Is included in the evidence bundle
- Should be referenced in commit messages

## Compliance Checklist

Before marking any task complete, verify:

- [ ] Audit session was started
- [ ] Policy was checked
- [ ] All commands went through aawctl
- [ ] Tests were run and passed
- [ ] Evidence bundle was generated
