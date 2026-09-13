'use strict';

/**
 * Launch-ready-but-closed markets (IE, FI): verify they can open later via
 * flags alone, and that GATE_DEFAULTS keep them closed.
 *
 * Open-market signup after the lifetime cutoff is intro-year complete even
 * when public billing is off. This check must not require payment_start_at
 * or usable billing for hypothetical IE/FI opens, and must not flip gates.
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

    // Fixture instant only — no committed commercial IE/FI paid-start date.
    // Signup completeness for *open* markets is lifetime/intro-year, not billing.
    // Fail-closed for IE/FI remains GATE_DEFAULTS + marketOpen:false.
    const lifetimeFreeUntil = paymentSettings.DEFAULT_LIFETIME_FREE_UNTIL;
    const fixturePaymentStart = '2026-10-15T00:00:00Z';
    const beforeLifetimeCutoff = new Date('2026-09-13T12:00:00+02:00');
    const afterLifetimeCutoff = new Date('2026-09-14T08:00:00+02:00');
    const afterPaidStart = new Date('2026-10-16T00:00:00Z');

    const closed = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: false,
      publicBillingUsable: true,
      paymentStartAt: fixturePaymentStart,
      lifetimeFreeUntil,
      now: beforeLifetimeCutoff,
    });
    if (closed.allowed) failures.push(`${code} signup allowed while market closed`);

    const closedAfterCutoff = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: false,
      publicBillingUsable: true,
      paymentStartAt: fixturePaymentStart,
      lifetimeFreeUntil,
      now: afterPaidStart,
    });
    if (closedAfterCutoff.allowed) {
      failures.push(`${code} signup allowed while market closed after lifetime cutoff`);
    }

    const openBeforeCutoffNoStart = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: null,
      lifetimeFreeUntil,
      now: beforeLifetimeCutoff,
    });
    if (!openBeforeCutoffNoStart.allowed || openBeforeCutoffNoStart.reason !== 'grandfather_eligible') {
      failures.push(`${code} hypothetical open-market signup before lifetime cutoff must grandfather without billing`);
    }

    const openPrebillingNoBilling = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: fixturePaymentStart,
      lifetimeFreeUntil,
      now: beforeLifetimeCutoff,
    });
    if (!openPrebillingNoBilling.allowed) {
      failures.push(`${code} prebilling signup blocked while billing off — configured launch window must allow signup`);
    }

    const openAfterCutoffNoBilling = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: null,
      lifetimeFreeUntil,
      now: afterLifetimeCutoff,
    });
    if (!openAfterCutoffNoBilling.allowed || openAfterCutoffNoBilling.reason !== 'intro_year') {
      failures.push(`${code} hypothetical open-market signup after lifetime cutoff must use intro year without billing`);
    }

    const openAfterPaidStartNoBilling = invariants.evaluateSignupCompleteness({
      countryCode: code,
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: fixturePaymentStart,
      lifetimeFreeUntil,
      now: afterPaidStart,
    });
    if (!openAfterPaidStartNoBilling.allowed || openAfterPaidStartNoBilling.reason !== 'intro_year') {
      failures.push(`${code} hypothetical open-market signup after payment_start must still allow intro year without billing`);
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
        : 'IE/FI stay closed by default, have live legal/config, and if hypothetically opened allow grandfather/intro-year signup without requiring public billing.',
    evidence: { checks },
  };
}

module.exports = {
  runLaunchReadyMarketChecks,
  checkLaunchReadyClosedMarkets,
};
