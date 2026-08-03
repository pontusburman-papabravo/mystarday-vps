/**
 * Post-deploy release identity checks (SHA + cache) from the deployed tree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  assertExactHealthSha,
  assertExactCacheName,
  parseActiveCacheName,
} = require('../../lib/rc1-release-identity.js');

/**
 * @param {string} appRoot
 */
export function readExpectedCacheNameFromRepo(appRoot) {
  const cachePath = path.join(appRoot, 'config', 'cache-version.json');
  if (!fs.existsSync(cachePath)) {
    throw new Error('CACHE_VERSION_FILE_MISSING');
  }
  const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const name = parsed?.cacheName || parsed?.CACHE_NAME;
  if (!name || typeof name !== 'string') {
    throw new Error('CACHE_VERSION_INVALID');
  }
  return name.trim();
}

/**
 * @param {string} swText
 */
export function readActiveCacheFromSw(swText) {
  return parseActiveCacheName(swText);
}

/**
 * @param {{
 *   healthJson: object,
 *   expectedSha: string,
 *   expectedCache: string,
 *   swText?: string,
 * }} input
 */
export function verifyDeployReleaseIdentity(input) {
  assertExactHealthSha(input.healthJson, input.expectedSha);
  if (input.healthJson.cache_version !== input.expectedCache) {
    const err = new Error(
      `Deploy release identity: cache_version mismatch (expected ${input.expectedCache}, got ${input.healthJson.cache_version || 'missing'})`
    );
    err.code = 'DEPLOY_IDENTITY_CACHE_MISMATCH';
    throw err;
  }
  if (input.swText != null) {
    assertExactCacheName(input.swText, input.expectedCache);
  }
  return { ok: true };
}

export { assertExactHealthSha, assertExactCacheName, parseActiveCacheName };
