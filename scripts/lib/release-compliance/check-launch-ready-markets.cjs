'use strict';

/**
 * Launch-ready-but-closed markets (IE, FI): verify they can open later via
 * flags alone, and that GATE_DEFAULTS keep them closed.
 */

const path = require('node:path');
const { createRequire } = require('node:module');
const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { readFileSafe } = require('./fs-utils.cjs');

function loadRepoModule(repoRoot, relPath) {
  const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
  return requireFromRepo(path.join(repoRoot, relPath));
}

function checkLaunchReadyClosedMarkets(repoRoot, config) {
  const codes = config.launchReadyClosedCountryCodes || [];
  if (!codes.length) {
    return { id: 'launch_ready_closed_markets', status: STATUS.PASS, evidence: { skipped: true } };
  }

  let marketRegion;
  let marketConfig;
  let legalRouting;
  let invariants;
  let paymentSettings;
  try {
    marketRegion = loadRepoModule(repoRoot, 'src/lib/market-region.js');
    marketConfig = loadRepoModule(repoRoot, 'src/lib/market-config.js');
    legalRouting = loadRepoModule(repoRoot, 'src/lib/legal-routing.js');
    invariants = loadRepoModule(repoRoot, 'src/lib/market-launch-invariants.js');
    paymentSettings = loadRepoModule(repoRoot, 'src/lib/payment-settings.js');
  } catch (err) {
    return { id: 'launch_ready_closed_markets', status: STATUS.FAIL, evidence: { error: err.message } };
  }

  const failures = [];
  const evidence = [];

  if (typeof invariants.evaluateSignupCompleteness !== 'function') {
    failures.push('evaluateSignupCompleteness missing');
  }

  for (const code of codes) {
    const gateKey = marketRegion.gateKeyForCountry(code);
    const gateDefault = marketRegion.GATE_DEFAULTS[gateKey];
    if (gateDefault !== false) {
      failures.push(`${code} GATE_DEFAULTS[${gateKey}] is not false`);
    }

    const cfg = marketConfig.getMarketConfig({
      countryCode: code,
      locale: code === 'FI' ? 'sv-SE' : 'en-GB',
    });
    if (cfg.currency !== 'EUR') failures.push(`${code} currency is ${cfg.currency}, expected EUR`);
    if (!cfg.localeSupported) failures.push(`${code} localeSupported is false`);
    if (code === 'IE' && cfg.defaultLocale !== 'en-GB') {
      failures.push('IE defaultLocale must be en-GB');
    }
    if (code === 'FI' && cfg.defaultLocale !== 'sv-SE') {
      failures.push('FI defaultLocale must be sv-SE (Swedish-speaking market)');
    }
    if (code === 'IE' && cfg.timezone !== 'Europe/Dublin') {
      failures.push('IE timezone must be Europe/Dublin');
    }
    if (code === 'FI' && cfg.timezone !== 'Europe/Helsinki') {
      failures.push('FI timezone must be Europe/Helsinki');
    }

    const legal = legalRouting.resolveLegalRoutes({
      countryCode: code,
      marketRegion: 'EU',
      locale: cfg.defaultLocale,
    });
    if (legal.status !== 'live') {
      failures.push(`${code} legal status is ${legal.status}, expected live`);
    }

    const countryPaymentStart = paymentSettings.DEFAULT_PREBILLING_PAYMENT_START_AT;
    const beforePaidStart = new Date('2026-09-01T00:00:00+02:00');
    const afterPaidStart = new Date('2026-10-20T00:00:00+02:00');

    const closed = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: false,
      publicBillingUsable: true,
      paymentStartAt: countryPaymentStart,
      now: beforePaidStart,
    });
    if (closed.allowed) failures.push(`${code} signup allowed while market closed`);

    const openPrebillingNoBilling = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: countryPaymentStart,
      now: beforePaidStart,
    });
    if (!openPrebillingNoBilling.allowed) {
      failures.push(`${code} prebilling signup blocked while billing off — launch window must allow signup`);
    }

    const openAfterPaidStartNoBilling = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: countryPaymentStart,
      now: afterPaidStart,
    });
    if (openAfterPaidStartNoBilling.allowed) {
      failures.push(`${code} signup allowed after payment_start while billing unusable`);
    }

    evidence.push({
      code,
      gateKey,
      gateDefault,
      timezone: cfg.timezone,
      currency: cfg.currency,
      defaultLocale: cfg.defaultLocale,
      legalStatus: legal.status,
    });
  }

  const enPrivacy = readFileSafe(repoRoot, 'public/en/eea-privacy.html') || '';
  const enTerms = readFileSafe(repoRoot, 'public/en/eea-terms.html') || '';
  if (/not externally legally verified/i.test(enPrivacy + enTerms)) {
    failures.push('public EEA legal pages still contain internal verification disclaimer');
  }

  return {
    id: 'launch_ready_closed_markets',
    status: failures.length ? STATUS.FAIL : STATUS.PASS,
    evidence: { markets: evidence, failures },
  };
}

function runLaunchReadyMarketChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const checks = [checkLaunchReadyClosedMarkets(repoRoot, config)];
  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'D2_launch_ready_closed_markets',
    title: 'D2 — Launch-ready closed markets (IE/FI)',
    status,
    summary:
      status === STATUS.FAIL
        ? 'IE/FI are not launch-ready-but-closed, or a gate default would open them unexpectedly.'
        : 'IE/FI stay closed by default, have live legal/config, allow prebilling signup, and block post-cutoff signup without billing.',
    evidence: { checks },
  };
}

module.exports = {
  runLaunchReadyMarketChecks,
  checkLaunchReadyClosedMarkets,
};
