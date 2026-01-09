/**
 * capture_artifact tool implementation
 *
 * Captures an artifact for inclusion in the evidence bundle.
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { Logger } from "../logging/logger.js";
import { SessionStore } from "../logging/session-store.js";

const logger = new Logger();
const sessionStore = new SessionStore();

interface CaptureArtifactParams {
  type: string;
  path: string;
  description?: string;
}

interface CaptureArtifactResult {
  artifact_id: string;
  type: string;
  original_path: string;
  stored_path: string;
  size_bytes: number;
  captured_at: string;
}

export async function captureArtifact(
  params: CaptureArtifactParams
): Promise<CaptureArtifactResult> {
  const { type, path: sourcePath, description } = params;
  const artifact_id = `artifact-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const captured_at = new Date().toISOString();

  logger.log("capture_artifact_start", { artifact_id, type, path: sourcePath });

  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Artifact source not found: ${sourcePath}`);
  }

  // Determine destination
  const evidenceDir = process.env.AAW_EVIDENCE_DIR || "./.aaw/evidence";
  const artifactsDir = path.join(evidenceDir, "artifacts", type);

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Copy the artifact
  const ext = path.extname(sourcePath);
  const destFilename = `${artifact_id}${ext}`;
  const stored_path = path.join(artifactsDir, destFilename);

  fs.copyFileSync(sourcePath, stored_path);
  const stats = fs.statSync(stored_path);

  // Create metadata
  const metadata = {
    artifact_id,
    type,
    original_path: sourcePath,
    stored_path,
    size_bytes: stats.size,
    captured_at,
    description,
  };

  // Save metadata
  const metadataPath = path.join(artifactsDir, `${artifact_id}.meta.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // Add to session
  sessionStore.addArtifact(metadata);

  logger.log("capture_artifact_complete", {
    artifact_id,
    size_bytes: stats.size,
  });

  return {
    artifact_id,
    type,
    original_path: sourcePath,
    stored_path,
    size_bytes: stats.size,
    captured_at,
  };
}
