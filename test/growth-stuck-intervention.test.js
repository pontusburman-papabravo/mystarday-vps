'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  interventionKeyForCohort,
  buildInterventionEmail,
  INTERVENTION_KEYS,
} = require('../src/lib/growth-stuck-intervention-templates');
const {
  formatBlockerMessage,
  GROWTH_EMAIL_COOLDOWN_HOURS,
} = require('../src/lib/growth-stuck-intervention');

const ROOT = path.join(__dirname, '..');

describe('growth-stuck-intervention templates', () => {
  it('maps supported cohorts to three V1 intervention keys', () => {
    assert.equal(interventionKeyForCohort('onboarding_incomplete'), INTERVENTION_KEYS.onboarding_incomplete);
    assert.equal(
      interventionKeyForCohort('schema_no_child_login'),
      INTERVENTION_KEYS.schema_without_child_access
    );
    assert.equal(interventionKeyForCohort('login_no_completion'), INTERVENTION_KEYS.started_but_stalled);
    assert.equal(interventionKeyForCohort('completion_no_return'), INTERVENTION_KEYS.started_but_stalled);
    assert.equal(interventionKeyForCohort('core_flow_errors'), null);
  });

  it('builds founder schema_without_child_access email that names the missing child view', () => {
    const prev = process.env.APP_URL;
    process.env.APP_URL = 'https://example.test'; // pragma: allowlist secret
    try {
      const built = buildInterventionEmail(INTERVENTION_KEYS.schema_without_child_access, {
        parentName: 'Anna',
      });
      assert.ok(built);
      assert.equal(built.subject, 'Barnet har inte sett sitt schema än');
      assert.match(built.html, /Pontus Burman/);
      assert.match(built.html, /redan använder schemat hemma/);
      assert.match(built.html, /barnet får se samma dag/);
      assert.match(built.html, /Öppna barnets vy/);
      assert.match(built.html, /href="https:\/\/example\.test\/open\/child"/);
      assert.match(built.html, /Fortsätt i webbläsaren/);
      assert.doesNotMatch(built.html, /\/child-login/);
      assert.doesNotMatch(built.html, /PIN/);
      assert.doesNotMatch(built.html, /QR/);
      assert.doesNotMatch(built.html, /Behöver du hjälp/);
      assert.doesNotMatch(built.html, /bra jobbat/i);
      assert.equal(built.bodyVersion, 'v5');
      assert.equal(built.ctaLabel, 'Öppna barnets vy');
      assert.match(built.from, /Pontus Burman/);
      assert.equal(built.ctaUrl, 'https://example.test/open/child');
    } finally {
      if (prev === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prev;
    }
  });

  it('builds distinct subjects per intervention key', () => {
    const onboarding = buildInterventionEmail(INTERVENTION_KEYS.onboarding_incomplete, { parentName: 'Erik' });
    const schema = buildInterventionEmail(INTERVENTION_KEYS.schema_without_child_access, { parentName: 'Erik' });
    const stalled = buildInterventionEmail(INTERVENTION_KEYS.started_but_stalled, { parentName: 'Erik' });
    assert.notEqual(onboarding.subject, schema.subject);
    assert.notEqual(schema.subject, stalled.subject);
  });
});

describe('growth-stuck-intervention eligibility messages', () => {
  it('formats human-readable blocker messages', () => {
    assert.match(
      formatBlockerMessage('activation_nudge_recent', { hoursAgo: 12 }),
      /12 tim/
    );
    assert.match(formatBlockerMessage('already_sent', { interventionKey: 'schema_without_child_access' }), /redan skickad/);
    assert.match(formatBlockerMessage('send_in_progress'), /pågår redan/);
    assert.match(formatBlockerMessage('email_disabled'), /avstängd/);
  });

  it('uses 72h growth email cooldown constant', () => {
    assert.equal(GROWTH_EMAIL_COOLDOWN_HOURS, 72);
  });
});

describe('growth-stuck-intervention delivery contract', () => {
  it('claims pending before sendEmail and marks sent only after provider success', () => {
    const intervention = fs.readFileSync(
      path.join(ROOT, 'src/lib/growth-stuck-intervention.js'),
      'utf8'
    );
    assert.match(intervention, /claimPendingIntervention/);
    assert.match(intervention, /markInterventionSent/);
    assert.doesNotMatch(intervention, /BEGIN[\s\S]*sendEmail[\s\S]*COMMIT/);
    assert.match(intervention, /idempotencyKey/);
  });

  it('uses ON CONFLICT for conflict-safe pending claims', () => {
    const dbModule = fs.readFileSync(
      path.join(ROOT, 'db/family-growth-intervention.js'),
      'utf8'
    );
    assert.match(dbModule, /ON CONFLICT \(family_id, intervention_key\)/);
    assert.match(dbModule, /DO NOTHING/);
    assert.match(dbModule, /markInterventionSent/);
    assert.match(dbModule, /markInterventionFailed/);
    assert.match(dbModule, /markInterventionUnknown/);
  });

  it('passes Resend idempotency key from family + intervention', () => {
    const email = fs.readFileSync(path.join(ROOT, 'src/lib/email.js'), 'utf8');
    assert.match(email, /Idempotency-Key/);
    const dbModule = require('../db/family-growth-intervention');
    const key = dbModule.buildIdempotencyKey(
      '11111111-1111-1111-1111-111111111111',
      'schema_without_child_access'
    );
    assert.equal(
      key,
      'stuck-intervention/11111111-1111-1111-1111-111111111111/schema_without_child_access'
    );
  });
});

describe('growth-stuck-intervention safety rails', () => {
  it('admin intervention routes do not gate on growth_stuck_cohorts_v1 flag', () => {
    const route = fs.readFileSync(
      path.join(ROOT, 'src/routes/admin/growth-stuck-intervention.js'),
      'utf8'
    );
    assert.doesNotMatch(route, /isActivationFlagEnabled\([^)]*growth_stuck_cohorts_v1/);
    assert.doesNotMatch(route, /feature_flag[^;]*growth_stuck_cohorts_v1/);
    assert.match(route, /manualOnly: true/);
  });

  it('no scheduler reads family_growth_intervention', () => {
    const schedulers = [
      'src/lib/activation-nudge-scheduler.js',
      'src/lib/win-back-scheduler.js',
      'src/lib/growth-system-help-ops-scheduler.js',
    ];
    for (const file of schedulers) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.doesNotMatch(src, /family_growth_intervention/);
    }
    const intervention = fs.readFileSync(path.join(ROOT, 'src/lib/growth-stuck-intervention.js'), 'utf8');
    assert.doesNotMatch(intervention, /setInterval|scheduleNext|startGrowth/);
  });

  it('analytics allowlist includes stuck intervention events', () => {
    const analytics = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
    assert.match(analytics, /stuck_intervention_previewed/);
    assert.match(analytics, /stuck_intervention_sent/);
    assert.match(analytics, /stuck_intervention_skipped/);
  });

  it('communication gate supports stuck_intervention intent', () => {
    const gate = fs.readFileSync(path.join(ROOT, 'src/lib/journey/communication-gate.js'), 'utf8');
    assert.match(gate, /stuck_intervention/);
    assert.match(gate, /family_growth_intervention/);
  });
});

describe('growth-stuck-intervention admin routes', () => {
  it('exposes preview, send and skip endpoints without feature-flag gate', () => {
    const route = fs.readFileSync(
      path.join(ROOT, 'src/routes/admin/growth-stuck-intervention.js'),
      'utf8'
    );
    assert.match(route, /intervention\/preview/);
    assert.match(route, /intervention\/send/);
    assert.match(route, /intervention\/skip/);
    assert.doesNotMatch(route, /isActivationFlagEnabled\([^)]*growth_stuck_cohorts_v1/);
    assert.match(route, /manualOnly: true/);
  });
});

describe('child-view handoff batch', () => {
  it('selects any parent with email and can skip journey gate for founder batch', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/growth-stuck-intervention.js'),
      'utf8'
    );
    assert.doesNotMatch(src, /LEGACY_GENERIC_PARENT_ROLE/);
    assert.match(src, /opts\.skipGate !== true/);
    assert.match(src, /recordSend/);
    assert.match(src, /stuck_child_view/);
  });

  it('batch script is dry-run unless --execute', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'scripts/send-schema-child-view-batch.js'),
      'utf8'
    );
    assert.match(src, /--execute/);
    assert.match(src, /skipGate: true/);
    assert.match(src, /evaluateStuckIntervention/);
    assert.match(src, /blocked_test_email/);
    assert.match(src, /@peng\.se/);
  });

  it('admin shows send tracking panel and sends API', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'public/admin/admin-growth-stuck.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'public/admin/index.html'), 'utf8');
    const route = fs.readFileSync(
      path.join(ROOT, 'src/routes/admin/growth-stuck-cohorts.js'),
      'utf8'
    );
    assert.match(html, /growthStuckSendsBody/);
    assert.match(ui, /loadGrowthStuckSends/);
    assert.match(ui, /stuck-cohorts\/sends/);
    assert.match(route, /stuck-cohorts\/sends/);
    assert.match(route, /listStuckInterventionSends/);
  });
});
