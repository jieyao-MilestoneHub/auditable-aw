---
description: Run tests with AAW audit trail
allowed-tools: mcp__aawctl__run_tests, mcp__aawctl__capture_artifact, Read
argument-hint: [audit-id] [scope]
---

# AAW Test Session

You are running tests in an auditable session.

## Prerequisites

- Audit ID: $1
- Scope: $2 (defaults to "global" if not specified)

## Steps

1. **Run Tests**
   Call `mcp__aawctl__run_tests` with:
   - scope: "$2" or "global"
   - target: appropriate test target for the scope

2. **Analyze Results**
   Review test output for:
   - Passed tests
   - Failed tests
   - Skipped tests
   - Coverage metrics (if available)

3. **Handle Failures**
   If tests fail:
   - Document the failure details
   - Do NOT auto-fix - report back for review
   - Suggest potential fixes but wait for approval

4. **Capture Artifacts**
   If tests pass, call `mcp__aawctl__capture_artifact` for:
   - Test reports (type: "test-report")
   - Coverage reports (type: "coverage")
   - Screenshots if applicable (type: "screenshot")

## Output Format

```
## Test Results for Audit ID: {audit_id}

### Summary
- Total: X tests
- Passed: X
- Failed: X
- Skipped: X

### Failed Tests (if any)
1. test/path/file.test.ts
   - Test name: "should do something"
   - Error: Error message

### Coverage
- Statements: X%
- Branches: X%
- Functions: X%
- Lines: X%

### Artifacts Captured
- test-report: path/to/report
- coverage: path/to/coverage
```

## Next Steps

- If all tests pass: Proceed to `/aaw-evidence`
- If tests fail: Review failures and decide on fixes
