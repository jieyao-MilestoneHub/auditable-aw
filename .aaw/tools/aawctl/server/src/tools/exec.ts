/**
 * exec tool implementation
 *
 * Executes a command with policy check and audit logging.
 */

import { spawn } from "child_process";
import { PolicyEngine } from "../policy/engine.js";
import { Logger } from "../logging/logger.js";
import { SessionStore } from "../logging/session-store.js";

const policyEngine = new PolicyEngine();
const logger = new Logger();
const sessionStore = new SessionStore();

interface ExecParams {
  scope?: string;
  cmd: string;
  cwd?: string;
  purpose: string;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  policy_check: {
    allowed: boolean;
    rule_matched?: string;
    would_block?: boolean;
  };
  execution_id: string;
  timestamp: string;
}

export async function exec(params: ExecParams): Promise<ExecResult> {
  const { scope = "global", cmd, cwd = process.cwd(), purpose } = params;
  const timestamp = new Date().toISOString();
  const execution_id = `exec-${Date.now()}`;

  // Check policy
  const policyCheck = await policyEngine.checkBashCommand(scope, cmd);

  // Log the attempt
  logger.log("exec_attempt", {
    execution_id,
    scope,
    cmd,
    cwd,
    purpose,
    policy_check: policyCheck,
  });

  // If policy denies and we're in enforce mode, don't execute
  if (!policyCheck.allowed && !policyCheck.would_block) {
    logger.log("exec_denied", {
      execution_id,
      reason: policyCheck.rule_matched,
    });

    return {
      stdout: "",
      stderr: `[AAW] Command denied by policy: ${policyCheck.rule_matched}`,
      exitCode: 1,
      policy_check: policyCheck,
      execution_id,
      timestamp,
    };
  }

  // Execute the command
  try {
    const result = await executeCommand(cmd, cwd);

    // Log success
    logger.log("exec_complete", {
      execution_id,
      exitCode: result.exitCode,
      stdout_length: result.stdout.length,
      stderr_length: result.stderr.length,
    });

    // Add to current session if exists
    sessionStore.addCommand({
      execution_id,
      cmd,
      cwd,
      purpose,
      result,
      policy_check: policyCheck,
      timestamp,
    });

    return {
      ...result,
      policy_check: policyCheck,
      execution_id,
      timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.log("exec_error", {
      execution_id,
      error: errorMessage,
    });

    return {
      stdout: "",
      stderr: errorMessage,
      exitCode: 1,
      policy_check: policyCheck,
      execution_id,
      timestamp,
    };
  }
}

async function executeCommand(
  cmd: string,
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, {
      shell: true,
      cwd,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });

    child.on("error", (error) => {
      reject(error);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill();
      reject(new Error("Command timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}
