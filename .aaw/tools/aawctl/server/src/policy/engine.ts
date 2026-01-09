/**
 * Policy Engine
 *
 * Handles loading, merging, and checking policies.
 */

import * as fs from "fs";
import * as path from "path";
import yaml from "yaml";

interface Policy {
  version?: string;
  name?: string;
  mode?: string;
  bash?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
  };
  files?: {
    read_deny?: string[];
    write_deny?: string[];
    read_allow?: string[];
    write_allow?: string[];
  };
  packages?: {
    approved?: string[];
    approved_prefixes?: string[];
    denied?: string[];
    require_approval?: boolean;
  };
  network?: {
    allowed_domains?: string[];
    denied_domains?: string[];
  };
  [key: string]: unknown;
}

interface PolicyCheckResult {
  allowed: boolean;
  rule_matched?: string;
  would_block?: boolean;
}

export class PolicyEngine {
  private policyDir: string;
  private cachedGlobalPolicy: Policy | null = null;
  private scopePolicies: Map<string, Policy> = new Map();

  constructor() {
    this.policyDir = process.env.AAW_POLICY_DIR || ".";
  }

  async loadGlobalPolicy(): Promise<Policy> {
    if (this.cachedGlobalPolicy) {
      return this.cachedGlobalPolicy;
    }

    const globalPolicyPath = path.join(this.policyDir, "aaw.policy.yaml");

    if (!fs.existsSync(globalPolicyPath)) {
      // Return default policy
      this.cachedGlobalPolicy = {
        version: "1.0",
        mode: "audit-only",
        bash: {
          allow: ["*"],
          deny: [],
        },
      };
      return this.cachedGlobalPolicy;
    }

    const content = fs.readFileSync(globalPolicyPath, "utf-8");
    this.cachedGlobalPolicy = yaml.parse(content) as Policy;
    return this.cachedGlobalPolicy;
  }

  async loadScopePolicy(scope: string): Promise<Policy | null> {
    if (scope === "global") {
      return null;
    }

    if (this.scopePolicies.has(scope)) {
      return this.scopePolicies.get(scope)!;
    }

    const scopePolicyPath = path.join(
      this.policyDir,
      "packages",
      scope,
      "aaw.policy.yaml"
    );

    if (!fs.existsSync(scopePolicyPath)) {
      return null;
    }

    const content = fs.readFileSync(scopePolicyPath, "utf-8");
    const policy = yaml.parse(content) as Policy;
    this.scopePolicies.set(scope, policy);
    return policy;
  }

  mergePolicy(global: Policy, scope: Policy | null): Policy {
    if (!scope) {
      return global;
    }

    // Deep merge with scope overriding global
    // But deny rules are additive (more restrictive)
    const merged: Policy = {
      ...global,
      ...scope,
      bash: {
        allow: scope.bash?.allow || global.bash?.allow || [],
        ask: [
          ...(global.bash?.ask || []),
          ...(scope.bash?.ask || []),
        ],
        deny: [
          ...(global.bash?.deny || []),
          ...(scope.bash?.deny || []),
        ],
      },
      files: {
        read_deny: [
          ...(global.files?.read_deny || []),
          ...(scope.files?.read_deny || []),
        ],
        write_deny: [
          ...(global.files?.write_deny || []),
          ...(scope.files?.write_deny || []),
        ],
        read_allow: scope.files?.read_allow || global.files?.read_allow || [],
        write_allow: scope.files?.write_allow || global.files?.write_allow || [],
      },
    };

    return merged;
  }

  async checkBashCommand(scope: string, cmd: string): Promise<PolicyCheckResult> {
    const globalPolicy = await this.loadGlobalPolicy();
    const scopePolicy = await this.loadScopePolicy(scope);
    const policy = this.mergePolicy(globalPolicy, scopePolicy);
    const mode = policy.mode || "audit-only";

    // Check deny rules first (highest priority)
    for (const pattern of policy.bash?.deny || []) {
      if (this.matchPattern(cmd, pattern)) {
        return {
          allowed: mode === "audit-only",
          rule_matched: `deny: ${pattern}`,
          would_block: mode === "audit-only",
        };
      }
    }

    // Check ask rules (medium priority)
    for (const pattern of policy.bash?.ask || []) {
      if (this.matchPattern(cmd, pattern)) {
        return {
          allowed: true,
          rule_matched: `ask: ${pattern}`,
        };
      }
    }

    // Check allow rules
    for (const pattern of policy.bash?.allow || []) {
      if (this.matchPattern(cmd, pattern)) {
        return {
          allowed: true,
          rule_matched: `allow: ${pattern}`,
        };
      }
    }

    // Default: allow in audit-only mode
    return {
      allowed: mode === "audit-only",
      rule_matched: "default",
      would_block: mode !== "audit-only",
    };
  }

  async checkFileAccess(
    scope: string,
    filepath: string,
    operation: "read" | "write"
  ): Promise<PolicyCheckResult> {
    const globalPolicy = await this.loadGlobalPolicy();
    const scopePolicy = await this.loadScopePolicy(scope);
    const policy = this.mergePolicy(globalPolicy, scopePolicy);
    const mode = policy.mode || "audit-only";

    const denyPatterns =
      operation === "read"
        ? policy.files?.read_deny || []
        : policy.files?.write_deny || [];

    for (const pattern of denyPatterns) {
      if (this.matchGlobPattern(filepath, pattern)) {
        return {
          allowed: mode === "audit-only",
          rule_matched: `${operation}_deny: ${pattern}`,
          would_block: mode === "audit-only",
        };
      }
    }

    return {
      allowed: true,
    };
  }

  private matchPattern(cmd: string, pattern: string): boolean {
    // Handle wildcard patterns
    if (pattern === "*") {
      return true;
    }

    // Escape special regex characters except *
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(cmd);
  }

  private matchGlobPattern(filepath: string, pattern: string): boolean {
    // Simple glob matching
    const normalizedPath = filepath.replace(/\\/g, "/");
    const normalizedPattern = pattern.replace(/\\/g, "/");

    // Handle ** for any directory depth
    const regexPattern = normalizedPattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*");

    const regex = new RegExp(`^${regexPattern}$|/${regexPattern}$`, "i");
    return regex.test(normalizedPath);
  }
}
