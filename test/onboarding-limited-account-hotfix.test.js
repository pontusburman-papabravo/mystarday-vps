'use strict';

/**
 * P1 limited onboarding authorization — narrow first-run exception + client retry UX contracts.
 */
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { ensureCanonicalStandardLibrary } = require('./helpers/golden-path-fas6.js');
const config = require('../src/lib/config');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function setPaymentStart(iso, db) {
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes(`${ROOT}/src/`)
      || key.endsWith(`${ROOT}/app.js`)
      || key.includes(`${ROOT}/db/`)
    ) {
      delete require.cache[key];
    }
  }
  await db.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
    ['payment_start_at', JSON.stringify(iso)]
  );
  const { setPaymentStartAt } = require('../src/lib/payment-settings');
  await setPaymentStartAt(iso);
}

function parentHeaders(session) {
  return {
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
    'Content-Type': 'application/json',
  };
}

async function runLimitedFirstRunBootstrap(http, session) {
  const headers = parentHeaders(session);

  const groupsRes = await fetch(`${http.baseUrl}/api/onboarding/template-groups`, { headers });
  assert.equal(groupsRes.status, 200, await groupsRes.text());

  const childRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'LimitedBarn', emoji: '🌟' }),
  });
  const childBody = await childRes.json();
  assert.equal(childRes.status, 201, JSON.stringify(childBody));

  const scheduleRes = await fetch(`${http.baseUrl}/api/onboarding/schedule`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ child_id: childBody.id, template_group: 'forskola' }),
  });
  assert.equal(scheduleRes.status, 200, await scheduleRes.text());

  const rewardRes = await fetch(`${http.baseUrl}/api/onboarding/reward`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Glass', icon: '🍦', star_cost: 50 }),
  });
  assert.equal(rewardRes.status, 201, await rewardRes.text());

  const viewRes = await fetch(`${http.baseUrl}/api/onboarding/child-view`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ child_id: childBody.id, view_type: 'timeline' }),
  });
  assert.equal(viewRes.status, 200, await viewRes.text());

  const completeRes = await fetch(`${http.baseUrl}/api/onboarding/complete`, {
    method: 'POST',
    headers,
  });
  assert.equal(completeRes.status, 200, await completeRes.text());

  return childBody;
}

async function runLimitedFirstRunBootstrapBeforeComplete(http, session) {
  const headers = parentHeaders(session);

  const childRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'LimitedBarn', emoji: '🌟' }),
  });
  const childBody = await childRes.json();
  assert.equal(childRes.status, 201, JSON.stringify(childBody));

  const scheduleRes = await fetch(`${http.baseUrl}/api/onboarding/schedule`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ child_id: childBody.id, template_group: 'forskola' }),
  });
  assert.equal(scheduleRes.status, 200, await scheduleRes.text());

  const rewardRes = await fetch(`${http.baseUrl}/api/onboarding/reward`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Glass', icon: '🍦', star_cost: 50 }),
  });
  assert.equal(rewardRes.status, 201, await rewardRes.text());

  const viewRes = await fetch(`${http.baseUrl}/api/onboarding/child-view`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ child_id: childBody.id, view_type: 'timeline' }),
  });
  assert.equal(viewRes.status, 200, await viewRes.text());

  return childBody;
}

async function getLimitedBootstrapFinishedAt(db, familyId) {
  const result = await db.query(
    `SELECT step_deferrals->>'limited_onboarding_finished_at' AS finished_at,
            schema_saved_at
     FROM family_activation_state
     WHERE family_id = $1`,
    [familyId]
  );
  return result.rows[0] || null;
}

function patchModuleExport(modulePath, exportName, wrapperFactory) {
  const mod = require(modulePath);
  const original = mod[exportName];
  mod[exportName] = wrapperFactory(original);
  return () => {
    mod[exportName] = original;
  };
}

test('limited onboarding authorization integration A–J', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  await ensureCanonicalStandardLibrary(db);
  const savedPaymentStart = '2026-10-01T00:00:00+02:00';
  let limitedHttp;

  try {
    await setPaymentStart('2020-01-01T00:00:00+02:00', db);
    const { getPaymentStartAt } = require('../src/lib/payment-settings');
    const cutoff = await getPaymentStartAt();
    assert.ok(cutoff.getFullYear() <= 2020, `expected paywall cutoff 2020, got ${cutoff.toISOString()}`);
    const { createApp } = require('../app');
    limitedHttp = await listenApp(createApp);

    await t.test('H: unauthenticated onboarding → 401', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/template-groups`);
      assert.equal(res.status, 401);
    });

    const session = await registerAndLogin(limitedHttp.baseUrl);
    const headers = parentHeaders(session);

    await t.test('A: first-run GET template-groups → 200', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/template-groups`, { headers });
      assert.equal(res.status, 200, await res.text());
    });

    await t.test('B: first-run POST child → allowed', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/child`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'LimitedBarn', emoji: '🌟' }),
      });
      const text = await res.text();
      assert.notEqual(res.status, 402, text);
      assert.equal(res.status, 201, text);
      const body = JSON.parse(text);
      session._childId = body.id;
      session._childUsername = body.username;
      session._childPin = body.pin;
    });

    await t.test('C: first-run POST schedule → allowed', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/schedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ child_id: session._childId, template_group: 'forskola' }),
      });
      const text = await res.text();
      assert.notEqual(res.status, 402, text);
      assert.equal(res.status, 200, text);
    });

    await t.test('D: full first-run client sequence succeeds without Premium', async () => {
      const fresh = await registerAndLogin(limitedHttp.baseUrl);
      const child = await runLimitedFirstRunBootstrap(limitedHttp, fresh);
      assert.ok(child.id);
    });

    await t.test('E: completed limited parent cannot POST second child', async () => {
      const finished = await registerAndLogin(limitedHttp.baseUrl);
      await runLimitedFirstRunBootstrap(limitedHttp, finished);
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/child`, {
        method: 'POST',
        headers: parentHeaders(finished),
        body: JSON.stringify({ name: 'ExtraBarn', emoji: '🐻' }),
      });
      assert.equal(res.status, 402);
      const body = await res.json();
      assert.equal(body.code, 'PREMIUM_REQUIRED');
    });

    await t.test('F: completed limited parent cannot mutate via onboarding reward/schedule', async () => {
      const finished = await registerAndLogin(limitedHttp.baseUrl);
      const child = await runLimitedFirstRunBootstrap(limitedHttp, finished);
      const h = parentHeaders(finished);

      const scheduleRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/schedule`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ child_id: child.id, template_group: 'morgon' }),
      });
      assert.equal(scheduleRes.status, 402);

      const rewardRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/reward`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ name: 'Extra', icon: '🎁', star_cost: 25 }),
      });
      assert.equal(rewardRes.status, 402);
    });

    await t.test('G: premium parent onboarding child flow remains allowed', async () => {
      const premiumSession = await registerAndLogin(limitedHttp.baseUrl);
      const appDb = require('../src/lib/db');
      const familyRow = await appDb.query(
        'SELECT family_id FROM parent WHERE email = $1',
        [premiumSession.email]
      );
      const { grantAdminPremium } = require('../src/lib/family-entitlements');
      await grantAdminPremium(familyRow.rows[0].family_id, {
        permanent: true,
        reason: 'test premium onboarding',
      });

      const first = await fetch(`${limitedHttp.baseUrl}/api/onboarding/child`, {
        method: 'POST',
        headers: parentHeaders(premiumSession),
        body: JSON.stringify({ name: 'PremiumBarn1', emoji: '⭐' }),
      });
      const firstText = await first.text();
      assert.equal(first.status, 201, firstText);
      const firstBody = JSON.parse(firstText);

      await fetch(`${limitedHttp.baseUrl}/api/onboarding/schedule`, {
        method: 'POST',
        headers: parentHeaders(premiumSession),
        body: JSON.stringify({ child_id: firstBody.id, template_group: 'forskola' }),
      });

      const second = await fetch(`${limitedHttp.baseUrl}/api/onboarding/child`, {
        method: 'POST',
        headers: parentHeaders(premiumSession),
        body: JSON.stringify({ name: 'PremiumBarn2', emoji: '🌟' }),
      });
      const secondText = await second.text();
      assert.notEqual(second.status, 402, secondText);
      assert.equal(second.status, 201, secondText);
    });

    await t.test('I: child JWT cannot access parent onboarding routes', async () => {
      const familyRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
      const childToken = jwt.sign(
        {
          id: session._childId,
          type: 'child',
          familyId: familyRow.rows[0].family_id,
          username: session._childUsername,
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      const childRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/template-groups`, {
        headers: { Cookie: cookieHeader({ access_token: childToken }) },
      });
      assert.notEqual(childRes.status, 200);
      assert.ok([402, 403].includes(childRes.status));
    });

    await t.test('J: unrelated limited-account API remains 402', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/children`, { headers });
      assert.equal(res.status, 402);
      const body = await res.json();
      assert.equal(body.code, 'PREMIUM_REQUIRED');
    });

    await t.test('L: complete retry-safe when markParentOnboardingComplete fails once', async () => {
      const retrySession = await registerAndLogin(limitedHttp.baseUrl);
      const child = await runLimitedFirstRunBootstrapBeforeComplete(limitedHttp, retrySession);
      const appDb = require('../src/lib/db');
      const familyRow = await appDb.query(
        'SELECT family_id FROM parent WHERE email = $1',
        [retrySession.email]
      );
      const familyId = familyRow.rows[0].family_id;
      const beforeState = await getLimitedBootstrapFinishedAt(db, familyId);
      assert.ok(beforeState?.schema_saved_at, 'schema_saved_at required before complete');
      assert.equal(beforeState.finished_at, null);

      let parentCalls = 0;
      const restoreParent = patchModuleExport(
        '../src/lib/mark-parent-onboarding-complete',
        'markParentOnboardingComplete',
        (original) => async (...args) => {
          parentCalls += 1;
          if (parentCalls === 1) throw new Error('simulated markParentOnboardingComplete failure');
          return original(...args);
        }
      );

      try {
        const failRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/complete`, {
          method: 'POST',
          headers: parentHeaders(retrySession),
        });
        assert.equal(failRes.status, 500, await failRes.text());

        const afterFail = await getLimitedBootstrapFinishedAt(db, familyId);
        assert.equal(afterFail.finished_at, null);

        const retryRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/complete`, {
          method: 'POST',
          headers: parentHeaders(retrySession),
        });
        assert.equal(retryRes.status, 200, await retryRes.text());

        const afterSuccess = await getLimitedBootstrapFinishedAt(db, familyId);
        assert.ok(afterSuccess?.finished_at, 'limited_onboarding_finished_at should be set after success');

        const blocked = await fetch(`${limitedHttp.baseUrl}/api/onboarding/child`, {
          method: 'POST',
          headers: parentHeaders(retrySession),
          body: JSON.stringify({ name: 'ExtraBarn', emoji: '🐻' }),
        });
        assert.equal(blocked.status, 402);
      } finally {
        restoreParent();
      }

      assert.ok(child.id);
    });

    await t.test('M: complete retry-safe when bootstrap marker write fails once', async () => {
      const retrySession = await registerAndLogin(limitedHttp.baseUrl);
      await runLimitedFirstRunBootstrapBeforeComplete(limitedHttp, retrySession);
      const appDb = require('../src/lib/db');
      const familyRow = await appDb.query(
        'SELECT family_id FROM parent WHERE email = $1',
        [retrySession.email]
      );
      const familyId = familyRow.rows[0].family_id;

      let bootstrapCalls = 0;
      const restoreBootstrap = patchModuleExport(
        '../src/lib/limited-onboarding-access',
        'markLimitedOnboardingBootstrapFinished',
        (original) => async (...args) => {
          bootstrapCalls += 1;
          if (bootstrapCalls === 1) throw new Error('simulated bootstrap marker failure');
          return original(...args);
        }
      );

      try {
        const failRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/complete`, {
          method: 'POST',
          headers: parentHeaders(retrySession),
        });
        assert.equal(failRes.status, 500, await failRes.text());

        const afterFail = await getLimitedBootstrapFinishedAt(db, familyId);
        assert.equal(afterFail.finished_at, null);

        const retryRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/complete`, {
          method: 'POST',
          headers: parentHeaders(retrySession),
        });
        assert.equal(retryRes.status, 200, await retryRes.text());

        const afterSuccess = await getLimitedBootstrapFinishedAt(db, familyId);
        assert.ok(afterSuccess?.finished_at);
      } finally {
        restoreBootstrap();
      }
    });
  } finally {
    if (limitedHttp) await limitedHttp.close();
    await setPaymentStart(savedPaymentStart, db);
    await db.cleanup();
  }
});

describe('onboarding limited-account hotfix — client contracts', () => {
  const src = read('public/js/onboarding.js');

  it('F: failed template load shows retry control', () => {
    assert.match(src, /function renderTemplateGroupsLoadFailed/);
    assert.match(src, /templatesLoadFailed/);
    assert.match(src, /templatesRetryBtn/);
    assert.match(src, /id="templateGroupsRetryBtn"/);
    assert.match(src, /loadTemplateGroups\(\)/);
  });

  it('G: successful retry renders server groups and re-enables Next', () => {
    assert.match(src, /async function loadTemplateGroups\(\)/);
    assert.match(src, /buildTemplateGroupGrid\(templateGroups\)/);
    assert.match(src, /if \(step1Btn\) step1Btn\.disabled = false/);
    assert.match(src, /if \(!templateGroupsLoading\) loadTemplateGroups\(\)/);
  });

  it('H: Next without schedule shows error and focuses schedule section', () => {
    assert.match(src, /if \(!selectedDayPref\)/);
    assert.match(src, /onboarding\.child\.scheduleRequired/);
    assert.match(src, /focusScheduleSection\(\)/);
    assert.match(src, /function focusScheduleSection/);
    assert.match(src, /scrollIntoView/);
  });

  it('I: no fake fallback schedule cards in template grid loader', () => {
    const loaderBlock = src.slice(
      src.indexOf('async function loadTemplateGroups'),
      src.indexOf('function buildTemplateGroupGrid')
    );
    assert.doesNotMatch(loaderBlock, /getTemplateGroupFallback\(\)/);
    assert.doesNotMatch(loaderBlock, /TEMPLATE_GROUP_META\.map/);
  });
});

describe('limited onboarding authorization — policy regression', () => {
  it('K: no blanket /api/onboarding/ in LIMITED_ACCOUNT_ALLOWED_PREFIXES', () => {
    const { LIMITED_ACCOUNT_ALLOWED_PREFIXES } = require('../src/middleware/require-premium');
    assert.ok(!LIMITED_ACCOUNT_ALLOWED_PREFIXES.includes('/api/onboarding/'));
    assert.ok(!LIMITED_ACCOUNT_ALLOWED_PREFIXES.some((p) => p.startsWith('/api/onboarding')));
  });

  it('complete writes bootstrap marker only after parent onboarding complete', () => {
    const src = read('src/routes/onboarding.js');
    const block = src.slice(
      src.indexOf("router.post('/complete'"),
      src.indexOf("// ─── ACT-1 starter plan")
    );
    const parentIdx = block.indexOf('await markParentOnboardingComplete');
    const bootstrapIdx = block.indexOf('await markLimitedOnboardingBootstrapFinished');
    assert.ok(parentIdx >= 0 && bootstrapIdx >= 0);
    assert.ok(parentIdx < bootstrapIdx, 'parent completion must run before bootstrap marker');
  });

  it('bootstrap finished uses activation state markers', () => {
    const {
      isLimitedOnboardingReadPath,
      isLimitedBootstrapFinished,
    } = require('../src/lib/limited-onboarding-access');
    assert.equal(isLimitedBootstrapFinished({ schema_saved_at: new Date() }), false);
    assert.equal(
      isLimitedBootstrapFinished({
        schema_saved_at: new Date(),
        step_deferrals: { limited_onboarding_finished_at: new Date().toISOString() },
      }),
      true
    );
    assert.equal(isLimitedOnboardingReadPath('/api/onboarding/template-groups'), true);
    assert.equal(isLimitedOnboardingReadPath('/api/onboarding/child'), false);
  });
});
