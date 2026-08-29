'use strict';

const fs = require('node:fs');
const path = require('node:path');

let cached = null;

function loadReleaseComplianceConfig(repoRoot, { fresh = false } = {}) {
  if (cached && !fresh) return cached;
  const configPath = path.join(repoRoot, 'config/release-compliance-gate.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  cached = JSON.parse(raw);
  return cached;
}

function compileRegexList(patterns, flags = 'i') {
  return (patterns || []).map((p) => new RegExp(p, flags));
}

function matchesAny(value, regexList) {
  return regexList.some((re) => re.test(value));
}

module.exports = { loadReleaseComplianceConfig, compileRegexList, matchesAny };
