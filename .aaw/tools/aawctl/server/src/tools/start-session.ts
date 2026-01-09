/**
 * start_session tool implementation
 *
 * Starts an audit session and returns an audit_id.
 */

import { randomUUID } from "crypto";
import { SessionStore } from "../logging/session-store.js";
import { Logger } from "../logging/logger.js";

const sessionStore = new SessionStore();
const logger = new Logger();

interface StartSessionParams {
  scope: string;
  ticket: string;
  mode: string;
}

interface StartSessionResult {
  audit_id: string;
  started_at: string;
  scope: string;
  ticket: string;
  mode: string;
}

export async function startSession(
  params: StartSessionParams
): Promise<StartSessionResult> {
  const { scope, ticket, mode } = params;

  // Generate unique audit ID
  const audit_id = `aaw-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const started_at = new Date().toISOString();

  // Create session
  const session = {
    audit_id,
    started_at,
    scope,
    ticket,
    mode,
    commands: [],
    artifacts: [],
    policy_checks: [],
  };

  // Store session
  sessionStore.createSession(audit_id, session);

  // Log session start
  logger.log("session_start", {
    audit_id,
    scope,
    ticket,
    mode,
  });

  return {
    audit_id,
    started_at,
    scope,
    ticket,
    mode,
  };
}
