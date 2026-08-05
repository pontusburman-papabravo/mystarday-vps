'use strict';

/**
 * R0-06 — allowlisted support clipboard payload (no PII/secrets).
 */

const { cacheName } = require('../../config/cache-version.json');
const { readDeployedSha } = require('./deployed-sha');

/** Keep in sync with GET /health `version`. */
const APP_DISPLAY_VERSION = '2.3.1';

const ALLOWED_KEYS = [
  'schema_version',
  'app_version',
  'cache_version',
  'git_sha',
  'platform',
  'device_mode',
  'locale',
  'viewport',
  'correlation_id',
  'sw_controller',
  'generated_at',
];

const FORBIDDEN_KEY_PATTERNS = [
  /password/i,
  /pin/i,
  /token/i,
  /secret/i,
  /email/i,
  /jwt/i,
  /authorization/i,
  /cookie/i,
  /barnnamn/i,
  /child_name/i,
  /family_id/i,
  /parent_id/i,
];

function buildServerDiagnostics(req) {
  const gitSha = readDeployedSha();
  return {
    schema_version: '1',
    app_version: APP_DISPLAY_VERSION,
    cache_version: cacheName,
    git_sha: gitSha || null,
    correlation_id: req.id || null,
    generated_at: new Date().toISOString(),
  };
}

function mergeClientDiagnostics(server, client) {
  const merged = { ...server };
  if (client && typeof client === 'object') {
    if (client.platform) merged.platform = String(client.platform).slice(0, 32);
    if (client.device_mode) merged.device_mode = String(client.device_mode).slice(0, 16);
    if (client.locale) merged.locale = String(client.locale).slice(0, 16);
    if (client.viewport) merged.viewport = String(client.viewport).slice(0, 24);
    if (client.sw_controller) merged.sw_controller = String(client.sw_controller).slice(0, 120);
  }
  return merged;
}

function assertAllowlistedPayload(obj) {
  const keys = Object.keys(obj || {});
  for (const key of keys) {
    if (!ALLOWED_KEYS.includes(key)) {
      throw new Error(`support diagnostics disallowed key: ${key}`);
    }
    for (const pat of FORBIDDEN_KEY_PATTERNS) {
      if (pat.test(key)) {
        throw new Error(`support diagnostics forbidden key pattern: ${key}`);
      }
    }
  }
  for (const [key, value] of Object.entries(obj || {})) {
    if (value == null) continue;
    const s = String(value);
    if (s.includes('@') && key !== 'sw_controller') {
      throw new Error(`support diagnostics value looks like email in ${key}`);
    }
  }
}

function formatClipboardText(payload) {
  assertAllowlistedPayload(payload);
  return ALLOWED_KEYS.filter((k) => payload[k] != null && payload[k] !== '')
    .map((k) => `${k}=${payload[k]}`)
    .join('\n');
}

module.exports = {
  ALLOWED_KEYS,
  APP_DISPLAY_VERSION,
  buildServerDiagnostics,
  mergeClientDiagnostics,
  assertAllowlistedPayload,
  formatClipboardText,
};
