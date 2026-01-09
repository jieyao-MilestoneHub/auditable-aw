# Auditable AI Workspace (AAW)

> Multi-role AI collaboration framework for Claude Code with governance and audit trails.

AAW enables **multiple Claude Code sessions** to work on the same codebase simultaneously without conflicts. Each session operates within defined boundaries — what it can read, write, and must avoid.

---

## What AAW Does

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Codebase                            │
├───────────────┬───────────────┬───────────────┬─────────────┤
│   frontend/   │   backend/    │   contracts/  │   shared/   │
│               │               │               │             │
│  Terminal 1   │  Terminal 2   │  Terminal 3   │  (shared)   │
│  Claude Code  │  Claude Code  │  Claude Code  │             │
│  /role frontend /role backend │/role integrator             │
│               │               │               │             │
│  ✅ Can edit  │  ✅ Can edit  │  ✅ Can edit  │  📖 Read    │
│  🚫 No backend│  🚫 No frontend│ 🚫 No impl   │     only    │
└───────────────┴───────────────┴───────────────┴─────────────┘
```

**Key features:**
- **Role isolation** — Each terminal has defined read/write boundaries
- **No file conflicts** — Roles cannot edit each other's core files
- **Audit trail** — All actions logged for compliance
- **Standard frameworks** — Uses official CLI tools, not custom structures

---

## Multi-Terminal Usage Guide

### Step 1: Initialize Project

Open one terminal in DevContainer:

```bash
claude
```

Then run:

```
/init-project fullstack-ts
```

This will:
1. Run `npm create vite@latest frontend` (official Vite CLI)
2. Set up backend with Fastify
3. Create `.aaw-project.json` with role definitions
4. Create collaboration directories

**Available presets:**

| Preset | What it creates |
|--------|-----------------|
| `fullstack-ts` | Vite React + Fastify (TypeScript) |
| `fullstack-py` | Vite React + FastAPI (Python) |
| `nextjs` | Next.js App Router |
| `two-person` | Simple frontend + backend (no integrator) |

### Step 2: Open Multiple Terminals

In VS Code, open 3 terminals (`Ctrl+Shift+`` or Terminal → New Terminal).

```
┌─────────────────────────────────────────────────────────────┐
│  VS Code                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [Editor Area]                                              │
│                                                              │
├──────────────────┬──────────────────┬───────────────────────┤
│  Terminal 1      │  Terminal 2      │  Terminal 3           │
│  (Frontend)      │  (Backend)       │  (Integrator)         │
└──────────────────┴──────────────────┴───────────────────────┘
```

### Step 3: Activate Roles

**Terminal 1 — Frontend Developer:**
```bash
claude
/role frontend TICKET-123
```

**Terminal 2 — Backend Developer:**
```bash
claude
/role backend TICKET-123
```

**Terminal 3 — Integrator (optional):**
```bash
claude
/role integrator TICKET-123
```

### Step 4: Work in Parallel

Each terminal now operates with boundaries:

| Role | Can Write | Cannot Touch |
|------|-----------|--------------|
| **frontend** | `frontend/**` | `backend/src/services/**` |
| **backend** | `backend/**` | `frontend/src/components/**` |
| **integrator** | `contracts/**`, `shared/**` | Implementation details |

**Example workflow:**

```
Terminal 1 (Frontend):
> Add a login form component

Terminal 2 (Backend):
> Create /api/auth/login endpoint

Terminal 3 (Integrator):
> Define LoginRequest and LoginResponse types in contracts/
```

### Step 5: Check Collaboration Status

Any terminal can run:

```
/sync-status
```

This shows:
- Active locks (who's editing what)
- Pending requests between roles
- Notifications from integrator

---

## How Roles Communicate

### Requesting API Changes

Frontend needs a new API field? Create a request:

```yaml
# .aaw/requests/frontend/add-avatar-field.yaml
type: api_request
from: frontend
to: integrator
description: Need avatarUrl field in User response
```

Integrator sees this, updates the contract, notifies both teams.

### Breaking Changes

When integrator makes a breaking change:

1. Creates notification in `.aaw/notifications/breaking/`
2. Frontend and backend must acknowledge
3. Only then can implementation proceed

---

## Project Structure

After `/init-project fullstack-ts`:

```
auditable-sw/                    # AAW Framework (this repo)
├── .aaw/                        # AAW core (all framework files)
│   ├── tools/aawctl/            # MCP server
│   ├── presets/                 # Available presets
│   ├── schema/                  # JSON schemas
│   ├── requests/                # Cross-role requests
│   ├── notifications/           # Integrator announcements
│   └── locks/                   # Edit coordination
├── .claude/                     # Claude Code config
│   └── commands/                # /init-project, /role, etc.
│
├── workspace/                   # YOUR PROJECT (created by /init-project)
│   ├── frontend/                # Created by `npm create vite`
│   │   ├── src/
│   │   └── package.json
│   ├── backend/                 # Standard Node.js structure
│   │   ├── src/
│   │   └── package.json
│   ├── contracts/               # API contracts
│   └── shared/                  # Shared types
│
├── .aaw-project.json            # Role definitions (edit this!)
├── CLAUDE.md                    # Project instructions
└── README.md                    # This file
```

**Key separation:**
- `workspace/` = Your actual project code (framework standard structure)
- Everything else = AAW framework (don't edit unless customizing AAW)

**Important:** Directory structure inside `workspace/` follows official framework conventions. When you have questions about React/Vite, search the [Vite docs](https://vitejs.dev). For Fastify, search [Fastify docs](https://fastify.dev).

---

## Configuration: `.aaw-project.json`

This file defines everything. It's auto-generated by `/init-project` but you can customize it:

```json
{
  "name": "my-project",
  "roles": {
    "frontend": {
      "path": "workspace/frontend",
      "framework": "react",
      "canWrite": ["workspace/frontend/**"],
      "canRead": ["workspace/shared/**", "workspace/contracts/**"],
      "forbidden": ["workspace/backend/src/services/**"]
    },
    "backend": {
      "path": "workspace/backend",
      "framework": "fastify",
      "canWrite": ["workspace/backend/**"],
      "canRead": ["workspace/shared/**", "workspace/contracts/**"],
      "forbidden": ["workspace/frontend/src/components/**"]
    },
    "integrator": {
      "path": "workspace/contracts",
      "canWrite": ["workspace/contracts/**", "workspace/shared/**"],
      "canRead": ["workspace/frontend/**", "workspace/backend/**"],
      "forbidden": ["workspace/frontend/src/components/**", "workspace/backend/src/services/**"]
    }
  }
}
```

**Note:** All paths are relative to repo root, prefixed with `workspace/`.

**Add/remove roles as needed.** Two-person team? Remove integrator. Microservices? Add more backend roles.

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/init-project [preset]` | Initialize project with official CLI tools |
| `/role <name> [ticket]` | Activate a role for this session |
| `/sync-status` | Check locks, requests, notifications |
| `/aaw-plan [ticket]` | Start auditable planning session |
| `/aaw-evidence [id]` | Generate compliance evidence bundle |

---

## Architecture: What We Do vs. What Frameworks Do

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code                             │
├─────────────────────────────────────────────────────────────┤
│  Built-in: Bash, Read, Write, Edit, Glob, Grep              │
├─────────────────────────────────────────────────────────────┤
│                      MCP Servers                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────────┐ │
│  │  GitHub  │  │  Sentry  │  │         aawctl             │ │
│  │  (code)  │  │ (errors) │  │ (roles + audit + locks)    │ │
│  └──────────┘  └──────────┘  └────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│               Framework CLIs (via Bash)                      │
│  npm create vite | create-next-app | uvicorn | prisma       │
└─────────────────────────────────────────────────────────────┘
```

**What frameworks provide:** Project scaffolding, dev servers, builds
**What AAW provides:** Multi-role coordination, audit trails, boundaries

**We don't reinvent frameworks.** We wrap them with collaboration rules.

---

## Security & Governance

AAW enforces:

- **File access control** — Roles can only write to allowed paths
- **Sensitive file protection** — `.env`, credentials blocked by default
- **Command restrictions** — `sudo`, `curl`, `wget` denied
- **Audit logging** — Every action recorded
- **Evidence generation** — Compliance bundles for auditors

See `.aaw/policy.yaml` for full policy configuration.

---

## License

[MIT License](./LICENCE)

---

<p align="center">
  <strong>Multiple AI agents. One codebase. Zero conflicts.</strong>
</p>
