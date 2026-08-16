'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { getActivationFunnelStep } = require('../src/lib/activation-p0-core');
const {
  findResumableChildWithoutSchema,
  childHasScheduleItems,
} = require('../src/lib/onboarding-child-resume');
const { seedCanonicalLibrary } = require('./helpers/canonical-library-fixture.js');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('onboarding child_without_schema — static contracts', () => {
  it('step1 retries schedule when childId already set', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /If child already created this session/);
    assert.match(src, /if \(!childId\)/);
    assert.match(src, /RESUME_CHILD_WITHOUT_SCHEMA|data\.resumed/);
  });

  it('exports window.IS_ADD_CHILD for ACT-1 modules', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /window\.IS_ADD_CHILD = IS_ADD_CHILD/);
  });

  it('does not fake template cards when library empty', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /onboarding\.child\.templatesLoadFailed/);
    assert.doesNotMatch(
      src.slice(src.indexOf('Load template groups'), src.indexOf('Load rewards')),
      /getTemplateGroupFallback\(\)/
    );
  });

  it('handoff film does not replay after completed', () => {
    const src = read('public/js/onboarding-handoff-film.js');
    const block = src.slice(
      src.indexOf('function isFilmEnabled'),
      src.indexOf('function markFilmSeen')
    );
    assert.match(block, /handoff_film_completed_at/);
    assert.match(block, /if \(st\.handoff_film_completed_at\) return false/);
  });

  it('schedule save always marks parent onboarding complete', () => {
    const src = read('src/routes/onboarding.js');
    assert.match(src, /Always mark signup complete once a schedule is saved/);
    assert.match(src, /markParentOnboardingComplete\(req\.user\.id, familyId\)/);
    assert.doesNotMatch(src, /if \(act1StarterPlan\) \{\s*const \{ markParentOnboardingComplete \}/);
  });

  it('getActivationFunnelStep exposes child_created', () => {
    assert.equal(
      getActivationFunnelStep({ child_created_at: new Date(), schema_saved_at: null }),
      'child_created'
    );
  });
});

test('POST /api/onboarding/child resumes child_without_schema instead of 409', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    };

    const createRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'StuckBarn', emoji: '🌟' }),
    });
    const created = await createRes.json();
    assert.equal(createRes.status, 201, JSON.stringify(created));
    assert.ok(created.id);
    assert.ok(created.pin);

    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    assert.equal(await childHasScheduleItems(db, created.id), false);
    const resumable = await findResumableChildWithoutSchema(db, familyId, 'StuckBarn');
    assert.ok(resumable);
    assert.equal(resumable.id, created.id);

    const resumeRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'StuckBarn', emoji: '🦄' }),
    });
    const resumed = await resumeRes.json();
    assert.equal(resumeRes.status, 200, JSON.stringify(resumed));
    assert.equal(resumed.id, created.id);
    assert.equal(resumed.resumed, true);
    assert.equal(resumed.code, 'RESUME_CHILD_WITHOUT_SCHEMA');
    assert.ok(resumed.pin);
    assert.notEqual(resumed.pin, created.pin);

    // Seed canonical Standard Library so schedule POST uses shared copy engine.
    const client = await db.pool.connect();
    try {
      await seedCanonicalLibrary(client);
    } finally {
      client.release();
    }

    const scheduleRes = await fetch(`${http.baseUrl}/api/onboarding/schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ child_id: created.id, template_group: 'forskola' }),
    });
    const scheduleBody = await scheduleRes.json();
    assert.equal(scheduleRes.status, 200, JSON.stringify(scheduleBody));
    assert.equal(await childHasScheduleItems(db, created.id), true);

    const parentAfter = await db.query(
      'SELECT onboarding_completed FROM parent WHERE email = $1',
      [session.email]
    );
    assert.equal(parentAfter.rows[0].onboarding_completed, true);

    // After schedule exists, same name is a real duplicate (not resume).
    const dupRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'StuckBarn', emoji: '🌟' }),
    });
    const dupBody = await dupRes.json();
    assert.equal(dupRes.status, 409);
    assert.equal(dupBody.code, 'DUPLICATE_CHILD_NAME');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
