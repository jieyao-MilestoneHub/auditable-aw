---
description: Generate AAW evidence bundle for audit
allowed-tools: mcp__aawctl__bundle_evidence, Read
argument-hint: [audit-id]
---

# AAW Evidence Bundle Generation

Generate a complete evidence bundle for audit and compliance review.

## Prerequisites

- Audit ID: $1
- All previous steps (plan, implement, test) should be completed

## Steps

1. **Generate Bundle**
   Call `mcp__aawctl__bundle_evidence` with:
   - audit_id: "$1"

2. **Bundle Contents**
   The generated bundle will include:
   - **Session Log**: All command executions with timestamps
   - **Policy Results**: Policy check outcomes for each action
   - **File Diffs**: All file changes made during the session
   - **Test Results**: Test execution summary and reports
   - **Artifacts**: All captured artifacts (screenshots, reports)

3. **Report Location**
   Note the bundle path returned by the tool

## Output Format

```
## Evidence Bundle Generated

### Bundle Information
- Audit ID: {audit_id}
- Generated: {timestamp}
- Location: {bundle_path}

### Contents Summary
- Total Commands Executed: X
- Policy Violations: X (should be 0)
- Files Modified: X
- Tests Run: X passed, X failed

### Files in Bundle
- index.html (human-readable report)
- session.jsonl (raw log data)
- diffs/ (file changes)
- artifacts/ (test reports, screenshots)
- policy-checks.json (policy verification results)

### Verification
Bundle hash: {sha256}
```

## Delivery

The evidence bundle is ready for:
- Security team review
- Compliance audit
- Management sign-off
- Archive for future reference

Provide the bundle path to the user for download/review.
