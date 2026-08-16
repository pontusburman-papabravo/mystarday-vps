'use strict';

const {
  copyStandardScheduleToChild,
  LEGACY_SCHEDULE_NAME_TO_CANONICAL,
  CanonicalCopyError,
  CANONICAL_SCHEDULE_NOT_FOUND,
} = require('./canonical-library-runtime');
const { getFamilyLocale } = require('./onboarding-locale');

function getDb() {
  return require('./db');
}

function resolveDefaultScheduleName(birthday) {
  let name = 'Förskola vardag';
  if (!birthday) return name;

  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return name;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age >= 6) name = 'Skola vardag';
  return name;
}

/**
 * Seed weekly schedule from canonical Standard Library via shared copy engine.
 * Best-effort: callers should catch errors so child creation still succeeds.
 *
 * @returns {Promise<{ seeded: boolean, defaultScheduleName: string }>}
 */
async function seedChildDefaultSchedule({ childId, familyId, birthday }) {
  const defaultScheduleName = resolveDefaultScheduleName(birthday);
  const canonicalScheduleId = LEGACY_SCHEDULE_NAME_TO_CANONICAL[defaultScheduleName];
  if (!canonicalScheduleId) {
    return { seeded: false, defaultScheduleName };
  }

  const db = getDb();
  const locale = familyId ? await getFamilyLocale(familyId) : 'sv-SE';
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const result = await copyStandardScheduleToChild(client, {
      familyId,
      childId,
      days: [1, 2, 3, 4, 5],
      overwrite: true,
      locale,
      legacyScheduleName: defaultScheduleName,
      allowNonInteractiveAfterSchoolDefault: true,
      externalTransaction: true,
    });
    await client.query('COMMIT');

    if (!result.filledDays.length) {
      return { seeded: false, defaultScheduleName };
    }

    if (familyId) {
      const { updateActivationState } = require('./activation-p0');
      updateActivationState(familyId, 'schema_saved', {
        metadata: {
          source: 'child_default_schedule_seed',
          default_schedule: defaultScheduleName,
          canonical_schedule_id: result.scheduleCanonicalId,
        },
      }).catch((err) => {
        console.error('[SEED-SCHEDULE] schema_saved milestone error:', err.message);
      });
    }

    return { seeded: true, defaultScheduleName };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof CanonicalCopyError && err.code === CANONICAL_SCHEDULE_NOT_FOUND) {
      return { seeded: false, defaultScheduleName };
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  resolveDefaultScheduleName,
  seedChildDefaultSchedule,
};
