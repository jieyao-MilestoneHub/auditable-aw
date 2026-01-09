---
description: Initialize a new AAW collaborative project using official framework CLIs
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
argument-hint: [preset]
---

# Initialize AAW Project

Set up a collaborative project using **official framework scaffolding tools**.

> **Philosophy**: We don't invent directory structures. We use `create-vite`, `create-next-app`, etc., then wrap them with role boundaries.

## Available Presets

| Preset | Scaffolding Used | Result |
|--------|------------------|--------|
| `fullstack-ts` | `npm create vite` + Fastify | Vite React + Fastify backend |
| `fullstack-py` | `npm create vite` + FastAPI | Vite React + Python FastAPI |
| `nextjs` | `create-next-app` | Next.js App Router |
| `two-person` | `npm create vite` + Express | Simple 2-role setup |
| `custom` | Ask user | Define your own |

## Steps

### 1. Load Preset

Read `.aaw/presets/{$1}.json` to get:
- `init.steps[]` - Scaffolding commands to run
- `roles` - Role definitions
- `docs` - Official documentation links

### 2. Check Existing Project

If `.aaw-project.json` exists:
- Ask: "Project already initialized. Reconfigure or abort?"

### 3. Run Official Scaffolding

Execute each step in `init.steps[]`:

```
For each step:
  1. Show: "Running: {step.name}"
  2. Execute: {step.command}
  3. Verify: {step.creates} exists
```

**Example for fullstack-ts:**
```bash
npm create vite@latest frontend -- --template react-ts
mkdir -p backend/src && cd backend && npm init -y
cd backend && npm install fastify @fastify/cors typescript
mkdir -p shared/types contracts
```

### 4. Copy Configuration

Copy preset to `.aaw-project.json` (remove `init` section, keep `roles`, `shared`, `docs`).

### 5. Create Collaboration Directories

```bash
mkdir -p .aaw/requests .aaw/notifications .aaw/locks
```

### 6. Generate Role CLAUDE.md Files

For each role, create `{role.path}/CLAUDE.md`:

```markdown
# {role.name}

## Your Workspace
`{role.path}/`

## Framework
{role.framework}

## Boundaries
- ✅ Can write: {role.canWrite}
- 📖 Can read: {role.canRead}
- 🚫 Forbidden: {role.forbidden}

## Commands
{role.commands}

## Documentation
{docs[role.framework]}
```

### 7. Output Summary

```
✅ Project initialized with {preset}!

📁 Structure created:
{list directories}

🔗 Documentation:
- Frontend: {docs.frontend}
- Backend: {docs.backend}

🚀 To start collaborating:
  Terminal 1: claude → /role frontend
  Terminal 2: claude → /role backend
  Terminal 3: claude → /role integrator

💡 When you encounter issues, search the official docs above.
   The directory structure follows standard {framework} conventions.
```

## Why This Approach?

| Problem | Our Solution |
|---------|--------------|
| Custom structure → Can't Google errors | Use official CLI → Standard structure |
| Invented conventions → Team confusion | Follow framework docs → Familiar patterns |
| Outdated boilerplate → Security issues | Always use `@latest` → Up to date |

## Custom Preset

If `$1` is `custom`, ask:

1. Project name?
2. Frontend: React (Vite) / Next.js / Vue / Angular / None?
3. Backend: Fastify / Express / NestJS / FastAPI / Django / None?
4. Roles needed: 2 (frontend + backend) / 3 (+ integrator) / custom?

Then generate appropriate `init.steps` using official CLIs.
