'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeAttributionInput,
  toAnalyticsMetadata,
  FIELD_LIMITS,
  STORED_FIELD_ALLOWLIST,
} = require('../src/lib/acquisition-attribution');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('growth attribution hardening', () => {
  it('strips HTML/script and rejects email/UUID/SQL-like secrets in UTM fields', () => {
    const n = normalizeAttributionInput({
      utm_source: '<script>alert(1)</script>meta',
      utm_medium: 'user@evil.example',
      utm_campaign: '11111111-2222-4333-8555-666666666666',
      utm_content: "'; DROP TABLE family;--",
      utm_term: 'javascript:alert(1)',
      platform: 'web',
      landing_locale: 'sv-SE',
    });
    assert.ok(n);
    assert.equal(n.source, 'meta');
    assert.equal(n.medium, null);
    assert.equal(n.campaign, null);
    assert.equal(n.term, null);
    assert.ok(!/<script/i.test(n.content || ''));
  });

  it('rejects arrays/objects and unknown nested mass-assignment', () => {
    assert.equal(normalizeAttributionInput(['utm_source']), null);
    assert.equal(normalizeAttributionInput('meta'), null);
    const n = normalizeAttributionInput({
      utm_source: { nested: 'nope' },
      platform: 'web',
      evil_admin: true,
      family_id: 'should-never-store',
    });
    assert.equal(n.source, 'direct');
    assert.equal(n.platform, 'web');
    assert.equal(n.family_id, undefined);
    assert.equal(toAnalyticsMetadata(n).family_id, undefined);
  });

  it('handles null/empty/unicode/extreme length without throwing', () => {
    assert.equal(normalizeAttributionInput({ utm_source: null, utm_medium: '' }), null);
    const uni = normalizeAttributionInput({
      utm_source: 'sök-annonser-åäö',
      utm_campaign: '🌟'.repeat(200),
      platform: 'android',
    });
    assert.equal(uni.source, 'sök-annonser-åäö');
    assert.equal(uni.campaign.length, FIELD_LIMITS.campaign);
    assert.equal(uni.platform, 'android');
  });

  it('documents durable allowlist (no landing path / tokens / email)', () => {
    assert.deepEqual(
      [...STORED_FIELD_ALLOWLIST].sort(),
      [
        'campaign',
        'content',
        'first_touch_at',
        'landing_locale',
        'medium',
        'platform',
        'referral_code',
        'registered_at',
        'source',
        'term',
      ]
    );
    const src = read('src/lib/acquisition-attribution.js');
    assert.match(src, /No raw URLs|no raw URLs|looksSecret/i);
    assert.doesNotMatch(src, /landing_path|landing_url|fbclid/);
  });

  it('first-touch upsert SQL never overwrites existing non-null source', () => {
    const sql = read('db/family-acquisition-attribution.js');
    assert.match(sql, /ON CONFLICT \(family_id\) DO UPDATE/);
    assert.match(sql, /source = COALESCE\(family_acquisition_attribution\.source, EXCLUDED\.source\)/);
    assert.match(sql, /referral_code = COALESCE\(family_acquisition_attribution\.referral_code/);
  });
});

describe('growth feedback / referral authority', () => {
  it('onboarding incomplete matches stuck-cohort family semantics (any parent done = not stuck)', () => {
    const elig = read('src/lib/growth-feedback-eligibility.js');
    assert.match(elig, /NOT EXISTS/);
    assert.match(elig, /onboarding_completed[\s\S]*true/);
    const stuck = read('db/growth-stuck-cohorts.js');
    assert.match(stuck, /BOOL_OR\(p\.onboarding_completed\)/);
  });

  it('proven value uses activation state + first_success milestone only', () => {
    const elig = read('src/lib/growth-feedback-eligibility.js');
    const ref = read('src/lib/referral-eligibility.js');
    for (const src of [elig, ref]) {
      assert.match(src, /first_completion_at/);
      assert.match(src, /p0_activated_at|has_p0/);
      assert.match(src, /first_success/);
      assert.doesNotMatch(src, /activated_families_custom|custom_activation_score/);
    }
    assert.match(elig, /getFamilyCommunicationState/);
  });

  it('POST feedback cannot bypass flag via account_delete', () => {
    const route = read('src/routes/growth-feedback.js');
    assert.match(route, /if \(!eligibility\.eligible\)/);
    assert.doesNotMatch(
      route,
      /!eligibility\.eligible && body\.prompt_key !== 'account_delete'/
    );
  });

  it('eligible GET does not spam growth_feedback_shown', () => {
    const route = read('src/routes/growth-feedback.js');
    assert.doesNotMatch(route, /growth_feedback_shown/);
    const client = read('public/js/growth-feedback.js');
    assert.match(client, /growth_feedback_shown/);
    assert.match(client, /msd_growth_feedback_shown/);
    assert.match(client, /msd_growth_feedback_dismissed/);
    assert.match(client, /localStorage/);
  });

  it('referral CTA requires both referral_program and growth_referral_cta_v1', () => {
    const src = read('src/lib/referral-eligibility.js');
    assert.match(src, /referral_program_off/);
    assert.match(src, /growth_referral_cta_off/);
    assert.match(src, /critical_blocker/);
    assert.match(src, /no_value_yet/);
  });

  it('self-referral blocked when referrer family matches', () => {
    const life = read('src/routes/account/lifecycle.js');
    assert.match(life, /referrer\.family_id !== req\.user\.familyId/);
  });
});

describe('stuck cohorts + waitlist consent', () => {
  it('stuck cohort preview forbids auto-send and excludes QA by default', () => {
    const db = read('db/growth-stuck-cohorts.js');
    assert.match(db, /autoSendAllowed: false/);
    assert.match(db, /excludeInternalQaWhere/);
    assert.match(db, /f\.archived_at IS NULL/);
    assert.match(db, /48/);
    assert.match(db, /14/);
    const route = read('src/routes/admin/growth-stuck-cohorts.js');
    assert.match(route, /growth_stuck_cohorts_v1/);
    assert.doesNotMatch(route, /sendEmail|resend|broadcast/i);
  });

  it('waitlist requires explicit consent + stores consent timestamp/version', () => {
    const mig = read('migrations/1810140000002_waitlist_funnel_fields.js');
    assert.match(mig, /marketing_consent BOOLEAN NOT NULL DEFAULT false/);
    assert.match(mig, /marketing_consent_at/);
    assert.match(mig, /marketing_consent_version/);
    const api = read('src/routes/public.js');
    assert.match(api, /marketingConsent !== true/);
    assert.match(api, /waitlist_en_v1/);
    const db = read('db/waitlist.js');
    assert.match(db, /marketing_consent_at/);
    assert.match(db, /converted_family_id IS NULL/);
  });

  it('conversion links by verified email only (no IP/UTM identity guess)', () => {
    const db = read('db/waitlist.js');
    assert.match(db, /LOWER\(email\) = LOWER\(\$1\)/);
    assert.doesNotMatch(db, /ip_address = \$|utm_source = \$1/);
  });

  it('feature flags migration inserts all growth keys default OFF', () => {
    const flags = read('migrations/1810140000003_growth_feedback_loop_flags.js');
    for (const key of [
      'growth_feedback_v1',
      'growth_referral_cta_v1',
      'growth_stuck_cohorts_v1',
      'growth_waitlist_funnel_v1',
    ]) {
      assert.match(flags, new RegExp(key));
    }
    assert.match(flags, /VALUES \(\$1, false/);
  });

  it('Hem mounts exist statically to avoid dynamic layout thrash', () => {
    const html = read('public/dashboard.html');
    assert.match(html, /id="growthFeedbackMount"/);
    assert.match(html, /id="growthReferralCtaMount"/);
    assert.doesNotMatch(html, /child-dashboard\.html[\s\S]*growth-feedback\.js/);
  });

  it('analytics submit metadata includes has_comment flag not free-text', () => {
    const analytics = read('src/routes/analytics.js');
    assert.match(analytics, /growth_feedback_dismissed/);
    const submit = read('src/routes/growth-feedback.js');
    assert.match(
      submit,
      /track\(familyId, 'growth_feedback_submitted', \{[\s\S]*has_comment: Boolean\(body\.comment\)/
    );
    assert.doesNotMatch(
      submit,
      /track\(familyId, 'growth_feedback_submitted', \{[\s\S]*comment:\s*body\.comment/
    );
  });
});

