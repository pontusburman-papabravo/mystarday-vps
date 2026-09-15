'use strict';

/**
 * Ireland / Finland release states. These must not be collapsed.
 *
 * CLOSED_CODE_READY         — may deploy while IE/FI stay closed
 * PREBILLING_MARKET_READY   — product path proven for a later open with billing OFF
 * BILLING_CONFIGURATION_READY — named store/RC evidence (not device, not open)
 * BILLING_READY             — alias of BILLING_CONFIGURATION_READY
 * DEVICE_VERIFIED           — per-platform purchase + restore on physical devices
 * READY_TO_OPEN             — explicit founder/ops approval to flip a market flag
 * PAID_ROLLOUT_READY        — configuration + device + explicit paid-rollout approval
 *
 * Unit tests passing never promotes READY_TO_OPEN or BILLING_READY.
 * Prebilling readiness does not require billing readiness.
 */

const GATE = Object.freeze({
  CLOSED_CODE_READY: 'CLOSED_CODE_READY',
  PREBILLING_MARKET_READY: 'PREBILLING_MARKET_READY',
  BILLING_CONFIGURATION_READY: 'BILLING_CONFIGURATION_READY',
  BILLING_READY: 'BILLING_READY',
  DEVICE_VERIFIED: 'DEVICE_VERIFIED',
  READY_TO_OPEN: 'READY_TO_OPEN',
  PAID_ROLLOUT_READY: 'PAID_ROLLOUT_READY',
});

const VERIFIED = new Set(['VERIFIED EXTERNALLY', 'VERIFIED_EXTERNALLY', 'PASS', 'YES']);

function isVerified(value) {
  return VERIFIED.has(String(value || '').trim());
}

function isApproved(value) {
  return value === true || value === 'true' || value === 'YES';
}

function defaultEvidence() {
  return {
    unit_tests_pass: false,
    code_defaults_markets_closed: true,
    prebilling_code_ready: true,
    public_surfaces_ready: true,
    paid_transition_code_ready: true,
    founder_open_approved_ie: false,
    founder_open_approved_fi: false,
    paid_rollout_approved_ie: false,
    paid_rollout_approved_fi: false,
    apple_iap_ie: 'NOT VERIFIED',
    apple_iap_fi: 'NOT VERIFIED',
    play_named_skus_ie: 'NOT VERIFIED',
    play_named_skus_fi: 'NOT VERIFIED',
    revenuecat: 'BLOCKED',
    ios_purchase_ie: 'NO',
    ios_restore_ie: 'NOT VERIFIED',
    android_purchase_ie: 'MANUAL_VERIFICATION_REQUIRED',
    android_restore_ie: 'NOT VERIFIED',
    ios_purchase_fi: 'NO',
    ios_restore_fi: 'NOT VERIFIED',
    android_purchase_fi: 'MANUAL_VERIFICATION_REQUIRED',
    android_restore_fi: 'NOT VERIFIED',
    /** @deprecated use ios_purchase_* / android_purchase_* — never implies restore */
    android_sandbox_e2e: 'MANUAL_VERIFICATION_REQUIRED',
    /** @deprecated use ios_purchase_* — never implies restore */
    ios_device_ie: 'NO',
    /** @deprecated use ios_purchase_* */
    ios_device_fi: 'NO',
    apple_download_price: 'REVIEW_REQUIRED',
    apple_paid_download_unresolved_p0: true,
  };
}

function deviceEvidenceValue(e, country, platform, action) {
  const cc = String(country || '').toUpperCase();
  const pf = platform === 'android' ? 'android' : 'ios';
  const act = action === 'restore' ? 'restore' : 'purchase';
  const key = `${pf}_${act}_${cc.toLowerCase()}`;
  if (e[key] != null && String(e[key]).trim() !== '') return e[key];
  if (act === 'purchase' && pf === 'ios') {
    const legacy = cc === 'FI' ? e.ios_device_fi : e.ios_device_ie;
    if (legacy != null && String(legacy).trim() !== '') return legacy;
  }
  if (act === 'purchase' && pf === 'android' && cc === 'IE' && e.android_sandbox_e2e != null) {
    return e.android_sandbox_e2e;
  }
  return defaultEvidence()[key];
}

/**
 * @param {object} [evidence]
 * @param {'IE'|'FI'} country
 */
function evaluateCountryReleaseGates(evidence, country) {
  const e = { ...defaultEvidence(), ...(evidence || {}) };
  const cc = String(country || '').toUpperCase();
  const openKey = cc === 'FI' ? 'founder_open_approved_fi' : 'founder_open_approved_ie';
  const paidKey = cc === 'FI' ? 'paid_rollout_approved_fi' : 'paid_rollout_approved_ie';
  const appleIap = cc === 'FI' ? e.apple_iap_fi : e.apple_iap_ie;
  const playSkus = cc === 'FI' ? e.play_named_skus_fi : e.play_named_skus_ie;
  const iosPurchase = deviceEvidenceValue(e, cc, 'ios', 'purchase');
  const iosRestore = deviceEvidenceValue(e, cc, 'ios', 'restore');
  const androidPurchase = deviceEvidenceValue(e, cc, 'android', 'purchase');
  const androidRestore = deviceEvidenceValue(e, cc, 'android', 'restore');

  const closedCodeReady = e.code_defaults_markets_closed === true;
  const prebillingMarketReady = closedCodeReady
    && e.prebilling_code_ready === true
    && e.public_surfaces_ready === true
    && e.paid_transition_code_ready === true;

  const billingConfigurationReady = isVerified(appleIap)
    && isVerified(playSkus)
    && isVerified(e.revenuecat)
    && e.apple_paid_download_unresolved_p0 !== true
    && e.apple_download_price !== 'REVIEW_REQUIRED';

  const deviceVerified = isVerified(iosPurchase)
    && isVerified(iosRestore)
    && isVerified(androidPurchase)
    && isVerified(androidRestore);

  // Explicit ops/founder approval. unit_tests_pass and committed code flags
  // never grant operational open or paid rollout by themselves.
  const readyToOpen = prebillingMarketReady && isApproved(e[openKey]);
  const paidRolloutReady = billingConfigurationReady
    && deviceVerified
    && isApproved(e[paidKey]);

  return {
    country: cc,
    device_evidence: {
      ios_purchase: iosPurchase,
      ios_restore: iosRestore,
      android_purchase: androidPurchase,
      android_restore: androidRestore,
    },
    [GATE.CLOSED_CODE_READY]: closedCodeReady,
    [GATE.PREBILLING_MARKET_READY]: prebillingMarketReady,
    [GATE.BILLING_CONFIGURATION_READY]: billingConfigurationReady,
    [GATE.BILLING_READY]: billingConfigurationReady,
    [GATE.DEVICE_VERIFIED]: deviceVerified,
    [GATE.READY_TO_OPEN]: readyToOpen,
    [GATE.PAID_ROLLOUT_READY]: paidRolloutReady,
    ignored_for_open: ['unit_tests_pass'],
    unit_tests_pass: e.unit_tests_pass === true,
  };
}

function evaluateIeFiReleaseGates(evidence) {
  return {
    IE: evaluateCountryReleaseGates(evidence, 'IE'),
    FI: evaluateCountryReleaseGates(evidence, 'FI'),
  };
}

function loadCommittedEvidence() {
  // Lazy require so tests can pass a fixture without touching disk.
  return require('../../config/ie-fi-release-evidence.json');
}

module.exports = {
  GATE,
  defaultEvidence,
  evaluateCountryReleaseGates,
  evaluateIeFiReleaseGates,
  loadCommittedEvidence,
};
