'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describePaidTransition, PAID_TRANSITION_KINDS } = require('../src/lib/paid-transition');
const {
  evaluateCountryReleaseGates,
  evaluateIeFiReleaseGates,
  loadCommittedEvidence,
} = require('../src/lib/ie-fi-release-gates');

const CUTOFF = '2026-10-15T00:00:00+02:00';
const BEFORE = new Date('2026-10-14T23:59:59+02:00');
const ON = new Date('2026-10-15T00:00:00+02:00');
const AFTER = new Date('2026-10-15T00:00:01+02:00');

describe('paid transition notice', () => {
  it('T1 upcoming before cutoff during prebilling', () => {
    const notice = describePaidTransition({
      accessKind: 'prebilling',
      paymentStartAt: CUTOFF,
      now: BEFORE,
      publicBillingUsable: false,
    });
    assert.equal(notice.kind, PAID_TRANSITION_KINDS.UPCOMING);
    assert.equal(notice.hold_active, false);
  });

  it('hold after cutoff while billing is unusable — clock alone is not a 402', () => {
    for (const now of [ON, AFTER]) {
      const notice = describePaidTransition({
        accessKind: 'prebilling',
        paymentStartAt: CUTOFF,
        now,
        publicBillingUsable: false,
      });
      assert.equal(notice.kind, PAID_TRANSITION_KINDS.HOLD);
      assert.equal(notice.hold_active, true);
    }
  });

  it('T2 paywall only after cutoff and billing usable', () => {
    const notice = describePaidTransition({
      accessKind: 'limited',
      paymentStartAt: CUTOFF,
      now: AFTER,
      publicBillingUsable: true,
    });
    assert.equal(notice.kind, PAID_TRANSITION_KINDS.PAYWALL);
  });

  it('paid, grandfathered, intro year and trial hide transition pressure', () => {
    assert.equal(describePaidTransition({ accessKind: 'paid', paymentStartAt: CUTOFF }).kind, 'none');
    assert.equal(describePaidTransition({ accessKind: 'grandfathered', paymentStartAt: CUTOFF }).kind, 'none');
    assert.equal(describePaidTransition({ accessKind: 'intro_year', paymentStartAt: CUTOFF }).kind, 'none');
    assert.equal(describePaidTransition({ accessKind: 'trial', paymentStartAt: CUTOFF }).kind, 'none');
  });
});

describe('IE/FI release gates cannot be conflated', () => {
  it('committed evidence: IE billing+device yes, open/paid no; FI billing/device no', () => {
    const gates = evaluateIeFiReleaseGates(loadCommittedEvidence());
    assert.equal(gates.IE.CLOSED_CODE_READY, true);
    assert.equal(gates.IE.PREBILLING_MARKET_READY, true);
    assert.equal(gates.IE.BILLING_CONFIGURATION_READY, true);
    assert.equal(gates.IE.BILLING_READY, true);
    assert.equal(gates.IE.DEVICE_VERIFIED, true);
    assert.equal(gates.IE.READY_TO_OPEN, false);
    assert.equal(gates.IE.PAID_ROLLOUT_READY, false);
    assert.equal(gates.IE.device_evidence.ios_purchase, 'PASS');
    assert.equal(gates.IE.device_evidence.ios_restore, 'PASS');
    assert.equal(gates.IE.device_evidence.android_purchase, 'PASS');
    assert.equal(gates.IE.device_evidence.android_restore, 'PASS');
    assert.equal(gates.FI.CLOSED_CODE_READY, true);
    assert.equal(gates.FI.PREBILLING_MARKET_READY, true);
    assert.equal(gates.FI.BILLING_CONFIGURATION_READY, false);
    assert.equal(gates.FI.BILLING_READY, false);
    assert.equal(gates.FI.DEVICE_VERIFIED, false);
    assert.equal(gates.FI.READY_TO_OPEN, false);
    assert.equal(gates.FI.PAID_ROLLOUT_READY, false);
  });

  it('purchase evidence does not imply restore PASS', () => {
    const ie = evaluateCountryReleaseGates({
      ios_purchase_ie: 'YES',
      android_purchase_ie: 'PASS',
      ios_restore_ie: 'NOT VERIFIED',
      android_restore_ie: 'NOT VERIFIED',
    }, 'IE');
    assert.equal(ie.DEVICE_VERIFIED, false);
    const restored = evaluateCountryReleaseGates({
      ios_purchase_ie: 'YES',
      android_purchase_ie: 'PASS',
      ios_restore_ie: 'YES',
      android_restore_ie: 'PASS',
    }, 'IE');
    assert.equal(restored.DEVICE_VERIFIED, true);
  });

  it('unit_tests_pass does not promote READY_TO_OPEN or BILLING_READY', () => {
    const ie = evaluateCountryReleaseGates({
      unit_tests_pass: true,
      code_defaults_markets_closed: true,
      prebilling_code_ready: true,
      public_surfaces_ready: true,
      paid_transition_code_ready: true,
      founder_open_approved_ie: false,
      apple_iap_ie: 'NOT VERIFIED',
      play_named_skus_ie: 'NOT VERIFIED',
      revenuecat: 'BLOCKED',
      ios_purchase_ie: 'NO',
      ios_restore_ie: 'NOT VERIFIED',
      android_purchase_ie: 'MANUAL_VERIFICATION_REQUIRED',
      android_restore_ie: 'NOT VERIFIED',
      apple_paid_download_unresolved_p0: true,
    }, 'IE');
    assert.equal(ie.unit_tests_pass, true);
    assert.equal(ie.READY_TO_OPEN, false);
    assert.equal(ie.BILLING_READY, false);
    assert.equal(ie.PREBILLING_MARKET_READY, true);
  });

  it('prebilling readiness does not require billing readiness', () => {
    const ie = evaluateCountryReleaseGates({
      code_defaults_markets_closed: true,
      prebilling_code_ready: true,
      public_surfaces_ready: true,
      paid_transition_code_ready: true,
      apple_iap_ie: 'NOT VERIFIED',
      revenuecat: 'BLOCKED',
    }, 'IE');
    assert.equal(ie.PREBILLING_MARKET_READY, true);
    assert.equal(ie.BILLING_READY, false);
  });

  it('READY_TO_OPEN requires explicit founder approval even when code is ready', () => {
    const ie = evaluateCountryReleaseGates({
      code_defaults_markets_closed: true,
      prebilling_code_ready: true,
      public_surfaces_ready: true,
      paid_transition_code_ready: true,
      founder_open_approved_ie: true,
    }, 'IE');
    assert.equal(ie.READY_TO_OPEN, true);
    assert.equal(ie.BILLING_READY, false);
    assert.equal(ie.PAID_ROLLOUT_READY, false);
  });

  it('settings UI treats prebilling as launch access, not a store subscription', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/settings-subscription.js'), 'utf8');
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/i18n/settings-en-GB.json'), 'utf8'));
    assert.match(js, /premium\.source === 'prebilling'/);
    assert.match(js, /settings\.subscription\.launchBody/);
    assert.match(en.subscription.launchBody, /A subscription is not required yet/);
    assert.doesNotMatch(js, /Subscribe now/);
  });
});
