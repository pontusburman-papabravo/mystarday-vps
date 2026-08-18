'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('growth feedback loop contracts', () => {
  it('migrations create attribution, feedback, waitlist funnel, flags', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'migrations/1810140000000_family_acquisition_attribution.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'migrations/1810140000001_family_growth_feedback.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'migrations/1810140000002_waitlist_funnel_fields.js')));
    const flags = read('migrations/1810140000003_growth_feedback_loop_flags.js');
    assert.match(flags, /growth_feedback_v1/);
    assert.match(flags, /growth_referral_cta_v1/);
    assert.match(flags, /growth_stuck_cohorts_v1/);
    assert.match(flags, /growth_waitlist_funnel_v1/);
    assert.match(flags, /enabled.*false|VALUES \(\$1, false/);
  });

  it('feedback eligibility module exports journey-aware evaluator', () => {
    const src = read('src/lib/growth-feedback-eligibility.js');
    assert.match(src, /evaluateGrowthFeedbackEligibility/);
    assert.match(src, /no_value_yet/);
    assert.match(src, /schema_no_child_login/);
    assert.match(src, /Blev den här rutinen lite enklare/);
    assert.match(src, /Vad gjorde att ni inte kom vidare/);
  });

  it('referral eligibility blocks before value and during blockers', () => {
    const src = read('src/lib/referral-eligibility.js');
    assert.match(src, /no_value_yet/);
    assert.match(src, /critical_blocker/);
    assert.match(src, /growth_referral_cta_v1/);
  });

  it('GET /api/account/referral is eligibility-gated', () => {
    const src = read('src/routes/account/lifecycle.js');
    assert.match(src, /evaluateReferralEligibility/);
    assert.match(src, /eligible: false/);
    assert.match(src, /referral_shown/);
    assert.match(src, /router\.post\('\/attribution'/);
  });

  it('growth feedback route enforces rate limit + parent auth', () => {
    const src = read('src/routes/growth-feedback.js');
    assert.match(src, /requireParent/);
    assert.match(src, /rateLimit/);
    assert.match(src, /prompt_mismatch|already_answered|eligible/);
  });

  it('admin stuck cohorts exclude QA by default and forbid auto-send', () => {
    const db = read('db/growth-stuck-cohorts.js');
    assert.match(db, /excludeInternalQaWhere/);
    assert.match(db, /autoSendAllowed: false/);
    assert.match(db, /schema_no_child_login/);
    assert.match(db, /completion_no_return/);
    const route = read('src/routes/admin/growth-stuck-cohorts.js');
    assert.doesNotMatch(route, /isActivationFlagEnabled|är avstängd|status\(503\)/);
    assert.match(route, /autoSendAllowed: false/);
  });

  it('admin stuck UI is diagnostics with recommended system help', () => {
    const ui = read('public/admin/admin-growth-stuck.js');
    assert.match(ui, /Diagnostik/);
    assert.match(ui, /recommendedSystemHelp|manualNextStep/);
    assert.match(ui, /openFamilyHub/);
    assert.doesNotMatch(ui, /flagga av/);
    assert.doesNotMatch(ui, /sendEmail|broadcast/i);
  });

  it('analytics allowlist includes growth loop events', () => {
    const src = read('src/routes/analytics.js');
    for (const ev of [
      'referral_shown',
      'referral_copied',
      'referral_landing',
      'growth_feedback_shown',
      'growth_feedback_dismissed',
      'growth_feedback_submitted',
      'system_help_shown',
      'system_help_engaged',
      'system_help_support_requested',
      'system_help_progressed',
      'waitlist_signup',
      'waitlist_account_signup',
    ]) {
      assert.match(src, new RegExp(`'${ev}'`));
    }
  });

  it('client surfaces exist for feedback and gated referral', () => {
    assert.match(read('public/js/growth-feedback.js'), /GrowthFeedback/);
    assert.match(read('public/js/growth-referral-cta.js'), /GrowthReferralCta/);
    assert.match(read('public/dashboard.html'), /growth-feedback\.js/);
    assert.match(read('public/dashboard.html'), /growth-referral-cta\.js/);
  });

  it('client surfaces include report-problem path', () => {
    const client = read('public/js/growth-system-help.js');
    assert.match(client, /Rapportera problem/);
    assert.match(client, /buildTechnicalContext/);
    assert.match(client, /support-request/);
  });

  it('English waitlist sends UTM + consent', () => {
    const client = read('public/js/landing-waitlist.js');
    assert.match(client, /utm_source/);
    assert.match(client, /marketing_consent/);
    assert.match(read('public/en.html'), /waitlistConsent/);
    const api = read('src/routes/public.js');
    assert.match(api, /marketingConsent !== true/);
    assert.match(read('db/waitlist.js'), /linkWaitlistConversion/);
  });

  it('referral-share can load personal URL but defaults to clean register', () => {
    const src = read('public/js/referral-share.js');
    assert.match(src, /REGISTER_URL/);
    assert.match(src, /\/api\/account\/referral/);
    assert.match(src, /buildPayload/);
    assert.match(src, /personalUrl/);
  });

  it('implementation doc exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/GROWTH-FEEDBACK-LOOP-IMPLEMENTATION.md')));
  });
});
