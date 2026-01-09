---
description: Activate a role from .aaw-project.json
allowed-tools: mcp__aawctl__start_session, mcp__aawctl__read_policy, mcp__aawctl__check_lock, Read, Glob, Grep, Edit, Write, Bash
argument-hint: <role-name> [ticket-id]
---

# Activate Role

Dynamically activate a role defined in `.aaw-project.json`.

## Parameters

- `$1` - Role name (required) - must exist in `.aaw-project.json`
- `$2` - Ticket ID (optional) - for audit tracking

## Steps

### 1. Load Project Configuration

Read `.aaw-project.json` from the project root.

If file doesn't exist:
```
Error: No .aaw-project.json found.
Run /init-project to set up your project first.
```

### 2. Validate Role

Check if `$1` exists in `roles` object.

If not found:
```
Error: Role "$1" not found.
Available roles: {list of role names}
```

### 3. Extract Role Configuration

From the role config, get:
- `name` - Display name
- `path` - Primary workspace
- `framework` - Framework (if any)
- `canRead` - Readable paths
- `canWrite` - Writable paths
- `forbidden` - Forbidden paths
- `commands` - Available commands

### 4. Start AAW Session

```
Call mcp__aawctl__start_session with:
- scope: "{role-name}"
- ticket: "$2"
- role: "$1"
- config: {role configuration object}
```

### 5. Display Role Information

Output:
```
## Role Activated: {name}

**Workspace:** {path}
**Framework:** {framework}
**Ticket:** {ticket-id or "none"}

### Boundaries

✅ Can write:
{list canWrite paths}

📖 Can read:
{list canRead paths}

🚫 Forbidden:
{list forbidden paths}

### Commands
{list available commands}

### Guidelines
- Stay within your workspace: {path}
- Check contracts before implementing APIs
- Use /sync-status to check collaboration state
- Request API changes through .aaw/requests/{role}/
```

### 6. Load Framework Guidelines

If `framework` is specified, read and apply framework-specific guidelines from `.devcontainer/profiles/frameworks/`.

## Example Usage

```
/role frontend TICKET-123
/role backend
/role integrator FEAT-456
```

## Multi-Role Collaboration

Each terminal should activate a different role:

```
Terminal 1: /role frontend TICKET-123
Terminal 2: /role backend TICKET-123
Terminal 3: /role integrator TICKET-123
```

All roles working on the same ticket will have their actions correlated in the audit log.
