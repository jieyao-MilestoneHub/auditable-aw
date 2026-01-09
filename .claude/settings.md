# AAW Claude Code Settings

This document explains the Claude Code settings configuration for the Auditable AI Workspace (AAW).

## Overview

AAW uses a layered settings approach:

1. **Managed Settings** (`managed-settings.json`) - Enterprise IT-controlled, highest priority
2. **Project Settings** (`settings.json`) - Team-shared configuration
3. **Local Settings** (`settings.local.json`) - Personal overrides (gitignored)

## Settings Files

### `.claude/settings.json` (Project Shared)

This is the main configuration file for the AAW project.

#### Environment Variables

```json
{
  "env": {
    "INSIDE_CLAUDE_CODE": "1",
    "AAW_WORKSPACE": "1",
    "BASH_DEFAULT_TIMEOUT_MS": "420000",
    "BASH_MAX_TIMEOUT_MS": "420000"
  }
}
```

- `AAW_WORKSPACE`: Indicates this is an AAW-managed workspace
- `BASH_DEFAULT_TIMEOUT_MS`: Extended timeout for long-running commands (7 minutes)

#### Permissions

```json
{
  "permissions": {
    "allow": ["mcp__aawctl__*", "Read", "Glob", "Grep"],
    "ask": ["Bash(npm run:*)", "Bash(git:*)", "Edit"],
    "deny": ["Bash(rm -rf:*)", "Bash(sudo:*)", "Bash(curl:*)", "Bash(wget:*)"]
  }
}
```

| Category | Description |
|----------|-------------|
| `allow` | Auto-approved tools (aawctl MCP, read-only operations) |
| `ask` | Requires user confirmation (package managers, git, file edits) |
| `deny` | Blocked commands (destructive, privileged, network) |

#### Hooks

AAW implements four types of hooks:

##### 1. UserPromptSubmit Hook
- **Purpose**: Skill auto-activation
- **Script**: `.claude/hooks/skill-eval.sh`
- **Behavior**: Analyzes prompts and suggests relevant skills

##### 2. PreToolUse Hooks

| Matcher | Purpose |
|---------|---------|
| `Edit\|MultiEdit\|Write` | Block editing on main/master branch |
| `Bash` | Audit log all bash commands |

##### 3. PostToolUse Hooks

| Matcher | Purpose | Timeout |
|---------|---------|---------|
| `Edit\|MultiEdit\|Write` | Auto-format with Prettier | 30s |
| `Edit\|MultiEdit\|Write` | Auto-install on package.json change | 60s |
| `Edit\|MultiEdit\|Write` | Auto-run tests on test file change | 90s |
| `Edit\|MultiEdit\|Write` | TypeScript type checking | 30s |

##### 4. Stop Hook
- **Purpose**: Log session end for audit trail

#### Sandbox

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "allowUnsandboxedCommands": false
  }
}
```

Sandbox mode isolates bash commands for security.

### `.devcontainer/managed-settings.json` (Enterprise IT)

This file simulates enterprise IT-controlled settings. In production, it would be deployed to `/etc/claude-code/managed-settings.json`.

```json
{
  "disableBypassPermissionsMode": "disable",
  "allowManagedHooksOnly": true,
  "allowedMcpServers": ["aawctl", "github"],
  "permissions": {
    "deny": ["Read(**/.env)", "Read(**/secrets/**)", "Read(**/*.pem)"]
  }
}
```

| Setting | Purpose |
|---------|---------|
| `disableBypassPermissionsMode` | Prevents `--dangerously-skip-permissions` |
| `allowManagedHooksOnly` | Only allows managed and SDK hooks |
| `allowedMcpServers` | Whitelist of allowed MCP servers |
| `permissions.deny` | Blocks reading sensitive files |

## Hook Details

### Skill Evaluation System

Located in `.claude/hooks/`:

| File | Purpose |
|------|---------|
| `skill-eval.sh` | Bash wrapper that invokes Node.js engine |
| `skill-eval.js` | Main evaluation logic |
| `skill-rules.json` | Skill matching rules configuration |
| `skill-rules.schema.json` | JSON Schema for validation |

#### How Skill Evaluation Works

1. User submits a prompt
2. `skill-eval.sh` pipes the prompt to `skill-eval.js`
3. The engine extracts:
   - Keywords and patterns
   - File paths mentioned
   - User intent
4. Scores are calculated against each skill's triggers
5. Top matching skills are suggested

#### Skill Rules Configuration

Each skill in `skill-rules.json` has:

```json
{
  "skill-name": {
    "description": "What this skill does",
    "priority": 1-10,
    "triggers": {
      "keywords": ["simple", "keywords"],
      "keywordPatterns": ["\\bregex\\b"],
      "pathPatterns": ["**/*.ts"],
      "intentPatterns": ["(?:create|add).*(?:feature)"],
      "contentPatterns": ["code patterns"],
      "contextPatterns": ["context words"]
    },
    "excludePatterns": ["patterns to exclude"],
    "relatedSkills": ["other-skill"]
  }
}
```

#### Scoring

| Match Type | Score |
|------------|-------|
| `keyword` | 2 |
| `keywordPattern` | 3 |
| `pathPattern` | 4 |
| `directoryMatch` | 5 |
| `intentPattern` | 4 |
| `contentPattern` | 3 |
| `contextPattern` | 2 |

Minimum score to suggest: **3**

### Main Branch Protection

The PreToolUse hook prevents file editing on main/master branches:

```bash
[ "$(git branch --show-current)" != "main" ] &&
[ "$(git branch --show-current)" != "master" ] ||
{ echo '{"block": true, "message": "..."}' >&2; exit 2; }
```

### Audit Logging

All Bash commands are logged to `.aaw/logs/hooks.log`:

```
[AAW 2024-01-15T10:30:00+00:00] PreToolUse Bash: npm run build
[AAW 2024-01-15T10:35:00+00:00] Session ended
```

## Customization

### Adding Personal Settings

Create `.claude/settings.local.json` (gitignored):

```json
{
  "env": {
    "MY_CUSTOM_VAR": "value"
  }
}
```

### Adding New Skills

1. Add skill definition to `skill-rules.json`
2. Create skill file in `.claude/skills/{skill-name}/SKILL.md`
3. Test with sample prompts

### Modifying Hooks

Edit hooks in `settings.json` under the `hooks` object. Each hook can have:

- `matcher`: Regex to match tool names
- `hooks[].type`: "command"
- `hooks[].command`: Shell command to run
- `hooks[].timeout`: Timeout in seconds

## Troubleshooting

### Hooks Not Running

1. Check if Node.js is available: `node --version`
2. Verify hook scripts exist in `.claude/hooks/`
3. Check hook script permissions: `chmod +x skill-eval.sh`

### Skill Not Activating

1. Check skill rules in `skill-rules.json`
2. Verify minimum confidence score is met
3. Check for exclude patterns

### Main Branch Edit Blocked

This is intentional. Create a feature branch:

```bash
git checkout -b feature/my-change
```

## References

- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings)
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
