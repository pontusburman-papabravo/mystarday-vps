'use strict';

/**
 * Enable english_app + english_child_experience for an isolated test family.
 * Requires features rows from migrations (truncated DB tests re-seed in i18n-child-pack-flags).
 */
async function ensureEnglishFeatureRows(query) {
  await query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES
       ('english_app', 'English app', 'Parent/auth en-GB', 'dev', '{i18n}', 'high', 5, 8),
       ('english_child_experience', 'English child pack', 'child_en QA gate', 'dev', '{i18n}', 'high', 5, 8)
     ON CONFLICT (slug) DO UPDATE SET status = 'dev', updated_at = NOW()`
  );
}

async function setFamilyEnglishFlags(query, familyId, { childExperience = true } = {}) {
  await ensureEnglishFeatureRows(query);
  await query(
    `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_app')
     ON CONFLICT DO NOTHING`,
    [familyId]
  );
  if (childExperience) {
    await query(
      `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, 'english_child_experience')
       ON CONFLICT DO NOTHING`,
      [familyId]
    );
  }
}

async function clearFamilyEnglishChildFlag(query, familyId) {
  await query(
    `DELETE FROM family_features WHERE family_id = $1 AND feature_slug = 'english_child_experience'`,
    [familyId]
  );
}

/**
 * E2E DB truncates public tables after migrations — re-seed live barnets_samling row.
 * Live status makes the gate available to all families (no family_features row needed).
 */
async function ensureBarnetsSamlingLive(query) {
  await query(
    `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
     VALUES (
       'barnets_samling',
       'Barnets samling',
       'Child collection nav + Min samling',
       'live',
       '{barn,belöningar}',
       'high',
       6,
       24
     )
     ON CONFLICT (slug) DO UPDATE SET status = 'live', updated_at = NOW()`
  );
}

module.exports = {
  ensureEnglishFeatureRows,
  ensureBarnetsSamlingLive,
  setFamilyEnglishFlags,
  clearFamilyEnglishChildFlag,
};
