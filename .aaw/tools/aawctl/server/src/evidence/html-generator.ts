/**
 * HTML Report Generator
 *
 * Generates a human-readable HTML report for evidence bundles.
 */

interface Session {
  audit_id: string;
  started_at: string;
  scope: string;
  ticket: string;
  mode: string;
  commands: Array<{
    execution_id: string;
    cmd: string;
    purpose: string;
    timestamp: string;
    result: {
      exitCode: number;
    };
    policy_check: {
      allowed: boolean;
      rule_matched?: string;
    };
  }>;
  artifacts: Array<{
    artifact_id: string;
    type: string;
    original_path: string;
    captured_at: string;
  }>;
  test_results: Array<{
    scope: string;
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    duration_ms: number;
  }>;
}

export function generateHtmlReport(session: Session): string {
  const generatedAt = new Date().toISOString();
  const policyViolations = session.commands.filter(
    (c) => !c.policy_check.allowed
  ).length;

  const testSummary = session.test_results.reduce(
    (acc, r) => ({
      passed: acc.passed + r.passed,
      failed: acc.failed + r.failed,
      skipped: acc.skipped + r.skipped,
      total: acc.total + r.total,
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0 }
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AAW Evidence Report - ${session.audit_id}</title>
  <style>
    :root {
      --primary: #2563eb;
      --success: #16a34a;
      --danger: #dc2626;
      --warning: #d97706;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-700: #374151;
      --gray-900: #111827;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--gray-900);
      background: var(--gray-50);
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header {
      background: linear-gradient(135deg, var(--primary), #1e40af);
      color: white;
      padding: 2rem;
      margin-bottom: 2rem;
      border-radius: 8px;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .meta { opacity: 0.9; font-size: 0.875rem; }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--gray-100);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .summary-item {
      background: var(--gray-50);
      padding: 1rem;
      border-radius: 4px;
      text-align: center;
    }
    .summary-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--primary);
    }
    .summary-value.success { color: var(--success); }
    .summary-value.danger { color: var(--danger); }
    .summary-label { font-size: 0.875rem; color: var(--gray-700); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid var(--gray-200);
    }
    th { background: var(--gray-50); font-weight: 600; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-success { background: #dcfce7; color: var(--success); }
    .badge-danger { background: #fee2e2; color: var(--danger); }
    .badge-warning { background: #fef3c7; color: var(--warning); }
    .cmd { font-family: monospace; background: var(--gray-100); padding: 0.25rem 0.5rem; border-radius: 4px; }
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--gray-700);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AAW Evidence Report</h1>
      <div class="meta">
        <strong>Audit ID:</strong> ${session.audit_id}<br>
        <strong>Ticket:</strong> ${session.ticket || "N/A"}<br>
        <strong>Scope:</strong> ${session.scope}<br>
        <strong>Generated:</strong> ${generatedAt}
      </div>
    </header>

    <div class="card">
      <h2 class="card-title">Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${session.commands.length}</div>
          <div class="summary-label">Commands Executed</div>
        </div>
        <div class="summary-item">
          <div class="summary-value ${policyViolations > 0 ? "danger" : "success"}">${policyViolations}</div>
          <div class="summary-label">Policy Violations</div>
        </div>
        <div class="summary-item">
          <div class="summary-value success">${testSummary.passed}</div>
          <div class="summary-label">Tests Passed</div>
        </div>
        <div class="summary-item">
          <div class="summary-value ${testSummary.failed > 0 ? "danger" : ""}">${testSummary.failed}</div>
          <div class="summary-label">Tests Failed</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${session.artifacts.length}</div>
          <div class="summary-label">Artifacts Captured</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Commands Executed</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Command</th>
            <th>Purpose</th>
            <th>Status</th>
            <th>Policy</th>
          </tr>
        </thead>
        <tbody>
          ${session.commands
            .map(
              (cmd) => `
          <tr>
            <td>${new Date(cmd.timestamp).toLocaleString()}</td>
            <td><code class="cmd">${escapeHtml(cmd.cmd)}</code></td>
            <td>${escapeHtml(cmd.purpose)}</td>
            <td>
              <span class="badge ${cmd.result.exitCode === 0 ? "badge-success" : "badge-danger"}">
                Exit ${cmd.result.exitCode}
              </span>
            </td>
            <td>
              <span class="badge ${cmd.policy_check.allowed ? "badge-success" : "badge-danger"}">
                ${cmd.policy_check.allowed ? "Allowed" : "Denied"}
              </span>
            </td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2 class="card-title">Test Results</h2>
      ${
        session.test_results.length > 0
          ? `
      <table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Total</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${session.test_results
            .map(
              (r) => `
          <tr>
            <td>${r.scope}</td>
            <td><span class="badge badge-success">${r.passed}</span></td>
            <td><span class="badge ${r.failed > 0 ? "badge-danger" : ""}">${r.failed}</span></td>
            <td><span class="badge badge-warning">${r.skipped}</span></td>
            <td>${r.total}</td>
            <td>${(r.duration_ms / 1000).toFixed(2)}s</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>`
          : "<p>No test results recorded.</p>"
      }
    </div>

    <div class="card">
      <h2 class="card-title">Artifacts</h2>
      ${
        session.artifacts.length > 0
          ? `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Original Path</th>
            <th>Captured</th>
          </tr>
        </thead>
        <tbody>
          ${session.artifacts
            .map(
              (a) => `
          <tr>
            <td><code>${a.artifact_id}</code></td>
            <td><span class="badge">${a.type}</span></td>
            <td>${escapeHtml(a.original_path)}</td>
            <td>${new Date(a.captured_at).toLocaleString()}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>`
          : "<p>No artifacts captured.</p>"
      }
    </div>

    <footer>
      <p>Generated by AAW (Auditable AI Workspace) &bull; ${generatedAt}</p>
      <p>This report is part of the evidence bundle for audit and compliance purposes.</p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
