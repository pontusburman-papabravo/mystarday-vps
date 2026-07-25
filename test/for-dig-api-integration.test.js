'use strict';

/**
 * För dig API integration — goals, favorites, popular, feedback.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FOR_DIG_GOALS } = require('../src/lib/for-dig-config');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function authFetch(baseUrl, session, path, { method = 'GET', body } = {}) {
  const headers = {
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

test('for-dig API: goals, favorites toggle, popular, suggestion feedback', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO features (slug, name, status)
       VALUES ('for_dig', 'För dig', 'live')
       ON CONFLICT (slug) DO UPDATE SET status = 'live'`
    );

    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, {
      name: 'För dig Barn',
      birthday: '2018-01-15',
    });

    const goalsRes = await authFetch(http.baseUrl, session, '/api/for-dig/goals');
    assert.equal(goalsRes.res.status, 200, goalsRes.text);
    assert.equal(goalsRes.json.goals.length, FOR_DIG_GOALS.length);
    const svMotivation = goalsRes.json.goals.find((g) => g.slug === 'motivation');
    assert.match(svMotivation.headline, /motivationen/i);

    const meRes = await authFetch(http.baseUrl, session, '/api/auth/me');
    assert.equal(meRes.res.status, 200, meRes.text);
    await db.query(
      `UPDATE family SET preferred_locale = 'en-GB' WHERE id = $1`,
      [meRes.json.family_id]
    );

    const enGoalsRes = await authFetch(http.baseUrl, session, '/api/for-dig/goals');
    assert.equal(enGoalsRes.res.status, 200, enGoalsRes.text);
    const enMotivation = enGoalsRes.json.goals.find((g) => g.slug === 'motivation');
    assert.match(enMotivation.headline, /motivation/i);
    assert.notEqual(svMotivation.headline, enMotivation.headline);

    const slug = FOR_DIG_GOALS[0].slug;

    const favOn = await authFetch(http.baseUrl, session, '/api/for-dig/favorites', {
      method: 'POST',
      body: { goal_slug: slug },
    });
    assert.equal(favOn.res.status, 200, favOn.text);
    assert.equal(favOn.json.is_favorite, true);

    const favList = await authFetch(http.baseUrl, session, '/api/for-dig/favorites');
    assert.equal(favList.res.status, 200, favList.text);
    assert.ok(favList.json.goals.some((g) => g.goal_slug === slug));

    const favOff = await authFetch(http.baseUrl, session, '/api/for-dig/favorites', {
      method: 'POST',
      body: { goal_slug: slug },
    });
    assert.equal(favOff.res.status, 200, favOff.text);
    assert.equal(favOff.json.is_favorite, false);

    const popular = await authFetch(http.baseUrl, session, '/api/for-dig/popular?min_count=1');
    assert.equal(popular.res.status, 200, popular.text);
    assert.ok(Array.isArray(popular.json.goals));

    const suggestion = await authFetch(http.baseUrl, session, '/api/for-dig/feedback', {
      method: 'POST',
      body: {
        goal_slug: slug,
        phase: 'suggestion',
        free_text: 'Testförslag från integrationstest',
      },
    });
    assert.ok(suggestion.res.status === 200 || suggestion.res.status === 201, suggestion.text);

    const intent = await authFetch(http.baseUrl, session, '/api/for-dig/feedback', {
      method: 'POST',
      body: {
        goal_slug: slug,
        child_id: childId,
        phase: 'intent',
        intent_reason: 'tydligare_rutiner',
      },
    });
    assert.ok(intent.res.status === 200 || intent.res.status === 201, intent.text);

    const pending = await authFetch(http.baseUrl, session, '/api/for-dig/feedback/pending');
    assert.equal(pending.res.status, 200, pending.text);
    assert.ok(Array.isArray(pending.json));
  } finally {
    await http.close();
    await db.cleanup();
  }
});
