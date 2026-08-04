'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { experiencePackIdForLocale } = require('../src/lib/locale');
const { isEnglishAppEnabled, isEnglishChildExperienceEnabled } = require('../src/lib/i18n-flags');
const { resolvePackIdForChild, clearPackCache } = require('../src/lib/experience-pack');

test('english_child_experience pack gating', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const pg = require('../src/lib/db');
  let familyId;
  let childId;

  try {
    // Migrations seed features once; setupTestDb truncates features between tests.
    await pg.query(
      `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
       VALUES
         ('english_app', 'English app', 'Parent/auth en-GB', 'dev', '{i18n}', 'high', 5, 8),
         ('english_child_experience', 'English child pack', 'child_en QA gate', 'dev', '{i18n}', 'high', 5, 8)
       ON CONFLICT (slug) DO UPDATE SET status = 'dev', updated_at = NOW()`
    );

    const fam = await pg.query(
      `INSERT INTO family (name, preferred_locale) VALUES ('Pack Gate Test', 'en-GB') RETURNING id`
    );
    familyId = fam.rows[0].id;
    const child = await pg.query(
      `INSERT INTO child (family_id, name, emoji) VALUES ($1, 'Test', '⭐') RETURNING id`,
      [familyId]
    );
    childId = child.rows[0].id;

    assert.equal(experiencePackIdForLocale('en-GB'), 'child_se');
    assert.equal(await isEnglishAppEnabled(familyId), true);
    assert.equal(await isEnglishChildExperienceEnabled(familyId), false);
    assert.equal(await resolvePackIdForChild(childId), 'child_se');

    await pg.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_app')
       ON CONFLICT DO NOTHING`,
      [familyId]
    );
    assert.equal(await isEnglishAppEnabled(familyId), true);
    assert.equal(await isEnglishChildExperienceEnabled(familyId), false);
    assert.equal(await resolvePackIdForChild(childId), 'child_se');

    await pg.query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_child_experience')
       ON CONFLICT DO NOTHING`,
      [familyId]
    );
    assert.equal(await isEnglishChildExperienceEnabled(familyId), true);
    assert.equal(await resolvePackIdForChild(childId), 'child_en');
  } finally {
    if (childId) await pg.query('DELETE FROM child WHERE id = $1', [childId]);
    if (familyId) {
      await pg.query('DELETE FROM family_features WHERE family_id = $1', [familyId]);
      await pg.query('DELETE FROM family WHERE id = $1', [familyId]);
    }
    clearPackCache();
    await db.cleanup();
  }
});
