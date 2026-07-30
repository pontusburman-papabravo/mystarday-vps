'use strict';

const fs = require('fs');
const path = require('path');

const SHA_FILE = path.join(__dirname, '../../data/deployed-sha');
const SHA_RE = /^[0-9a-f]{40}$/;

/**
 * Deployed git revision for /health and ops verification.
 * Prefers DEPLOY_SHA env, then data/deployed-sha written by vps-deploy-revision.sh.
 */
function readDeployedSha() {
  const fromEnv = String(process.env.DEPLOY_SHA || '').trim();
  if (SHA_RE.test(fromEnv)) {
    return fromEnv;
  }

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

module.exports = {
  readDeployedSha,
};
