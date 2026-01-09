#!/usr/bin/env node
// AAW Profile Composer - Merges governance profiles at DevContainer startup

const fs = require('fs');
const path = require('path');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');
const PRESETS_DIR = path.join(__dirname, '..', 'presets');
const MANIFEST_FILE = '.aaw-profile.json';

/**
 * Load profile with inheritance resolution
 * @param {string} profilePath - Profile path (e.g., "languages/typescript")
 * @param {Set<string>} [ancestors] - Ancestor chain for circular detection
 * @returns {object} Resolved profile with inheritance applied
 */
function loadProfile(profilePath, ancestors = new Set()) {
  // Circular inheritance detection
  if (ancestors.has(profilePath)) {
    const chain = [...ancestors, profilePath].join(' -> ');
    throw new Error(`Circular inheritance detected: ${chain}`);
  }

  const fullPath = path.join(PROFILES_DIR, `${profilePath}.json`);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Profile not found: ${profilePath}`);
  }

  const profile = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  // Resolve inheritance with ancestor tracking
  if (profile.extends) {
    const newAncestors = new Set(ancestors);
    newAncestors.add(profilePath);
    const parent = loadProfile(profile.extends, newAncestors);
    return mergeProfiles(parent, profile);
  }

  return profile;
}

/**
 * Collect all profiles in inheritance chain
 * @param {string} profilePath - Profile path
 * @returns {string[]} List of all profile paths in chain (leaf to root)
 */
function getInheritanceChain(profilePath) {
  const chain = [profilePath];
  const fullPath = path.join(PROFILES_DIR, `${profilePath}.json`);

  if (!fs.existsSync(fullPath)) return chain;

  const profile = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (profile.extends) {
    chain.push(...getInheritanceChain(profile.extends));
  }

  return chain;
}

/**
 * Merge two profiles (arrays accumulate, objects override)
 */
function mergeProfiles(base, overlay) {
  const result = JSON.parse(JSON.stringify(base));

  // Merge permissions (arrays accumulate)
  if (overlay.permissions) {
    result.permissions = result.permissions || {};

    ['deny', 'ask', 'allow'].forEach(key => {
      if (overlay.permissions[key]) {
        result.permissions[key] = [...new Set([
          ...(result.permissions[key] || []),
          ...overlay.permissions[key]
        ])];
      }
    });

    // Other permission props override
    Object.keys(overlay.permissions).forEach(key => {
      if (!['deny', 'ask', 'allow'].includes(key)) {
        result.permissions[key] = overlay.permissions[key];
      }
    });
  }

  // Merge hooks (accumulate per event)
  if (overlay.hooks) {
    result.hooks = result.hooks || {};
    Object.entries(overlay.hooks).forEach(([event, hooks]) => {
      result.hooks[event] = [...(result.hooks[event] || []), ...hooks];
    });
  }

  // Merge MCP servers (accumulate)
  ['allowedMcpServers', 'deniedMcpServers'].forEach(key => {
    if (overlay[key]) {
      result[key] = [...(result[key] || []), ...overlay[key]];
    }
  });

  // Other props override
  Object.keys(overlay).forEach(key => {
    if (!['permissions', 'hooks', 'allowedMcpServers', 'deniedMcpServers', 'extends'].includes(key)) {
      result[key] = overlay[key];
    }
  });

  return result;
}

/**
 * Load preset configuration
 */
function loadPreset(presetName) {
  const presetPath = path.join(PRESETS_DIR, `${presetName}.json`);
  if (!fs.existsSync(presetPath)) {
    throw new Error(`Preset not found: ${presetName}`);
  }
  return JSON.parse(fs.readFileSync(presetPath, 'utf8'));
}

/**
 * Compose final config from manifest
 * Handles deduplication: if profile A extends B, and both are listed,
 * B is skipped since A already includes it.
 */
function composeFromManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  let profiles = manifest.preset
    ? loadPreset(manifest.preset).profiles
    : manifest.profiles || [];

  // Build set of all profiles that will be loaded via inheritance
  // to avoid loading the same profile twice
  const allIncluded = new Set();
  profiles.forEach(p => {
    getInheritanceChain(p).forEach(dep => allIncluded.add(dep));
  });

  // Filter to only leaf profiles (those not inherited by others in the list)
  const leafProfiles = profiles.filter(p => {
    // Check if any other profile in the list inherits from this one
    return !profiles.some(other => {
      if (other === p) return false;
      const chain = getInheritanceChain(other);
      return chain.includes(p);
    });
  });

  // Merge only leaf profiles (they include their ancestors)
  let result = {};
  leafProfiles.forEach(p => {
    const profile = loadProfile(p);
    result = Object.keys(result).length ? mergeProfiles(result, profile) : profile;
  });

  // Add cloud profile if specified
  if (manifest.cloud) {
    result = mergeProfiles(result, loadProfile(`cloud/${manifest.cloud}`));
  }

  // Apply project overrides
  if (manifest.overrides) {
    result = mergeProfiles(result, manifest.overrides);
  }

  // Clean profile-only properties
  delete result.extends;
  delete result.name;
  delete result.description;
  delete result.$schema;

  return result;
}

/**
 * Deduplicate array of objects by key
 */
function dedupeByKey(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Convert to managed-settings.json format
 */
function toManagedSettings(composed) {
  // Deduplicate MCP servers
  const allowedMcp = dedupeByKey(
    composed.allowedMcpServers || [],
    s => s.serverName || s.serverUrl || JSON.stringify(s)
  );
  const deniedMcp = dedupeByKey(
    composed.deniedMcpServers || [],
    s => s.serverUrl || s.serverName || JSON.stringify(s)
  );

  return {
    permissions: {
      disableBypassPermissionsMode: composed.permissions?.disableBypassPermissionsMode || "disable",
      deny: composed.permissions?.deny || []
    },
    allowManagedHooksOnly: composed.allowManagedHooksOnly ?? true,
    strictKnownMarketplaces: composed.strictKnownMarketplaces ?? true,
    allowedMcpServers: allowedMcp,
    deniedMcpServers: deniedMcp
  };
}

/**
 * Convert to settings.json format (for merging)
 */
function toSettingsJson(composed) {
  // Deduplicate hooks by matcher + first hook command
  const hooks = {};
  if (composed.hooks) {
    Object.entries(composed.hooks).forEach(([event, hookList]) => {
      hooks[event] = dedupeByKey(hookList, h => {
        const cmd = h.hooks?.[0]?.command || '';
        return `${h.matcher || ''}|${cmd}`;
      });
    });
  }

  return {
    permissions: {
      allow: composed.permissions?.allow || [],
      ask: composed.permissions?.ask || [],
      deny: composed.permissions?.deny || []
    },
    hooks,
    sandbox: composed.sandbox || { enabled: true }
  };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const workspaceDir = args[0] || process.cwd();
  const outputFormat = args[1] || 'both'; // 'managed', 'settings', or 'both'
  const manifestPath = path.join(workspaceDir, MANIFEST_FILE);

  // Use default if no manifest
  if (!fs.existsSync(manifestPath)) {
    console.error(`[compose] No ${MANIFEST_FILE} found, using security-core...`);
    const defaultProfile = loadProfile('base/security-core');
    if (outputFormat === 'managed') {
      console.log(JSON.stringify(toManagedSettings(defaultProfile), null, 2));
    } else if (outputFormat === 'settings') {
      console.log(JSON.stringify(toSettingsJson(defaultProfile), null, 2));
    } else {
      console.log('=== managed-settings.json ===');
      console.log(JSON.stringify(toManagedSettings(defaultProfile), null, 2));
      console.log('\n=== settings.json ===');
      console.log(JSON.stringify(toSettingsJson(defaultProfile), null, 2));
    }
    process.exit(0);
  }

  try {
    const composed = composeFromManifest(manifestPath);

    if (outputFormat === 'managed') {
      // Clean JSON output (no headers)
      console.log(JSON.stringify(toManagedSettings(composed), null, 2));
    } else if (outputFormat === 'settings') {
      // Clean JSON output (no headers)
      console.log(JSON.stringify(toSettingsJson(composed), null, 2));
    } else {
      // Both with headers
      console.log('=== managed-settings.json ===');
      console.log(JSON.stringify(toManagedSettings(composed), null, 2));
      console.log('\n=== settings.json ===');
      console.log(JSON.stringify(toSettingsJson(composed), null, 2));
    }
  } catch (err) {
    console.error('[compose] Error:', err.message);
    process.exit(1);
  }
}

module.exports = {
  loadProfile,
  mergeProfiles,
  loadPreset,
  composeFromManifest,
  toManagedSettings,
  toSettingsJson,
  dedupeByKey,
  getInheritanceChain
};
