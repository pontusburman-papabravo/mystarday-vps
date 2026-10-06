'use strict';

/**
 * Swedish /resurser consolidation.
 * Source of truth: config/resurser-seo-decisions.csv
 * 17 keep (indexable) · 26 redirect · 83 noindex,follow.
 * PDF binaries are not rows in the decision table.
 */

const fs = require('fs');
const path = require('path');

const EXPECTED = { keep: 17, redirect: 26, noindex: 83 };

function loadDecisions() {
  const file = path.join(__dirname, 'resurser-seo-decisions.csv');
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const header = lines.shift().split(',');
  if (header.join(',') !== 'path,decision,owner') {
    throw new Error('resurser-seo-decisions.csv header must be path,decision,owner');
  }
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const [urlPath, decision, owner = ''] = line.split(',');
    rows.push({ path: urlPath, decision, owner });
  }
  return rows;
}

const ROWS = loadDecisions();
const BY_PATH = new Map(ROWS.map((row) => [row.path, row]));
const REDIRECTS = new Map();

for (const row of ROWS) {
  if (row.decision === 'redirect') REDIRECTS.set(row.path, row.owner);
}

function assertDecisionTable() {
  const counts = { keep: 0, redirect: 0, noindex: 0 };
  const seen = new Set();
  for (const row of ROWS) {
    if (seen.has(row.path)) throw new Error(`duplicate resurser decision for ${row.path}`);
    seen.add(row.path);
    if (!Object.prototype.hasOwnProperty.call(counts, row.decision)) {
      throw new Error(`unknown resurser decision ${row.decision} for ${row.path}`);
    }
    counts[row.decision] += 1;
    if (row.decision === 'redirect') {
      if (!row.owner || row.owner === row.path) {
        throw new Error(`redirect ${row.path} needs a different owner`);
      }
      if (REDIRECTS.has(row.owner)) {
        throw new Error(`redirect chain ${row.path} → ${row.owner} → ${REDIRECTS.get(row.owner)}`);
      }
    }
  }
  for (const key of Object.keys(EXPECTED)) {
    if (counts[key] !== EXPECTED[key]) {
      throw new Error(`resurser ${key} count ${counts[key]}, expected ${EXPECTED[key]}`);
    }
  }
}

assertDecisionTable();

function resurserDecision(urlPath) {
  const row = BY_PATH.get(urlPath);
  return row ? row.decision : null;
}

/** Final path when this URL is a consolidation redirect. Null otherwise. */
function resurserRedirectTarget(urlPath) {
  return REDIRECTS.get(urlPath) || null;
}

function isResurserIndexable(urlPath) {
  return resurserDecision(urlPath) === 'keep';
}

/** Swedish HTML that still answers 200 on .se (keep + noindex). Not a redirect. */
function isHostedSwedishResurserDocument(urlPath) {
  const decision = resurserDecision(urlPath);
  return decision === 'keep' || decision === 'noindex';
}

module.exports = {
  RESURSER_DECISION_ROWS: ROWS,
  resurserDecision,
  resurserRedirectTarget,
  isResurserIndexable,
  isHostedSwedishResurserDocument,
};
