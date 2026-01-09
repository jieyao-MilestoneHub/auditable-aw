---
name: aaw-security
description: Enforces security rules for AAW sessions. Activated automatically when handling sensitive operations, external connections, package installations, or file access to protected paths.
allowed-tools:
  - mcp__aawctl__exec
  - mcp__aawctl__read_policy
  - Read
  - Glob
  - Grep
---

# AAW Security Rules

This skill enforces security policies for all AAW operations.

## Absolute Prohibitions

### 1. Secrets and Credentials

**NEVER do these:**

- Read `.env`, `.env.*`, or any environment files
- Read files in `secrets/` directories
- Read files named `credentials*`, `*.pem`, `*.key`
- Log, output, or display secret values
- Commit secrets to version control
- Store secrets in code comments

**If you need secrets:**
- Ask the user to provide them securely
- Use environment variables at runtime
- Reference secret management systems

### 2. Dangerous Commands

**NEVER execute:**

- `rm -rf /` or similar destructive commands
- `sudo` anything
- `chmod 777` or overly permissive permissions
- Commands that modify system files
- Commands that disable security features

### 3. External Connections

**NEVER do:**

- `curl` or `wget` to unknown domains
- Direct API calls to external services (use aawctl)
- Download and execute scripts from the internet
- Connect to databases without going through aawctl

## Controlled Operations

### Package Installation

When installing packages:

1. **Check approval status**
   - Is the package in the approved list?
   - Is it from a trusted registry?

2. **If not approved:**
   - STOP immediately
   - Report the package name and version
   - Wait for explicit approval

3. **Log the installation**
   - Use `mcp__aawctl__exec` for npm/yarn/pnpm
   - Provide purpose: "Installing package X for Y feature"

### File Access

When accessing files:

1. **Check against deny patterns:**
   - `.env*` - DENIED
   - `secrets/**` - DENIED
   - `**/credentials*` - DENIED
   - `**/*.pem`, `**/*.key` - DENIED

2. **If denied:**
   - Do not attempt to read
   - Report the access attempt
   - Suggest alternatives

### External API Calls

When making external calls:

1. **Use approved endpoints only**
2. **All calls must be logged through aawctl**
3. **No direct curl/wget**

## Incident Response

If you detect a potential security violation:

1. **STOP** - Do not proceed with the action
2. **LOG** - Record the incident details
3. **REPORT** - Inform the user immediately
4. **WAIT** - Do not continue without explicit approval

## Security Logging

All security-relevant events are logged:

- Policy check results
- Denied access attempts
- Package installations
- External connections

Logs are included in the evidence bundle.

## Policy Enforcement Modes

### Audit-Only Mode (Default for PoC)

- Violations are LOGGED but not BLOCKED
- Tagged as `policy_check: WOULD_BLOCK`
- Use for initial rollout and tuning

### Enforce Mode (Production)

- Violations are BLOCKED
- Operation fails with error message
- Requires explicit override (if allowed)

## Quick Reference

| Action | Rule |
|--------|------|
| Read .env | DENIED |
| Run sudo | DENIED |
| curl external | DENIED |
| npm install (approved) | ALLOWED |
| npm install (unknown) | ASK |
| Edit source files | ALLOWED |
| Edit node_modules | DENIED |
