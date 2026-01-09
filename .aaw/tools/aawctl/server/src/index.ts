#!/usr/bin/env node
/**
 * AAW Controller - MCP Server Entry Point
 *
 * This is the main entry point for the aawctl MCP server.
 * It registers all tools and handles the stdio transport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { startSession } from "./tools/start-session.js";
import { exec } from "./tools/exec.js";
import { readPolicy } from "./tools/read-policy.js";
import { runTests } from "./tools/run-tests.js";
import { captureArtifact } from "./tools/capture-artifact.js";
import { bundleEvidence } from "./tools/bundle-evidence.js";
import { Logger } from "./logging/logger.js";

// Initialize logger
const logger = new Logger();

// Create MCP server
const server = new Server(
  {
    name: "aawctl",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: "aaw.start_session",
    description:
      "Start an auditable session. Returns an audit_id to track all subsequent actions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        scope: {
          type: "string",
          description: 'The scope for this session (e.g., "frontend", "backend", "global")',
        },
        ticket: {
          type: "string",
          description: "Ticket or issue ID associated with this session",
        },
        mode: {
          type: "string",
          enum: ["plan", "implement", "test", "evidence"],
          description: "The mode of this session",
        },
      },
      required: ["scope", "ticket", "mode"],
    },
  },
  {
    name: "aaw.exec",
    description:
      "Execute a command with policy check and audit logging. Use this instead of direct Bash.",
    inputSchema: {
      type: "object" as const,
      properties: {
        scope: {
          type: "string",
          description: "The scope for policy check",
        },
        cmd: {
          type: "string",
          description: "The command to execute",
        },
        cwd: {
          type: "string",
          description: "Working directory for the command",
        },
        purpose: {
          type: "string",
          description: "Purpose of this command (for audit trail)",
        },
      },
      required: ["cmd", "purpose"],
    },
  },
  {
    name: "aaw.read_policy",
    description: "Read the merged policy for a given scope.",
    inputSchema: {
      type: "object" as const,
      properties: {
        scope: {
          type: "string",
          description: 'The scope to read policy for (e.g., "frontend", "global")',
        },
      },
      required: ["scope"],
    },
  },
  {
    name: "aaw.run_tests",
    description: "Run tests for a scope and capture results.",
    inputSchema: {
      type: "object" as const,
      properties: {
        scope: {
          type: "string",
          description: "The scope to run tests for",
        },
        target: {
          type: "string",
          description: "Specific test target (optional)",
        },
      },
      required: ["scope"],
    },
  },
  {
    name: "aaw.capture_artifact",
    description: "Capture an artifact (test report, screenshot, etc.) for the evidence bundle.",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["test-report", "coverage", "screenshot", "diff", "other"],
          description: "Type of artifact",
        },
        path: {
          type: "string",
          description: "Path to the artifact file",
        },
        description: {
          type: "string",
          description: "Description of the artifact",
        },
      },
      required: ["type", "path"],
    },
  },
  {
    name: "aaw.bundle_evidence",
    description: "Generate an evidence bundle (zip + HTML report) for the audit session.",
    inputSchema: {
      type: "object" as const,
      properties: {
        audit_id: {
          type: "string",
          description: "The audit ID to bundle",
        },
      },
      required: ["audit_id"],
    },
  },
];

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.log("tool_call", { tool: name, args });

  try {
    let result;

    switch (name) {
      case "aaw.start_session":
        result = await startSession(args as {
          scope: string;
          ticket: string;
          mode: string;
        });
        break;

      case "aaw.exec":
        result = await exec(args as {
          scope?: string;
          cmd: string;
          cwd?: string;
          purpose: string;
        });
        break;

      case "aaw.read_policy":
        result = await readPolicy(args as { scope: string });
        break;

      case "aaw.run_tests":
        result = await runTests(args as { scope: string; target?: string });
        break;

      case "aaw.capture_artifact":
        result = await captureArtifact(args as {
          type: string;
          path: string;
          description?: string;
        });
        break;

      case "aaw.bundle_evidence":
        result = await bundleEvidence(args as { audit_id: string });
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    logger.log("tool_result", { tool: name, success: true, result });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.log("tool_error", { tool: name, error: errorMessage });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.log("server_start", { version: "0.1.0" });
  console.error("[aawctl] MCP server started");
}

main().catch((error) => {
  console.error("[aawctl] Fatal error:", error);
  process.exit(1);
});
