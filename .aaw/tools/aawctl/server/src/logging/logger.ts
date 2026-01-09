/**
 * JSONL Logger
 *
 * Writes structured logs in JSONL format.
 */

import * as fs from "fs";
import * as path from "path";

interface LogEntry {
  timestamp: string;
  event: string;
  data: Record<string, unknown>;
}

export class Logger {
  private logDir: string;
  private currentLogFile: string;

  constructor() {
    this.logDir = process.env.AAW_LOG_DIR || "./.aaw/logs";
    this.ensureLogDir();
    this.currentLogFile = this.getLogFilePath();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split("T")[0];
    return path.join(this.logDir, `aaw-${date}.jsonl`);
  }

  log(event: string, data: Record<string, unknown> = {}): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };

    const line = JSON.stringify(entry) + "\n";

    try {
      fs.appendFileSync(this.currentLogFile, line);
    } catch (error) {
      // If we can't write to file, write to stderr
      console.error(`[aawctl] Log write failed: ${error}`);
      console.error(`[aawctl] ${line}`);
    }
  }

  getLogFile(): string {
    return this.currentLogFile;
  }

  readLogs(date?: string): LogEntry[] {
    const logFile = date
      ? path.join(this.logDir, `aaw-${date}.jsonl`)
      : this.currentLogFile;

    if (!fs.existsSync(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines.map((line) => JSON.parse(line) as LogEntry);
  }
}
