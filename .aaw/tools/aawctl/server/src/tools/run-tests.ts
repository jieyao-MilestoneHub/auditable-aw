/**
 * run_tests tool implementation
 *
 * Runs tests for a scope and captures results.
 */

import { spawn } from "child_process";
import { Logger } from "../logging/logger.js";
import { SessionStore } from "../logging/session-store.js";
import * as fs from "fs";
import * as path from "path";

const logger = new Logger();
const sessionStore = new SessionStore();

interface RunTestsParams {
  scope: string;
  target?: string;
}

interface RunTestsResult {
  scope: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration_ms: number;
  report_path?: string;
  output: string;
  success: boolean;
}

export async function runTests(params: RunTestsParams): Promise<RunTestsResult> {
  const { scope, target } = params;
  const startTime = Date.now();

  logger.log("run_tests_start", { scope, target });

  // Determine test command based on scope
  const scopeDir = getScopeDirectory(scope);
  const testCommand = detectTestCommand(scopeDir);

  if (!testCommand) {
    return {
      scope,
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration_ms: 0,
      output: "No test framework detected",
      success: false,
    };
  }

  try {
    const result = await executeTests(testCommand, scopeDir, target);
    const duration_ms = Date.now() - startTime;

    // Parse test results
    const parsed = parseTestOutput(result.stdout + result.stderr);

    // Save report
    const report_path = await saveTestReport(scope, {
      ...parsed,
      output: result.stdout,
      exitCode: result.exitCode,
    });

    // Add to session
    sessionStore.addTestResult({
      scope,
      ...parsed,
      duration_ms,
      report_path,
    });

    logger.log("run_tests_complete", {
      scope,
      ...parsed,
      duration_ms,
      success: result.exitCode === 0,
    });

    return {
      scope,
      ...parsed,
      duration_ms,
      report_path,
      output: result.stdout,
      success: result.exitCode === 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.log("run_tests_error", { scope, error: errorMessage });

    return {
      scope,
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration_ms: Date.now() - startTime,
      output: errorMessage,
      success: false,
    };
  }
}

function getScopeDirectory(scope: string): string {
  const policyDir = process.env.AAW_POLICY_DIR || ".";

  if (scope === "global") {
    return policyDir;
  }

  // Check packages directory
  const packagePath = path.join(policyDir, "packages", scope);
  if (fs.existsSync(packagePath)) {
    return packagePath;
  }

  return policyDir;
}

function detectTestCommand(dir: string): string | null {
  const packageJsonPath = path.join(dir, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      if (pkg.scripts?.test) {
        return "npm test";
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check for pytest
  if (
    fs.existsSync(path.join(dir, "pytest.ini")) ||
    fs.existsSync(path.join(dir, "pyproject.toml"))
  ) {
    return "pytest";
  }

  // Check for go
  if (fs.existsSync(path.join(dir, "go.mod"))) {
    return "go test ./...";
  }

  return null;
}

async function executeTests(
  command: string,
  cwd: string,
  target?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const fullCommand = target ? `${command} ${target}` : command;

  return new Promise((resolve, reject) => {
    const child = spawn(fullCommand, {
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

    child.on("error", reject);

    // Timeout after 10 minutes
    setTimeout(() => {
      child.kill();
      reject(new Error("Tests timed out after 10 minutes"));
    }, 10 * 60 * 1000);
  });
}

function parseTestOutput(output: string): {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
} {
  // Try to parse Jest/Vitest output
  const jestMatch = output.match(
    /Tests:\s+(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+total/i
  );
  if (jestMatch) {
    return {
      passed: parseInt(jestMatch[1], 10),
      failed: parseInt(jestMatch[2], 10),
      skipped: 0,
      total: parseInt(jestMatch[3], 10),
    };
  }

  // Try to parse pytest output
  const pytestMatch = output.match(
    /(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/i
  );
  if (pytestMatch) {
    return {
      passed: parseInt(pytestMatch[1], 10),
      failed: parseInt(pytestMatch[2], 10),
      skipped: parseInt(pytestMatch[3], 10),
      total:
        parseInt(pytestMatch[1], 10) +
        parseInt(pytestMatch[2], 10) +
        parseInt(pytestMatch[3], 10),
    };
  }

  // Default
  return { passed: 0, failed: 0, skipped: 0, total: 0 };
}

async function saveTestReport(
  scope: string,
  data: object
): Promise<string> {
  const evidenceDir = process.env.AAW_EVIDENCE_DIR || "./.aaw/evidence";
  const reportDir = path.join(evidenceDir, "test-reports");

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const filename = `${scope}-${Date.now()}.json`;
  const filepath = path.join(reportDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

  return filepath;
}
