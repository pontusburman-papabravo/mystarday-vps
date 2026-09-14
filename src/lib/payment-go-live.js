'use strict';

/**
 * Sweden paid go-live at payment_start_at (default 1 Oct 2026 00:00 Europe/Stockholm).
 *
 * Does not open IE/FI markets. Does not grandfather anyone — that is payment-settings.
 * Fail-closed: never enables purchases while BILLING_UI_DISABLED or IAP readiness is incomplete.
 * Once applied, this module will not turn payment back on if an admin kill-switches it.
 */

const appSettings = require('../../db/app-settings');
const { envBillingUiDisabled } = require('./billing-ui');
const { envIapPaidRolloutForcedOff } = require('./iap-paid-rollout');
const { getIapReadinessSnapshot } = require('./iap-readiness');
const { getPaymentStartAt, DEFAULT_PAYMENT_START_AT } = require('./payment-settings');
const { appendPaymentAudit } = require('./payment-audit');
const logger = require('./logger');

const PAYMENT_GO_LIVE_ARMED_KEY = 'payment_go_live_armed';
const PAYMENT_GO_LIVE_APPLIED_AT_KEY = 'payment_go_live_applied_at';

/** Founder decision: Sweden paid start is armed unless an admin explicitly disarms. */
const DEFAULT_ARMED = true;

const ACTIONS = Object.freeze({
  WAIT: 'wait',
  APPLY: 'apply',
  ALREADY_APPLIED: 'already_applied',
  ALREADY_LIVE: 'already_live',
  BLOCKED: 'blocked',
});

const READINESS_GAP_KEYS = Object.freeze({
  webhook_auth_not_configured: (r) => !r.webhook_auth_configured,
  app_allowlist_not_configured: (r) => !r.app_allowlist_configured,
  product_allowlist_not_configured: (r) => !r.product_allowlist_configured,
  product_allowlist_mismatch: (r) => !r.product_allowlist_matches_contract,
  entitlement_not_configured: (r) => !r.entitlement_configured,
  ios_public_sdk_missing: (r) => !r.ios_public_sdk_configured,
  android_public_sdk_missing: (r) => !r.android_public_sdk_configured,
});

function settingIsTruthy(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toIso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function secretApiKeyConfigured() {
  return !!(process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_API_KEY);
}

function collectReadinessGaps(iapReadiness) {
  const gaps = [];
  const r = iapReadiness || {};
  for (const [key, pred] of Object.entries(READINESS_GAP_KEYS)) {
    if (pred(r)) gaps.push(key);
  }
  if (!secretApiKeyConfigured()) gaps.push('revenuecat_secret_api_key_missing');
  return gaps;
}

/**
 * Pure decision. Callers supply already-read flags.
 * @param {{
 *   now: Date,
 *   paymentStartAt: Date,
 *   armed: boolean,
 *   appliedAt?: Date|string|null,
 *   paymentEnabled: boolean,
 *   paidRolloutReady: boolean,
 *   billingUiDisabled: boolean,
 *   envPaidRolloutForcedOff: boolean,
 *   missingReadiness?: string[],
 * }} input
 */
function evaluatePaymentGoLive(input) {
  const now = input.now instanceof Date ? input.now : new Date(input.now);
  const paymentStartAt = input.paymentStartAt instanceof Date
    ? input.paymentStartAt
    : new Date(input.paymentStartAt);
  const cutoffAt = toIso(paymentStartAt);
  const blockers = [];

  if (input.appliedAt) {
    return {
      action: ACTIONS.ALREADY_APPLIED,
      blockers,
      cutoffAt,
      msUntil: 0,
    };
  }

  if (!input.armed) blockers.push('not_armed');
  if (input.billingUiDisabled) blockers.push('billing_ui_disabled');
  if (input.envPaidRolloutForcedOff) blockers.push('iap_paid_rollout_env_forced_off');
  for (const gap of input.missingReadiness || []) {
    if (!blockers.includes(gap)) blockers.push(gap);
  }

  if (Number.isNaN(now.getTime()) || Number.isNaN(paymentStartAt.getTime())) {
    blockers.push('invalid_clock');
    return { action: ACTIONS.BLOCKED, blockers, cutoffAt: null, msUntil: 0 };
  }

  const msUntil = paymentStartAt.getTime() - now.getTime();
  if (msUntil > 0) {
    return {
      action: ACTIONS.WAIT,
      blockers,
      cutoffAt,
      msUntil,
    };
  }

  const live =
    input.paymentEnabled === true &&
    input.paidRolloutReady === true &&
    input.billingUiDisabled !== true &&
    input.envPaidRolloutForcedOff !== true;

  if (live) {
    return { action: ACTIONS.ALREADY_LIVE, blockers: [], cutoffAt, msUntil: 0 };
  }

  if (blockers.length > 0) {
    return { action: ACTIONS.BLOCKED, blockers, cutoffAt, msUntil: 0 };
  }

  return { action: ACTIONS.APPLY, blockers: [], cutoffAt, msUntil: 0 };
}

async function getPaymentGoLiveArmed() {
  const raw = await appSettings.getSetting(PAYMENT_GO_LIVE_ARMED_KEY);
  if (raw == null) return DEFAULT_ARMED;
  return settingIsTruthy(raw);
}

async function setPaymentGoLiveArmed(armed) {
  return appSettings.upsertSetting(PAYMENT_GO_LIVE_ARMED_KEY, armed === true);
}

async function getPaymentGoLiveAppliedAt() {
  const raw = await appSettings.getSetting(PAYMENT_GO_LIVE_APPLIED_AT_KEY);
  if (raw == null || raw === '') return null;
  const iso = typeof raw === 'string' ? raw : String(raw);
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function setPaymentGoLiveAppliedAt(isoString) {
  return appSettings.upsertSetting(PAYMENT_GO_LIVE_APPLIED_AT_KEY, isoString);
}

async function readGoLiveInputs(now = new Date()) {
  const [
    paymentStartAt,
    armed,
    appliedAt,
    paymentEnabled,
    paidRolloutReady,
    iap,
  ] = await Promise.all([
    getPaymentStartAt(),
    getPaymentGoLiveArmed(),
    getPaymentGoLiveAppliedAt(),
    appSettings.getPaymentEnabled(),
    appSettings.getIapPaidRolloutReady(),
    getIapReadinessSnapshot(),
  ]);

  return {
    now,
    paymentStartAt,
    armed,
    appliedAt,
    paymentEnabled: !!paymentEnabled,
    paidRolloutReady: !!paidRolloutReady && !envIapPaidRolloutForcedOff(),
    billingUiDisabled: envBillingUiDisabled(),
    envPaidRolloutForcedOff: envIapPaidRolloutForcedOff(),
    missingReadiness: collectReadinessGaps(iap.iap_readiness),
    iap,
  };
}

async function getPaymentGoLiveSnapshot(now = new Date()) {
  const inputs = await readGoLiveInputs(now);
  const decision = evaluatePaymentGoLive(inputs);
  return {
    action: decision.action,
    blockers: decision.blockers,
    cutoff_at: decision.cutoffAt || DEFAULT_PAYMENT_START_AT,
    ms_until: decision.msUntil,
    armed: inputs.armed,
    applied_at: toIso(inputs.appliedAt),
    payment_enabled: inputs.paymentEnabled,
    iap_paid_rollout_ready: inputs.paidRolloutReady,
    billing_ui_disabled: inputs.billingUiDisabled,
    public_billing_would_be_usable:
      inputs.paymentEnabled &&
      !inputs.billingUiDisabled &&
      inputs.paidRolloutReady,
  };
}

async function stampAppliedAt(now) {
  const iso = toIso(now) || new Date().toISOString();
  await setPaymentGoLiveAppliedAt(iso);
  return iso;
}

async function applyPaymentGoLive(now) {
  await appSettings.setPaymentEnabled(true);
  await appSettings.setIapPaidRolloutReady(true);
  const appliedAt = await stampAppliedAt(now);
  try {
    await appendPaymentAudit({
      eventType: 'payment_go_live',
      status: 'applied',
      reason: 'sweden_payment_start_at',
      metadata: {
        cutoff_at: DEFAULT_PAYMENT_START_AT,
        applied_at: appliedAt,
      },
    });
  } catch (err) {
    logger.error({
      msg: 'Payment go-live applied but audit insert failed',
      operation: 'payment.go_live.audit',
      error: err.message,
      applied_at: appliedAt,
    }, err);
  }
  logger.info({
    msg: 'Payment go-live applied',
    operation: 'payment.go_live',
    applied_at: appliedAt,
  });
  return appliedAt;
}

/**
 * Evaluate and, when due and unblocked, flip payment_enabled + iap_paid_rollout_ready.
 * @param {{ now?: Date }} [opts]
 */
async function runPaymentGoLive(opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const inputs = await readGoLiveInputs(now);
  const decision = evaluatePaymentGoLive(inputs);

  if (decision.action === ACTIONS.APPLY) {
    const appliedAt = await applyPaymentGoLive(now);
    return { decision, applied: true, appliedAt };
  }

  if (decision.action === ACTIONS.ALREADY_LIVE && !inputs.appliedAt) {
    const appliedAt = await stampAppliedAt(now);
    logger.info({
      msg: 'Payment go-live stamped (already live)',
      operation: 'payment.go_live',
      applied_at: appliedAt,
    });
    return { decision, applied: false, appliedAt };
  }

  if (decision.action === ACTIONS.BLOCKED) {
    logger.warn({
      msg: 'Payment go-live blocked after cutoff',
      operation: 'payment.go_live',
      blockers: decision.blockers,
      cutoff_at: decision.cutoffAt,
    });
  } else if (decision.action === ACTIONS.WAIT && decision.blockers.length > 0) {
    logger.warn({
      msg: 'Payment go-live waiting but blockers remain',
      operation: 'payment.go_live',
      blockers: decision.blockers,
      ms_until: decision.msUntil,
    });
  }

  return { decision, applied: false, appliedAt: toIso(inputs.appliedAt) };
}

module.exports = {
  ACTIONS,
  DEFAULT_ARMED,
  PAYMENT_GO_LIVE_ARMED_KEY,
  PAYMENT_GO_LIVE_APPLIED_AT_KEY,
  collectReadinessGaps,
  evaluatePaymentGoLive,
  getPaymentGoLiveArmed,
  setPaymentGoLiveArmed,
  getPaymentGoLiveAppliedAt,
  getPaymentGoLiveSnapshot,
  runPaymentGoLive,
  secretApiKeyConfigured,
};
