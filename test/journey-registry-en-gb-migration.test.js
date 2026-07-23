'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');

const REGISTRY_SEED = require('../config/journey-experience-registry.json');
const EN_TRANSLATIONS = require('../config/journey-en-GB-translations');
const migration4 = require('../migrations/1810000000004_journey_registry_en_gb_coach_expand');
const journeyRegistry = require('../db/journey-registry');

const VERSION = REGISTRY_SEED.version || '2026-06-30-first-week-v1';
const SWEDISH_RE = /[åäöÅÄÖ]/;

function listRegistryKeys() {
  const keys = [];
  for (const [phase, experiences] of Object.entries(REGISTRY_SEED.phases || {})) {
    for (const experienceKey of Object.keys(experiences)) {
      keys.push({ phase, experienceKey });
    }
  }
  return keys;
}

test('config journey-en-GB-translations matches registry seed (20/20)', () => {
  const keys = listRegistryKeys().map((x) => x.experienceKey);
  assert.equal(keys.length, 20);
  const missing = keys.filter((k) => !EN_TRANSLATIONS[k]);
  assert.equal(missing.length, 0, missing.join(', '));
  assert.equal(Object.keys(EN_TRANSLATIONS).length, 20);
  for (const key of keys) {
    const tr = EN_TRANSLATIONS[key];
    assert.ok(tr[0] && tr[0].trim(), `${key} headline empty`);
    assert.ok(tr[2] && tr[2].trim(), `${key} cta empty`);
  }
});

test('migration 0004 upgrades 19-row en-GB registry to 20/20 (deployed-DB path)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const migration3 = require('../migrations/1810000000003_journey_registry_locale_en_gb');
  const fas25 = require('../migrations/1808930000000_journey_fas2_5');

  try {
    const client = { query: (sql, params) => pg.query(sql, params) };

    // Simulate live DB state after deployed migration 0003 (immutable): Swedish + en-GB seed.
    await fas25.up(client);
    await migration3.up(client);

    await pg.query(
      `DELETE FROM journey_experience_registry
       WHERE locale = 'en-GB' AND experience_key = 'coach_expand'`
    );
    await pg.query(
      `UPDATE journey_experience_registry
       SET headline = 'SVENSK FALLBACK', body = 'Gammal rad', cta = 'Visa'
       WHERE locale = 'en-GB' AND experience_key = 'handoff_to_child'`
    );

    const beforeEn = await pg.query(
      `SELECT count(*)::int AS n FROM journey_experience_registry WHERE locale = 'en-GB'`
    );
    assert.equal(beforeEn.rows[0].n, 19);

    const beforeSv = await pg.query(
      `SELECT phase, experience_key, tone, headline, body, cta
       FROM journey_experience_registry
       WHERE locale IN ('sv-SE', 'sv')
       ORDER BY phase, experience_key`
    );

    await migration4.up(client);
    await migration4.up(client);

    const afterEn = await pg.query(
      `SELECT phase, experience_key, headline, body, cta
       FROM journey_experience_registry
       WHERE locale = 'en-GB' AND version = $1
       ORDER BY phase, experience_key`,
      [VERSION]
    );
    assert.equal(afterEn.rows.length, 20);

    const coach = afterEn.rows.find((r) => r.experience_key === 'coach_expand');
    assert.ok(coach, 'coach_expand en-GB row missing after migration');
    assert.equal(coach.headline, EN_TRANSLATIONS.coach_expand[0]);
    assert.equal(coach.cta, EN_TRANSLATIONS.coach_expand[2]);
    assert.doesNotMatch(coach.headline, SWEDISH_RE);

    const handoff = afterEn.rows.find((r) => r.experience_key === 'handoff_to_child');
    assert.equal(handoff.headline, EN_TRANSLATIONS.handoff_to_child[0]);
    assert.equal(handoff.cta, EN_TRANSLATIONS.handoff_to_child[2]);

    const dupCheck = await pg.query(
      `SELECT experience_key, count(*)::int AS n
       FROM journey_experience_registry
       WHERE locale = 'en-GB' AND version = $1
       GROUP BY experience_key
       HAVING count(*) > 1`,
      [VERSION]
    );
    assert.equal(dupCheck.rows.length, 0);

    const afterSv = await pg.query(
      `SELECT phase, experience_key, tone, headline, body, cta
       FROM journey_experience_registry
       WHERE locale IN ('sv-SE', 'sv')
       ORDER BY phase, experience_key`
    );
    assert.deepEqual(afterSv.rows, beforeSv.rows);

    const activeEn = await journeyRegistry.getActiveRegistry('en-GB');
    const keyCount = Object.values(activeEn.phases).reduce(
      (n, phase) => n + Object.keys(phase).length,
      0
    );
    assert.equal(keyCount, 20);
    assert.equal(
      activeEn.phases.ESTABLISHED_ROUTINE.coach_expand.headline,
      EN_TRANSLATIONS.coach_expand[0]
    );
  } finally {
    await db.cleanup();
  }
});
