'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { computeAiGoNoGoVerdict } = require('../db/activation-funnel');

const ROOT = path.join(__dirname, '..');

describe('ACT-1 growth completion', () => {
  it('emits child_profile_created on onboarding child insert', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/onboarding.js'), 'utf8');
    assert.match(src, /child_profile_created/);
  });

  it('child handoff reminder scheduler is wired', () => {
    const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(server, /startChildHandoffReminderScheduler/);
    const sched = fs.readFileSync(path.join(ROOT, 'src/lib/child-handoff-reminder-scheduler.js'), 'utf8');
    assert.match(sched, /schema_saved_at IS NOT NULL/);
    assert.match(sched, /child_handoff_reminder_sent/);
    assert.doesNotMatch(sched, /analytics_events/);
  });

  it('admin funnel includes child access diagnostics and weekly report', () => {
    const db = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(db, /getActivationChildAccessDiagnostics/);
    assert.match(db, /child_profile_created/);
    assert.match(db, /getActivationWeeklyReport/);
    const admin = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(admin, /activationChildAccessDiag/);
    assert.match(admin, /activationWeeklyReport/);
    assert.match(admin, /Veckorapport aktivering/);
  });

  it('referral admin lists delningar (shares)', () => {
    const db = fs.readFileSync(path.join(ROOT, 'db/referral.js'), 'utf8');
    assert.match(db, /referral_link_shared/);
    assert.match(db, /AS shares/);
    const admin = fs.readFileSync(path.join(ROOT, 'public/admin/admin-analytics.js'), 'utf8');
    assert.match(admin, /Delningar/);
  });

  it('onboarding handoff has copy login info', () => {
    const handoffFilm = fs.readFileSync(path.join(ROOT, 'public/js/onboarding-handoff-film.js'), 'utf8');
    const onboardingHtml = fs.readFileSync(path.join(ROOT, 'public/onboarding.html'), 'utf8');
    const onboarding = fs.readFileSync(path.join(ROOT, 'public/js/onboarding.js'), 'utf8');
    const i18n = fs.readFileSync(path.join(ROOT, 'config/i18n/onboarding-sv-SE.json'), 'utf8');
    assert.match(handoffFilm, /handoffFilm\.copyLogin/);
    assert.match(onboardingHtml, /onboarding\.handoff\.copyInfo/);
    assert.match(onboardingHtml, /onboarding\.handoff\.emailLogin/);
    assert.match(onboarding, /copyLoginInfo/);
    assert.match(onboarding, /emailLoginInfo/);
    assert.match(i18n, /Kopiera inloggning|Kopiera info/);
    assert.match(i18n, /Skicka till mejl/);
  });

  it('dashboard custody BC-4/BC-6 module exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/dashboard-custody.js')));
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(html, /dashboard-custody\.js/);
  });
});

describe('computeAiGoNoGoVerdict', () => {
  it('returns insufficient_data when cohorts are small', () => {
    const v = computeAiGoNoGoVerdict({
      template_only: { signups: 5, rate_48h: 20 },
      template_plus_ai: { signups: 8, rate_48h: 30 },
    });
    assert.equal(v.status, 'insufficient_data');
  });

  it('promotes AI when B beats A by ≥5 pp', () => {
    const v = computeAiGoNoGoVerdict({
      template_only: { signups: 20, rate_48h: 25 },
      template_plus_ai: { signups: 20, rate_48h: 31 },
    });
    assert.equal(v.status, 'promote_ai');
    assert.ok(v.delta_pp >= 5);
  });

  it('keeps template_only when delta is below threshold', () => {
    const v = computeAiGoNoGoVerdict({
      template_only: { signups: 20, rate_48h: 30 },
      template_plus_ai: { signups: 20, rate_48h: 33 },
    });
    assert.equal(v.status, 'keep_template_only');
  });
});

describe('legacy onboarding funnel', () => {
  it('legacy onboarding start is tracked in client analytics, not main First Success funnel', () => {
    const db = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.doesNotMatch(db, /funnel_onboarding_started/);
    assert.match(db, /child_created_at/);
    const onboarding = fs.readFileSync(path.join(ROOT, 'public/js/onboarding.js'), 'utf8');
    assert.match(onboarding, /trackLegacyOnboardingIfNeeded/);
    assert.match(onboarding, /funnel_onboarding_started/);
    const analytics = fs.readFileSync(path.join(ROOT, 'src/routes/analytics.js'), 'utf8');
    assert.match(analytics, /funnel_onboarding_started/);
  });
});
