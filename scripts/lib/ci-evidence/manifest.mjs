import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TEST_FILE_RE = /test\/[^\s'"]+\.test\.js/g;

/**
 * Extract ordered unique test file paths from an npm script command string.
 * @param {string} scriptCommand
 * @returns {string[]}
 */
export function extractTestFilesFromScript(scriptCommand) {
  if (!scriptCommand || typeof scriptCommand !== 'string') return [];
  const matches = scriptCommand.match(TEST_FILE_RE) || [];
  return [...new Set(matches)].sort();
}

/**
 * Canonical SHA-256 of test:gate:unit + test:gate:db file lists from package.json.
 * @param {object} packageJson
 * @returns {{ sha256: string, unit: string[], db: string[] }}
 */
export function computeTestManifest(packageJson) {
  const unit = extractTestFilesFromScript(packageJson?.scripts?.['test:gate:unit']);
  const db = extractTestFilesFromScript(packageJson?.scripts?.['test:gate:db']);
  const canonical = JSON.stringify({ unit, db });
  const sha256 = crypto.createHash('sha256').update(canonical).digest('hex');
  return { sha256, unit, db };
}

/**
 * Load package.json and compute manifest from repo root.
 * @param {string} root
 * @returns {{ sha256: string, unit: string[], db: string[] }}
 */
export function loadTestManifest(root) {
  const pkgPath = path.join(root, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return computeTestManifest(packageJson);
}
