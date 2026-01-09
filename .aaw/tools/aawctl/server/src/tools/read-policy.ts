/**
 * read_policy tool implementation
 *
 * Reads and returns the merged policy for a scope.
 */

import { PolicyEngine } from "../policy/engine.js";
import { Logger } from "../logging/logger.js";

const policyEngine = new PolicyEngine();
const logger = new Logger();

interface ReadPolicyParams {
  scope: string;
}

interface ReadPolicyResult {
  scope: string;
  global_policy: object;
  scope_policy: object | null;
  merged_policy: object;
  mode: string;
}

export async function readPolicy(
  params: ReadPolicyParams
): Promise<ReadPolicyResult> {
  const { scope } = params;

  logger.log("read_policy", { scope });

  const globalPolicy = await policyEngine.loadGlobalPolicy();
  const scopePolicy = await policyEngine.loadScopePolicy(scope);
  const mergedPolicy = policyEngine.mergePolicy(globalPolicy, scopePolicy);

  return {
    scope,
    global_policy: globalPolicy,
    scope_policy: scopePolicy,
    merged_policy: mergedPolicy,
    mode: mergedPolicy.mode || "audit-only",
  };
}
