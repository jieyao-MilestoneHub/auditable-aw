/**
 * Session Store
 *
 * In-memory store for audit sessions with persistence.
 */

import * as fs from "fs";
import * as path from "path";

interface Session {
  audit_id: string;
  started_at: string;
  scope: string;
  ticket: string;
  mode: string;
  commands: CommandEntry[];
  artifacts: ArtifactEntry[];
  test_results: TestResultEntry[];
  policy_checks: PolicyCheckEntry[];
}

interface CommandEntry {
  execution_id: string;
  cmd: string;
  cwd: string;
  purpose: string;
  result: {
    stdout: string;
    stderr: string;
    exitCode: number;
  };
  policy_check: {
    allowed: boolean;
    rule_matched?: string;
    would_block?: boolean;
  };
  timestamp: string;
}

interface ArtifactEntry {
  artifact_id: string;
  type: string;
  original_path: string;
  stored_path: string;
  size_bytes: number;
  captured_at: string;
  description?: string;
}

interface TestResultEntry {
  scope: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration_ms: number;
  report_path?: string;
}

interface PolicyCheckEntry {
  timestamp: string;
  action: string;
  result: {
    allowed: boolean;
    rule_matched?: string;
  };
}

export class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private currentSessionId: string | null = null;
  private persistDir: string;

  constructor() {
    this.persistDir = process.env.AAW_LOG_DIR || "./.aaw/logs";
    this.ensureDir();
    this.loadPersistedSessions();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.persistDir)) {
      fs.mkdirSync(this.persistDir, { recursive: true });
    }
  }

  private loadPersistedSessions(): void {
    const sessionsFile = path.join(this.persistDir, "sessions.json");
    if (fs.existsSync(sessionsFile)) {
      try {
        const content = fs.readFileSync(sessionsFile, "utf-8");
        const sessions = JSON.parse(content) as Session[];
        for (const session of sessions) {
          this.sessions.set(session.audit_id, session);
        }
      } catch {
        // Ignore load errors
      }
    }
  }

  private persistSessions(): void {
    const sessionsFile = path.join(this.persistDir, "sessions.json");
    const sessions = Array.from(this.sessions.values());
    fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  }

  createSession(audit_id: string, session: Partial<Session>): Session {
    const fullSession: Session = {
      audit_id,
      started_at: new Date().toISOString(),
      scope: "global",
      ticket: "",
      mode: "plan",
      commands: [],
      artifacts: [],
      test_results: [],
      policy_checks: [],
      ...session,
    };

    this.sessions.set(audit_id, fullSession);
    this.currentSessionId = audit_id;
    this.persistSessions();

    return fullSession;
  }

  getSession(audit_id: string): Session | undefined {
    return this.sessions.get(audit_id);
  }

  getCurrentSession(): Session | undefined {
    if (!this.currentSessionId) {
      return undefined;
    }
    return this.sessions.get(this.currentSessionId);
  }

  addCommand(entry: CommandEntry): void {
    const session = this.getCurrentSession();
    if (session) {
      session.commands.push(entry);
      this.persistSessions();
    }
  }

  addArtifact(entry: ArtifactEntry): void {
    const session = this.getCurrentSession();
    if (session) {
      session.artifacts.push(entry);
      this.persistSessions();
    }
  }

  addTestResult(entry: TestResultEntry): void {
    const session = this.getCurrentSession();
    if (session) {
      session.test_results.push(entry);
      this.persistSessions();
    }
  }

  addPolicyCheck(entry: PolicyCheckEntry): void {
    const session = this.getCurrentSession();
    if (session) {
      session.policy_checks.push(entry);
      this.persistSessions();
    }
  }

  setCurrentSession(audit_id: string): boolean {
    if (this.sessions.has(audit_id)) {
      this.currentSessionId = audit_id;
      return true;
    }
    return false;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}
