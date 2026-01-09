/**
 * bundle_evidence tool implementation
 *
 * Generates a complete evidence bundle (zip + HTML report).
 */

import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
import { createHash } from "crypto";
import { Logger } from "../logging/logger.js";
import { SessionStore } from "../logging/session-store.js";
import { generateHtmlReport } from "../evidence/html-generator.js";

const logger = new Logger();
const sessionStore = new SessionStore();

interface BundleEvidenceParams {
  audit_id: string;
}

interface BundleEvidenceResult {
  bundle_path: string;
  bundle_size_bytes: number;
  hash_sha256: string;
  generated_at: string;
  summary: {
    total_commands: number;
    total_artifacts: number;
    total_test_results: number;
    policy_violations: number;
  };
  contents: string[];
}

export async function bundleEvidence(
  params: BundleEvidenceParams
): Promise<BundleEvidenceResult> {
  const { audit_id } = params;
  const generated_at = new Date().toISOString();

  logger.log("bundle_evidence_start", { audit_id });

  // Get session data
  const session = sessionStore.getSession(audit_id);
  if (!session) {
    throw new Error(`Session not found: ${audit_id}`);
  }

  // Create bundle directory
  const evidenceDir = process.env.AAW_EVIDENCE_DIR || "./.aaw/evidence";
  const bundleDir = path.join(evidenceDir, "bundles");
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  // Generate HTML report
  const htmlReport = generateHtmlReport(session);
  const htmlPath = path.join(bundleDir, `${audit_id}-report.html`);
  fs.writeFileSync(htmlPath, htmlReport);

  // Create JSON summary
  const jsonPath = path.join(bundleDir, `${audit_id}-data.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(session, null, 2));

  // Create zip bundle
  const bundle_path = path.join(bundleDir, `${audit_id}.zip`);
  const contents = await createZipBundle(bundle_path, {
    htmlPath,
    jsonPath,
    session,
    evidenceDir,
  });

  // Calculate hash
  const hash_sha256 = calculateFileHash(bundle_path);

  // Get file size
  const stats = fs.statSync(bundle_path);

  // Calculate summary
  const summary = {
    total_commands: session.commands?.length || 0,
    total_artifacts: session.artifacts?.length || 0,
    total_test_results: session.test_results?.length || 0,
    policy_violations: countPolicyViolations(session),
  };

  logger.log("bundle_evidence_complete", {
    audit_id,
    bundle_path,
    hash_sha256,
    summary,
  });

  return {
    bundle_path,
    bundle_size_bytes: stats.size,
    hash_sha256,
    generated_at,
    summary,
    contents,
  };
}

async function createZipBundle(
  outputPath: string,
  data: {
    htmlPath: string;
    jsonPath: string;
    session: any;
    evidenceDir: string;
  }
): Promise<string[]> {
  const contents: string[] = [];

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      resolve(contents);
    });

    archive.on("error", reject);

    archive.pipe(output);

    // Add HTML report
    archive.file(data.htmlPath, { name: "index.html" });
    contents.push("index.html");

    // Add JSON data
    archive.file(data.jsonPath, { name: "session.json" });
    contents.push("session.json");

    // Add log files
    const logDir = process.env.AAW_LOG_DIR || "./.aaw/logs";
    if (fs.existsSync(logDir)) {
      archive.directory(logDir, "logs");
      contents.push("logs/");
    }

    // Add artifacts
    const artifactsDir = path.join(data.evidenceDir, "artifacts");
    if (fs.existsSync(artifactsDir)) {
      archive.directory(artifactsDir, "artifacts");
      contents.push("artifacts/");
    }

    // Add test reports
    const testReportsDir = path.join(data.evidenceDir, "test-reports");
    if (fs.existsSync(testReportsDir)) {
      archive.directory(testReportsDir, "test-reports");
      contents.push("test-reports/");
    }

    archive.finalize();
  });
}

function calculateFileHash(filepath: string): string {
  const content = fs.readFileSync(filepath);
  return createHash("sha256").update(content).digest("hex");
}

function countPolicyViolations(session: any): number {
  let count = 0;
  for (const cmd of session.commands || []) {
    if (cmd.policy_check && !cmd.policy_check.allowed) {
      count++;
    }
  }
  return count;
}
