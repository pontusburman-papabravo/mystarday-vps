'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');
const { mapGrowthStuckFamily } = require('../src/lib/growth-stuck-work-queue');

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
    assert.doesNotMatch(route, /isActivationFlagEnabled|är avstängd|status\(503\)/);
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

describe('admin stuck cohort preview API', () => {
  it('returns 48h–14d preview without growth_stuck_cohorts_v1 and never allows auto-send', async () => {
    const mock = injectMockDb();
    mock.setQuery(async (sql) => {
      const q = String(sql);
      if (q.includes('FROM feature_flag')) {
        return { rows: [{ enabled: false }] };
      }
      if (q.includes('classified') || q.includes('blocking_step')) {
        return {
          rows: [{
            family_id: 'fam-stuck-1',
            family_name: 'Fastnad familj',
            created_at: '2026-08-10T10:00:00Z',
            locale: 'sv-SE',
            acquisition_platform: 'web',
            last_event_type: 'activation_onboarding_started',
            last_event_at: '2026-08-10T10:05:00Z',
            acquisition_source: 'google',
            acquisition_medium: 'cpc',
            acquisition_campaign: null,
            acquisition_referral_code: null,
            blocking_step: 'onboarding_incomplete',
            child_created_at: null,
            schema_saved_at: null,
            child_access_completed_at: null,
            first_completion_at: null,
            p0_activated_at: null,
          }],
        };
      }
      return { rows: [] };
    });

    const dbPath = require.resolve('../db/growth-stuck-cohorts');
    const routePath = require.resolve('../src/routes/admin/growth-stuck-cohorts');
    delete require.cache[dbPath];
    delete require.cache[routePath];
    const router = require('../src/routes/admin/growth-stuck-cohorts');

    const app = express();
    app.use((req, _res, next) => {
      req.user = { type: 'parent', id: 'admin-1', isAdmin: true };
      next();
    });
    app.use(router);

    const server = await new Promise((resolve, reject) => {
      const s = app.listen(0, () => resolve(s));
      s.on('error', reject);
    });

    try {
      const port = server.address().port;
      const listRes = await fetch(`http://127.0.0.1:${port}/growth/stuck-cohorts`);
      assert.equal(listRes.status, 200);
      const list = await listRes.json();
      assert.equal(list.autoSendAllowed, false);
      assert.equal(list.minAgeHours, 48);
      assert.equal(list.maxAgeDays, 14);
      assert.equal(list.count, 1);
      assert.equal(list.families[0].blockingStep, 'onboarding_incomplete');
      assert.equal(list.families[0].whyStuck, 'Onboarding startad men inte slutförd.');
      assert.equal(list.families[0].manualNextStep.includes('spara schema'), true);
      assert.equal(list.families[0].lastActivityType, 'activation_onboarding_started');
      assert.equal(typeof list.families[0].stuckHours, 'number');
      assert.equal(list.families[0].recommendedFollowUp, 'preview_handoff_nudge');
      assert.equal(list.families[0].autoSendAllowed, false);

      const sumRes = await fetch(`http://127.0.0.1:${port}/growth/stuck-cohorts/summary`);
      assert.equal(sumRes.status, 200);
      const summary = await sumRes.json();
      assert.equal(summary.autoSendAllowed, false);
      assert.equal(summary.total, 1);
      assert.equal(summary.counts.onboarding_incomplete, 1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      mock.restore();
    }
  });
});

describe('stuck family work-queue mapper', () => {
  const now = new Date('2026-08-18T08:00:00Z');

  it('onboarding never started: why + duration from created_at + schema next step', () => {
    const mapped = mapGrowthStuckFamily({
      family_id: 'f1',
      family_name: 'A',
      created_at: '2026-08-15T08:00:00Z',
      blocking_step: 'onboarding_incomplete',
      last_event_type: null,
      last_event_at: null,
      last_login_at: null,
    }, now);
    assert.equal(mapped.whyStuck, 'Onboarding aldrig startad.');
    assert.equal(mapped.stuckHours, 72);
    assert.equal(mapped.autoSendAllowed, false);
    assert.match(mapped.manualNextStep, /spara schema/);
    assert.equal(mapped.recommendedFollowUp, 'preview_handoff_nudge');
  });

  it('schema without child login uses schema_saved_at as stuck-since', () => {
    const mapped = mapGrowthStuckFamily({
      family_id: 'f2',
      family_name: 'B',
      created_at: '2026-08-10T08:00:00Z',
      blocking_step: 'schema_no_child_login',
      schema_saved_at: '2026-08-16T08:00:00Z',
      last_event_type: 'activation_onboarding_started',
      last_event_at: '2026-08-16T09:00:00Z',
    }, now);
    assert.equal(mapped.stuckHours, 48);
    assert.match(mapped.whyStuck, /inget barn har loggat in/);
    assert.match(mapped.manualNextStep, /barninloggning/);
  });

  it('prefers more recent login over older analytics event', () => {
    const mapped = mapGrowthStuckFamily({
      family_id: 'f3',
      family_name: 'C',
      created_at: '2026-08-10T08:00:00Z',
      blocking_step: 'login_no_completion',
      child_access_completed_at: '2026-08-14T08:00:00Z',
      last_event_type: 'activation_onboarding_started',
      last_event_at: '2026-08-12T08:00:00Z',
      last_login_at: '2026-08-17T08:00:00Z',
    }, now);
    assert.equal(mapped.lastActivityType, 'login');
    assert.equal(mapped.stuckHours, 96);
    assert.match(mapped.manualNextStep, /första-stjärna|stjärna/i);
  });

  it('completion without return and core-flow errors keep autoSendAllowed false', () => {
    const ret = mapGrowthStuckFamily({
      family_id: 'f4',
      created_at: '2026-08-04T08:00:00Z',
      blocking_step: 'completion_no_return',
      first_completion_at: '2026-08-08T08:00:00Z',
    }, now);
    assert.match(ret.manualNextStep, /inget auto-mejl/);
    assert.equal(ret.autoSendAllowed, false);

    const err = mapGrowthStuckFamily({
      family_id: 'f5',
      created_at: '2026-08-10T08:00:00Z',
      blocking_step: 'core_flow_errors',
      last_event_type: 'child_pin_lockout',
      last_event_at: '2026-08-17T20:00:00Z',
    }, now);
    assert.match(err.whyStuck, /Tekniskt fel/);
    assert.match(err.manualNextStep, /felsök/);
    assert.equal(err.autoSendAllowed, false);
  });
});

