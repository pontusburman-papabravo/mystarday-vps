'use strict';

/**
 * CHECK D — Language/market consistency.
 *
 * Verifies advertised languages actually exist as locale files, and that
 * the market-registration gate defaults match what we currently claim we
 * ship (config/release-compliance-gate.json → expectedLiveMarketCountryCodes).
 *
 * Update expectedLiveMarketCountryCodes (not this file) when a new market
 * goes live — that is the single tunable knob this check depends on.
 */

const { createRequire } = require('node:module');
const path = require('node:path');
const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { fileExists } = require('./fs-utils.cjs');

function loadRepoModule(repoRoot, relPath) {
  const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
  return requireFromRepo(path.join(repoRoot, relPath));
}

function checkLocaleFilesExist(repoRoot, config) {
  const files = config.localeFiles || [];
  const missing = files.filter((f) => !fileExists(repoRoot, f));
  return {
    id: 'locale_files_exist',
    status: missing.length ? STATUS.FAIL : STATUS.PASS,
    evidence: { expected: files, missing },
  };
}

function checkMarketGateDefaults(repoRoot, config) {
  let marketRegion;
  try {
    marketRegion = loadRepoModule(repoRoot, 'src/lib/market-region.js');
  } catch (err) {
    return { id: 'market_gate_defaults', status: STATUS.MANUAL_REVIEW_REQUIRED, evidence: { error: err.message } };
  }
  const defaults = marketRegion.GATE_DEFAULTS || {};
  const openCountryGates = Object.entries(defaults)
    .filter(([key, open]) => open && key.startsWith('market_') && key.endsWith('_open'))
    .map(([key]) => key.replace(/^market_/, '').replace(/_open$/, '').toUpperCase());

  const expected = (config.expectedLiveMarketCountryCodes || []).map((c) => c.toUpperCase());
  const unexpectedOpen = openCountryGates.filter((c) => c !== 'OTHER' && !expected.includes(c));
  const expectedButClosed = expected.filter((c) => !openCountryGates.includes(c));

  const status = unexpectedOpen.length || expectedButClosed.length ? STATUS.FAIL : STATUS.PASS;
  return {
    id: 'market_gate_defaults',
    status,
    evidence: { openByDefault: openCountryGates, expectedLive: expected, unexpectedOpen, expectedButClosed },
  };
}

function checkClosedMarketMessagesTranslated(repoRoot, config) {
  const { readFileSafe } = require('./fs-utils.cjs');
  const results = [];
  for (const localeFile of config.localeFiles || []) {
    const raw = readFileSafe(repoRoot, localeFile);
    if (raw == null) {
      results.push({ localeFile, status: STATUS.FAIL, reason: 'file_missing' });
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      results.push({ localeFile, status: STATUS.FAIL, reason: 'invalid_json' });
      continue;
    }
    const hasMarketClosedKeys = JSON.stringify(parsed).includes('marketClosed') || JSON.stringify(parsed).includes('MARKET_') ;
    results.push({
      localeFile,
      status: hasMarketClosedKeys ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED,
      reason: hasMarketClosedKeys ? 'market_closed_copy_present' : 'no_market_closed_keys_found_verify_manually',
    });
  }
  const status = worstStatus(results.map((r) => r.status));
  return { id: 'closed_market_messages_translated', status, evidence: { results } };
}

function runMarketConsistencyChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const checks = [
    checkLocaleFilesExist(repoRoot, config),
    checkMarketGateDefaults(repoRoot, config),
    checkClosedMarketMessagesTranslated(repoRoot, config),
  ];
  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'D_language_market_consistency',
    title: 'D — Language / market consistency',
    status,
    summary:
      status === STATUS.FAIL
        ? 'A market is open (or expected-open-but-closed) that does not match expectedLiveMarketCountryCodes, or a locale file is missing.'
        : status === STATUS.MANUAL_REVIEW_REQUIRED
          ? 'Automated locale/market checks pass; some copy consistency needs a human read-through.'
          : 'Advertised languages exist on disk and market-registration gate defaults match the documented live-market list.',
    evidence: { checks },
  };
}

module.exports = { runMarketConsistencyChecks, checkLocaleFilesExist, checkMarketGateDefaults };
