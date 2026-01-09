# AAW Skills

This directory contains Claude Code skills for the Auditable AI Workspace (AAW).

## What are Skills?

Skills are domain-specific knowledge documents that teach Claude patterns, best practices, and workflows specific to your project. They are automatically activated based on the context of your prompts.

## Available Skills

### Core AAW Skills

| Skill | Directory | Description |
|-------|-----------|-------------|
| **aaw-sop** | `aaw-sop/SKILL.md` | Standard Operating Procedure - enforces plan → implement → test → evidence workflow |
| **aaw-security** | `aaw-security/SKILL.md` | Security rules - prevents sensitive file access and dangerous commands |

## Skill Activation

Skills are automatically suggested by the skill evaluation system when you submit a prompt. The system analyzes:

- **Keywords**: Simple word matches (e.g., "plan", "audit", "security")
- **Patterns**: Regex patterns for more complex matching
- **File paths**: Files mentioned in your prompt
- **Intent**: What you're trying to do
- **Context**: Surrounding conversation context

### Activation Flow

1. You submit a prompt
2. The skill evaluation hook (`UserPromptSubmit`) runs
3. Matched skills are displayed with confidence levels
4. You evaluate each suggestion (YES/NO)
5. You activate relevant skills using the Skill tool
6. Proceed with implementation

### Example Output

```
<user-prompt-submit-hook>
AAW SKILL ACTIVATION REQUIRED

Matched skills (ranked by relevance):
1. aaw-sop (HIGH confidence)
   Matched: keyword "implement", intent detected
2. aaw-security (MEDIUM confidence)
   Matched: keyword "api"

## AAW Workflow Reminder
This is an AUDITABLE workspace. Before implementing:
1. Use /aaw-plan to start a planning session
2. Use aawctl MCP tools for all operations
3. Follow aaw-sop and aaw-security skill guidelines

Before implementing, you MUST:
1. EVALUATE: State YES/NO for each skill with brief reasoning
2. ACTIVATE: Invoke the Skill tool for each YES skill
3. IMPLEMENT: Only proceed after skill activation
</user-prompt-submit-hook>
```

## Skill Details

### aaw-sop (Standard Operating Procedure)

**Purpose**: Enforce the AAW workflow for all development tasks.

**Triggers**:
- Keywords: plan, implement, test, evidence, audit, aaw, workflow
- Intent: Creating features, starting tasks, making changes

**Key Rules**:
1. Always start with `/aaw-plan` to create an audit session
2. Use `aawctl` MCP tools for all operations
3. Never skip the evidence generation step
4. All actions must be logged for audit

**Workflow**:
```
/aaw-plan [ticket] [scope]
    ↓
/aaw-implement [audit-id]
    ↓
/aaw-test [audit-id] [scope]
    ↓
/aaw-evidence [audit-id]
```

### aaw-security (Security Rules)

**Purpose**: Prevent security violations and protect sensitive data.

**Triggers**:
- Keywords: security, secret, credential, password, token, .env
- File patterns: .env, secrets/**, *.pem, *.key
- Intent: Reading secrets, running privileged commands

**Key Rules**:
1. Never read `.env`, credential files, or private keys
2. Never run `sudo`, `curl`, or `wget` commands directly
3. All package installations must be approved
4. External connections require explicit approval

**Blocked Patterns**:
- `Read(**/.env*)`
- `Read(**/secrets/**)`
- `Read(**/*.pem)`
- `Read(**/*.key)`
- `Bash(sudo:*)`
- `Bash(curl:*)`
- `Bash(wget:*)`

## Creating New Skills

### File Structure

```
.claude/skills/
├── README.md          # This file
├── aaw-sop/
│   └── SKILL.md       # Skill definition
└── aaw-security/
    └── SKILL.md       # Skill definition
```

### Skill File Format

```markdown
---
description: Brief description of the skill
allowed-tools: tool1, tool2, tool3
---

# Skill Name

## Overview
What this skill does and when to use it.

## Rules
1. First rule
2. Second rule

## Patterns
### Do This
Good example...

### Don't Do This
Bad example...

## Workflow
Step-by-step process...
```

### Skill Frontmatter

| Field | Description |
|-------|-------------|
| `description` | Brief description (shown in skill list) |
| `allowed-tools` | Comma-separated list of tools this skill can use |
| `model` | Optional: specific model to use (sonnet, opus, haiku) |

### Registering New Skills

1. Create the skill directory and SKILL.md file
2. Add skill configuration to `.claude/hooks/skill-rules.json`
3. Test with sample prompts

Example skill rules entry:

```json
{
  "my-new-skill": {
    "description": "What my skill does",
    "priority": 7,
    "triggers": {
      "keywords": ["keyword1", "keyword2"],
      "keywordPatterns": ["\\bpattern\\b"],
      "pathPatterns": ["**/relevant/**/*.ts"],
      "intentPatterns": ["(?:create|build).*(?:something)"]
    },
    "relatedSkills": ["aaw-sop"]
  }
}
```

## Best Practices

### Writing Effective Skills

1. **Be specific**: Focus on one domain or workflow
2. **Include examples**: Show good and bad patterns
3. **Use allowed-tools**: Restrict tools to what's needed
4. **Reference related skills**: Help Claude connect concepts

### Skill Activation Tips

1. Use specific keywords in your prompts
2. Mention relevant file paths
3. State your intent clearly
4. Combine multiple skills when needed

### Maintenance

1. Review skills periodically
2. Update based on team feedback
3. Remove obsolete patterns
4. Add new patterns as codebase evolves

## Related Documentation

- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [AAW Settings](./../settings.md)
- [AAW Commands](./../commands/)
