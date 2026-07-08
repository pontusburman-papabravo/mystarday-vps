'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { ensureActivationState, updateActivationState } = require('../src/lib/activation-p0');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('onboarding handoff resume — PR 3 static contracts', () => {
  it('reminder CTA uses resume=child-handoff query param', () => {
    const src = read('src/lib/child-handoff-reminder-scheduler.js');
    assert.match(src, /resume=child-handoff/);
    assert.doesNotMatch(src, /return `\$\{base\}\/onboarding`;/);
  });

  it('onboarding.js bypasses dashboard redirect when resume handoff', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /resumeHandoff/);
    assert.match(src, /onboarding_completed && !resumeHandoff/);
    assert.match(src, /OnboardingHandoffResume\.handleResume/);
    assert.match(src, /handoffResumeHandled/);
  });

  it('onboarding-handoff-resume logs reminder_landed not handoff_started on land', () => {
    const src = read('public/js/onboarding-handoff-resume.js');
    assert.match(src, /child_handoff_reminder_landed/);
    assert.doesNotMatch(src, /child_handoff_started/);
  });

  it('onboarding-activation uses reminder_email source when resume active', () => {
    const src = read('public/js/onboarding-activation.js');
    const fn = src.slice(src.indexOf('function startChildHandoff'), src.indexOf('function confirmHandoffSkip'));
    assert.match(fn, /reminder_email/);
    assert.match(fn, /OnboardingHandoffResume\.isActive/);
  });

  it('handoff-context endpoint does not return PIN', () => {
    const src = read('src/routes/onboarding.js');
    const block = src.slice(src.indexOf("router.get('/handoff-context'"), src.indexOf("router.post('/child-access-complete'"));
    assert.match(block, /can_resume_handoff/);
    assert.match(block, /child_username/);
    assert.doesNotMatch(block, /\bpin\b/i);
  });

  it('analytics allowlist includes child_handoff_reminder_landed', () => {
    const src = read('src/routes/analytics.js');
    assert.match(src, /child_handoff_reminder_landed/);
  });

  it('onboarding.html loads handoff-resume script before onboarding.js', () => {
    const html = read('public/onboarding.html');
    const resumeIdx = html.indexOf('onboarding-handoff-resume.js');
    const onboardingIdx = html.indexOf('onboarding.js');
    assert.ok(resumeIdx >= 0 && onboardingIdx > resumeIdx);
  });
});

test('GET /api/onboarding/handoff-context — schema without child access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    const childId = await createChild(http.baseUrl, session, { name: 'ResumeBarn', emoji: '🌟' });
    await db.query(
      `UPDATE child SET username = 'resumebarn' WHERE id = $1`,
      [childId]
    );
    await ensureActivationState(familyId);
    await updateActivationState(familyId, 'schema_saved');

    const res = await fetch(`${http.baseUrl}/api/onboarding/handoff-context`, {
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.can_resume_handoff, true);
    assert.equal(body.reason, 'schema_saved_no_child_access');
    assert.equal(body.child_id, childId);
    assert.equal(body.child_name, 'ResumeBarn');
    assert.equal(body.child_username, 'resumebarn');
    assert.equal(body.pin, undefined);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('GET /api/onboarding/handoff-context — no schema', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const res = await fetch(`${http.baseUrl}/api/onboarding/handoff-context`, {
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.can_resume_handoff, false);
    assert.equal(body.reason, 'no_schema');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('GET /api/onboarding/handoff-context — child access already done', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    await createChild(http.baseUrl, session, { name: 'Done', emoji: '✅' });
    await ensureActivationState(familyId);
    await updateActivationState(familyId, 'schema_saved');
    await updateActivationState(familyId, 'child_access');

    const res = await fetch(`${http.baseUrl}/api/onboarding/handoff-context`, {
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.can_resume_handoff, false);
    assert.equal(body.reason, 'child_access_done');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
