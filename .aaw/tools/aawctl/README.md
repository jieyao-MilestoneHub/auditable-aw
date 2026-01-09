# aawctl - Auditable AI Workspace Controller

MCP (Model Context Protocol) server for enterprise-grade auditable AI development.

## Overview

aawctl provides Claude Code with auditable execution capabilities:

- **Policy-controlled command execution**
- **Structured logging (JSONL)**
- **Test execution and capture**
- **Evidence bundle generation**

## Architecture

```
aawctl/
├── server/           # MCP stdio server
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── tools/            # MCP tool implementations
│   │   ├── policy/           # Policy engine
│   │   ├── logging/          # JSONL logging
│   │   └── evidence/         # Bundle generation
│   └── package.json
│
└── cli/              # CLI utilities
    └── evidence-bundler/     # Standalone bundler
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `aaw.start_session` | Start an audit session |
| `aaw.exec` | Execute command with policy check |
| `aaw.read_policy` | Read merged policy for scope |
| `aaw.run_tests` | Run tests and capture results |
| `aaw.capture_artifact` | Capture artifacts |
| `aaw.bundle_evidence` | Generate evidence bundle |

## Development

```bash
# Install dependencies
cd server
npm install

# Build
npm run build

# Development mode (watch)
npm run dev
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `AAW_LOG_DIR` | Directory for JSONL logs | `./.aaw/logs` |
| `AAW_POLICY_DIR` | Directory for policy files | `.` |
| `AAW_EVIDENCE_DIR` | Directory for evidence bundles | `./.aaw/evidence` |

## Integration

### As MCP Server

In `.mcp.json`:

```json
{
  "mcpServers": {
    "aawctl": {
      "type": "stdio",
      "command": "node",
      "args": ["./tools/aawctl/server/dist/index.js"]
    }
  }
}
```

### Managed Deployment

For enterprise deployment, use `managed-mcp.json` in system path.

## License

Proprietary - All rights reserved
