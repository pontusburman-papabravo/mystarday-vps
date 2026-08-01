'use strict';

const { hashPassword, comparePassword } = require('../../src/lib/hash');
const { wipeQaFamilyData } = require('./rc1-qa-reset-manifest');
const {
  assertExistingRc1QaFixtureContract,
  inspectRc1QaFixtureState,
} = require('./rc1-qa-fixture-contract');
const {
  RC1_QA_FAMILY_NAME,
  RC1_QA_PARENT_EMAIL,
  RC1_QA_CHILD_DISPLAY_NAME,
  RC1_QA_CHILD_USERNAME,
  assertRc1QaFixtureEmail,
  normalizeEmail,
  isRc1QaEmailDomain,
} = require('../../test/support/rc1-qa-fixture');

const ACTIVITIES = [
  ['Wake up', '⏰', 1, 'morgon'],
  ['Brush teeth', '🪥', 1, 'morgon'],
  ['School', '🏫', 2, 'dag'],
  ['Dinner', '🍽️', 1, 'kvall'],
  ['Bedtime', '🌙', 1, 'kvall'],
];

const REWARDS = [
  ['Screen time', '📺', 15],
  ['Ice cream', '🍦', 10],
];

const PIN_RE = /^\d{4}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stockholmToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(d);
}

function validatePrepareEnv(env, { dryRun = false } = {}) {
  if (!dryRun && !env.DATABASE_URL) {
    const err = new Error('DATABASE_URL required');
    err.code = 'RC1_PREPARE_MISSING_DATABASE_URL';
    throw err;
  }

  if (dryRun) {
    const qaEmail = normalizeEmail(RC1_QA_PARENT_EMAIL);
    assertRc1QaFixtureEmail(qaEmail);
    return { dryRun: true, qaEmail };
  }

  const qaEmail = normalizeEmail(env.RC1_QA_EMAIL || RC1_QA_PARENT_EMAIL);
  assertRc1QaFixtureEmail(qaEmail);
  if (!isRc1QaEmailDomain(qaEmail)) {
    const err = new Error('RC1 QA prepare: email domain guard failed');
    err.code = 'RC1_PREPARE_DOMAIN_GUARD';
    throw err;
  }

  const parentPassword = env.RC1_QA_PASSWORD;
  const childPin = env.RC1_CHILD_PIN;
  const parentPin = env.RC1_PARENT_PIN;
  const expectedFamilyId = (env.RC1_QA_FAMILY_ID || '').trim() || null;

  if (!parentPassword) {
    const err = new Error('RC1_QA_PASSWORD required');
    err.code = 'RC1_PREPARE_MISSING_SECRET';
    throw err;
  }
  if (!childPin || !PIN_RE.test(childPin)) {
    const err = new Error('RC1_CHILD_PIN invalid');
    err.code = 'RC1_PREPARE_INVALID_CHILD_PIN';
    throw err;
  }
  if (!parentPin || !PIN_RE.test(parentPin)) {
    const err = new Error('RC1_PARENT_PIN invalid');
    err.code = 'RC1_PREPARE_INVALID_PARENT_PIN';
    throw err;
  }
  if (expectedFamilyId && !UUID_RE.test(expectedFamilyId)) {
    const err = new Error('RC1_QA_FAMILY_ID invalid UUID');
    err.code = 'RC1_PREPARE_INVALID_FAMILY_ID';
    throw err;
  }

  return {
    dryRun: false,
    qaEmail,
    parentPassword,
    childPin,
    parentPin,
    expectedFamilyId,
  };
}

async function verifyParentPinInTransaction(client, { familyId, parentId, pin }) {
  const result = await client.query(
    'SELECT id, family_id, parent_pin_hash FROM parent WHERE id = $1',
    [parentId]
  );
  const row = result.rows[0];
  if (!row || row.family_id !== familyId || !row.parent_pin_hash) {
    return false;
  }
  return comparePassword(pin, row.parent_pin_hash);
}

async function clearSessionsAndHandoff(client, familyId) {
  await client.query('DELETE FROM parent_session_handoff WHERE family_id = $1', [familyId]);
  await client.query(
    `DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)
       OR child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    'DELETE FROM pin_lockout WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)',
    [familyId]
  );
}

async function seedMinimalFixture(client, { familyId, childId, activityIds }) {
  for (const dow of [1, 2, 3, 4, 5]) {
    const sched = await client.query(
      'INSERT INTO weekly_schedule (child_id, family_id, day_of_week) VALUES ($1, $2, $3) RETURNING id',
      [childId, familyId, dow]
    );
    let sort = 0;
    for (const [name] of ACTIVITIES) {
      const section = ACTIVITIES.find((a) => a[0] === name)[3];
      await client.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
         VALUES ($1, $2, $3, $4)`,
        [sched.rows[0].id, activityIds[name], sort++, section]
      );
    }
  }

  const today = stockholmToday(0);
  const log = await client.query(
    'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
    [childId, today]
  );
  let sort = 0;
  for (const [name, icon, stars, section] of ACTIVITIES) {
    const done = section === 'morgon';
    await client.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, section,
         sort_order, completed, completed_at, completed_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        log.rows[0].id, activityIds[name], name, icon, stars, section, sort++,
        done, done ? new Date() : null, today,
      ]
    );
  }

  for (const [i, [name, icon, cost]] of REWARDS.entries()) {
    await client.query(
      'INSERT INTO reward (family_id, name, icon, star_cost, sort_order) VALUES ($1, $2, $3, $4, $5)',
      [familyId, name, icon, cost, i]
    );
  }
}

/**
 * @returns {Promise<object>} result payload (no secrets)
 */
async function runRc1QaPrepareTransaction(client, config) {
  const {
    qaEmail,
    parentPassword,
    childPin,
    parentPin,
    expectedFamilyId,
  } = config;

  const passwordHash = await hashPassword(parentPassword);
  const childPinHash = await hashPassword(childPin);
  const parentPinHash = await hashPassword(parentPin);

  const pinHashSelfOk = await comparePassword(parentPin, parentPinHash);
  if (!pinHashSelfOk) {
    throw new Error('RC1 QA prepare: parent PIN hash self-check failed before write');
  }

  let familyId;
  let parentId;
  let childId;

  const existingParents = await client.query(
    'SELECT id, family_id FROM parent WHERE LOWER(email) = LOWER($1)',
    [qaEmail]
  );
  if (existingParents.rows.length > 1) {
    throw new Error('RC1 QA prepare: multiple parents match fixture email');
  }

  if (existingParents.rows.length === 1) {
    parentId = existingParents.rows[0].id;
    familyId = existingParents.rows[0].family_id;
    await assertExistingRc1QaFixtureContract(client, {
      qaEmail,
      parentId,
      familyId,
      expectedFamilyId,
    });
  }

  await client.query('BEGIN');

  try {
    if (existingParents.rows.length === 1) {
      await client.query(
        `UPDATE family SET name = $1, timezone = 'Europe/Stockholm', preferred_locale = 'en-GB',
           locale_selection_source = 'admin', locale_selected_at = NOW(), is_lifetime_free = true
         WHERE id = $2`,
        [RC1_QA_FAMILY_NAME, familyId]
      );
      await client.query(
        `UPDATE parent SET password_hash = $1, name = 'RC1 QA Parent', verified = true, onboarding_completed = true
         WHERE id = $2`,
        [passwordHash, parentId]
      );
    } else {
      const fam = await client.query(
        `INSERT INTO family (name, timezone, preferred_locale, locale_selection_source, locale_selected_at, is_lifetime_free)
         VALUES ($1, 'Europe/Stockholm', 'en-GB', 'admin', NOW(), true) RETURNING id`,
        [RC1_QA_FAMILY_NAME]
      );
      familyId = fam.rows[0].id;
      const par = await client.query(
        `INSERT INTO parent (family_id, email, password_hash, name, verified, onboarding_completed)
         VALUES ($1, $2, $3, 'RC1 QA Parent', true, true) RETURNING id`,
        [familyId, qaEmail, passwordHash]
      );
      parentId = par.rows[0].id;
    }

    if (expectedFamilyId && expectedFamilyId !== familyId) {
      throw new Error('RC1 QA prepare: RC1_QA_FAMILY_ID does not match resolved fixture family');
    }

    for (const slug of ['english_app', 'english_child_experience']) {
      await client.query(
        `INSERT INTO family_features (family_id, feature_slug) VALUES ($1, $2)
         ON CONFLICT (family_id, feature_slug) DO NOTHING`,
        [familyId, slug]
      );
    }

    await client.query(
      `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
       VALUES ($1, 'lifetime_free', NULL, $2::jsonb)
       ON CONFLICT (family_id) DO UPDATE SET
         tier = EXCLUDED.tier,
         components = EXCLUDED.components`,
      [familyId, JSON.stringify([{ slug: 'basic_app', has: true }])]
    );

    await client.query(
      'UPDATE parent SET parent_pin_hash = $1, updated_at = NOW() WHERE id = $2',
      [parentPinHash, parentId]
    );

    const pinInTx = await verifyParentPinInTransaction(client, { familyId, parentId, pin: parentPin });
    if (!pinInTx) {
      throw new Error('RC1 QA prepare: parent PIN verification failed in transaction (before commit)');
    }

    await clearSessionsAndHandoff(client, familyId);
    await wipeQaFamilyData(client, familyId);

    const childRow = await client.query(
      'SELECT id FROM child WHERE family_id = $1 AND username = $2',
      [familyId, RC1_QA_CHILD_USERNAME]
    );
    if (childRow.rows.length > 1) {
      throw new Error('RC1 QA prepare: duplicate child username in QA family');
    }
    if (childRow.rows.length === 1) {
      childId = childRow.rows[0].id;
      await client.query(
        `UPDATE child SET name = $1, emoji = '⭐', birthday = '2018-01-15', pin = $2 WHERE id = $3`,
        [RC1_QA_CHILD_DISPLAY_NAME, childPinHash, childId]
      );
    } else {
      const ch = await client.query(
        `INSERT INTO child (family_id, name, emoji, birthday, username, pin)
         VALUES ($1, $2, '⭐', '2018-01-15', $3, $4) RETURNING id`,
        [familyId, RC1_QA_CHILD_DISPLAY_NAME, RC1_QA_CHILD_USERNAME, childPinHash]
      );
      childId = ch.rows[0].id;
    }

    await client.query(
      `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')
       ON CONFLICT DO NOTHING`,
      [parentId, childId]
    );

    const activityIds = {};
    for (const [i, [name, icon, stars, section]] of ACTIVITIES.entries()) {
      const act = await client.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, time_group, sort_order, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'user') RETURNING id`,
        [familyId, name, icon, stars, section, i]
      );
      activityIds[name] = act.rows[0].id;
    }

    await seedMinimalFixture(client, { familyId, childId, activityIds });

    await client.query('COMMIT');

    return {
      ok: true,
      family_id: familyId,
      child_username: RC1_QA_CHILD_USERNAME,
      fixture_verified: true,
      prep_pin_verified_against_database: true,
      preferred_locale: 'en-GB',
      english_child_experience: true,
      reporting_component: false,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function runRc1QaPrepareDryRunInspect(client, config) {
  const { qaEmail, expectedFamilyId } = config;
  const inspection = await inspectRc1QaFixtureState(client, { qaEmail, expectedFamilyId });
  return {
    dry_run: true,
    prepare_mode: 'dry-run',
    ...inspection,
    child_username: RC1_QA_CHILD_USERNAME,
    planned_actions: inspection.would_create
      ? ['create family + parent', 'seed fixture', 'wipe manifest tables']
      : inspection.guard_status === 'contract_ok'
        ? ['reset manifest', 'reseed minimal schedule', 'verify PIN in transaction']
        : [],
  };
}

module.exports = {
  ACTIVITIES,
  REWARDS,
  validatePrepareEnv,
  verifyParentPinInTransaction,
  runRc1QaPrepareTransaction,
  runRc1QaPrepareDryRunInspect,
  stockholmToday,
};
