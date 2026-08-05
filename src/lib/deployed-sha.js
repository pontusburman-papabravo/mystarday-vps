'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHA_FILE = path.join(__dirname, '../../data/deployed-sha');
const REPO_ROOT = path.join(__dirname, '../..');
const SHA_RE = /^[0-9a-f]{40}$/;

/** @type {string|null|undefined} */
let cachedGitHeadSha = undefined;

function readShaFromFile() {
  try {
    const fromFile = fs.readFileSync(SHA_FILE, 'utf8').trim();
    if (SHA_RE.test(fromFile)) {
      return fromFile;
    }
  } catch {
    // file absent in local dev — omit git_sha from health
  }
  return null;
}

function readGitHeadOnce() {
  if (cachedGitHeadSha !== undefined) {
    return cachedGitHeadSha;
  }
  cachedGitHeadSha = null;
  try {
    const sha = execSync('git rev-parse HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (SHA_RE.test(sha)) {
      cachedGitHeadSha = sha;
    }
  } catch {
    // not a git checkout or git unavailable
  }
  return cachedGitHeadSha;
}

/**
 * Deployed git revision for /health and ops verification.
 * Prefers data/deployed-sha (written each deploy), then DEPLOY_SHA env, then git HEAD once at startup.
 */
function readDeployedSha() {
  const fromFile = readShaFromFile();
  if (fromFile) {
    return fromFile;
  }

  const fromEnv = String(process.env.DEPLOY_SHA || '').trim();
  if (SHA_RE.test(fromEnv)) {
    return fromEnv;
  }

  return readGitHeadOnce();
}

module.exports = {
  readDeployedSha,
};
