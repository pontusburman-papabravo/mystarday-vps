/**
 * Onboarding routes — first-run wizard for new parents.
 *
 * Step 1: POST /api/onboarding/child           — create child (name + emoji)
 * Step 2: POST /api/onboarding/schedule        — apply routine template (weekdays only for school/preschool)
 *         POST /api/onboarding/weekend-schedule — apply Helg template to Sat+Sun
 * Step 3: POST /api/onboarding/reward          — create first reward
 *         POST /api/onboarding/complete        — mark onboarding done, return updated user
 *
 * Updated 2026-05-14: School schedules restricted to Mon–Fri; weekend schedule endpoint added.
 */

const express = require('express');
const db = require('../lib/db');
const { hashPassword, pinFingerprint } = require('../lib/hash');
const { requireParent } = require('../middleware/auth');
const authz = require('../middleware/authz');
const { requireFeature } = require('../middleware/feature-gate');
const { validate } = require('../middleware/validate');
const {
  OnboardingChildSchema,
  OnboardingScheduleSchema,
  OnboardingRewardSchema,
  OnboardingActivityGuideSchema,
} = require('../lib/schemas');
const { getOrGenerateDailyLog, syncDailyLogWithSchedule } = require('../lib/daily-log-generator');
const { checkChildNameInFamily } = require('../lib/family-duplicates');
const { fetchFamilyTimezone } = require('../lib/family-timezone');
const { avatarApiFields } = require('../lib/avatar-api');
const { SECTION_ORDER_SQL, sectionOrderClause } = require('../lib/default-schedule-order');
const {
  findResumableChildWithoutSchema,
} = require('../lib/onboarding-child-resume');
const {
  getFamilyLocale,
  sendOnboardingError,
  ERROR_KEYS,
} = require('../lib/onboarding-locale');
const { t } = require('../lib/i18n');
const { getStarterPlanDisplayName } = require('../../config/starter-plan-meta');
const {
  copyStandardScheduleToChild,
  mapCanonicalCopyErrorToHttp,
  TEMPLATE_GROUP_TO_CANONICAL_SCHEDULE,
  resolveCanonicalScheduleId,
} = require('../lib/canonical-library-runtime');

const router = express.Router();
router.use(requireParent);

// ─── Helpers ─────────────────────────────────────────────

function generateUsername(name) {
  const base = name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base}${suffix}`;
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Template group metadata (for dynamic wizard) ───────
const TEMPLATE_GROUP_ICONS = {
  forskola: '🏫',
  skola: '📚',
  morgon: '☀️',
  dag: '🌤️',
  kvall: '🌙',
  helg: '🎉',
};

/**
 * @param {string} lang
 * @returns {Record<string, { name: string, icon: string, description: string }>}
 */
function getTemplateGroupMeta(lang) {
  /** @type {Record<string, { name: string, icon: string, description: string }>} */
  const meta = {};
  for (const key of Object.keys(TEMPLATE_GROUP_ICONS)) {
    meta[key] = {
      name: t(lang, `onboarding.templateGroups.${key}.name`),
      icon: TEMPLATE_GROUP_ICONS[key],
      description: t(lang, `onboarding.templateGroups.${key}.description`),
    };
  }
  return meta;
}

const VALID_TEMPLATE_GROUPS = Object.keys(TEMPLATE_GROUP_ICONS);

// ─── POST /api/onboarding/child ──────────────────────────
// Creates a child with just name + emoji. Auto-generates PIN.
// Does NOT auto-create weekly schedules (onboarding step 2 handles that).
// Gates: child_creation_wizard feature. Admin bypass via requireFeature.
router.post('/child', requireParent, requireFeature('child_creation_wizard'), validate(OnboardingChildSchema), async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { name, emoji, birthday } = req.body;

    if (req.body.avatar_url !== undefined) {
      return sendOnboardingError(res, 400, lang, 'AVATAR_UPLOAD_PATH');
    }

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return sendOnboardingError(res, 400, lang, 'CHILD_NAME_REQUIRED');
    }
    if (!emoji || typeof emoji !== 'string') {
      return sendOnboardingError(res, 400, lang, 'EMOJI_REQUIRED');
    }

    // Validate birthday format if provided
    let childBirthday = null;
    if (birthday && typeof birthday === 'string' && birthday.trim() !== '') {
      const birthDate = new Date(birthday);
      if (isNaN(birthDate.getTime())) {
        return sendOnboardingError(res, 400, lang, 'INVALID_BIRTHDAY');
      }
      if (birthDate > new Date()) {
        return sendOnboardingError(res, 400, lang, 'BIRTHDAY_FUTURE');
      }
      childBirthday = birthday.trim();
    }

    const childName = name.trim();

    // Recoverable stuck state: child created, schedule never saved (retry / reinstall).
    // Rotate PIN so the parent can continue after losing the one-time display.
    const resumable = await findResumableChildWithoutSchema(db, req.user.familyId, childName);
    if (resumable) {
      let rawPin;
      let pinFp;
      let pinAttempts = 0;
      while (pinAttempts < 20) {
        rawPin = generatePin();
        if (/^(\d)\1{3}$/.test(rawPin)) { pinAttempts++; continue; }
        pinFp = pinFingerprint(rawPin);
        const pinExists = await db.query(
          'SELECT id FROM child WHERE pin_fingerprint = $1 AND LOWER(name) = LOWER($2) AND id != $3',
          [pinFp, childName, resumable.id]
        );
        if (pinExists.rows.length === 0) break;
        pinAttempts++;
      }
      const pinHash = await hashPassword(rawPin);
      const emojiToKeep = (emoji && typeof emoji === 'string') ? emoji : (resumable.emoji || '🌟');
      await db.query(
        'UPDATE child SET pin = $1, pin_fingerprint = $2, emoji = COALESCE($3, emoji) WHERE id = $4',
        [pinHash, pinFp, emojiToKeep, resumable.id]
      );

      require('../../db/analytics').track(req.user.familyId, 'onboarding_child_resumed', {
        child_id: resumable.id,
        reason: 'child_without_schema',
      });

      return res.status(200).json({
        id: resumable.id,
        name: resumable.name,
        emoji: emojiToKeep,
        birthday: resumable.birthday,
        username: resumable.username,
        pin: rawPin,
        resumed: true,
        code: 'RESUME_CHILD_WITHOUT_SCHEMA',
        ...avatarApiFields(resumable, 'child'),
      });
    }

    const dupName = await checkChildNameInFamily(db, childName, req.user.familyId);
    if (!dupName.ok) {
      return res.status(409).json({
        error: dupName.error,
        code: dupName.code,
        suggestions: dupName.suggestions,
      });
    }

    // Generate unique username
    let username = generateUsername(childName);
    let attempts = 0;
    while (attempts < 10) {
      const exists = await db.query(
        'SELECT id FROM child WHERE LOWER(username) = $1',
        [username.toLowerCase()]
      );
      if (exists.rows.length === 0) break;
      username = generateUsername(childName);
      attempts++;
    }

    // Auto-generate a safe PIN
    let rawPin;
    let pinFp;
    let pinAttempts = 0;
    while (pinAttempts < 20) {
      rawPin = generatePin();
      // Skip weak PINs
      if (/^(\d)\1{3}$/.test(rawPin)) { pinAttempts++; continue; }
      pinFp = pinFingerprint(rawPin);
      // Uniqueness is on (name + PIN) combination, not PIN alone.
      const pinExists = await db.query('SELECT id FROM child WHERE pin_fingerprint = $1 AND LOWER(name) = LOWER($2)', [pinFp, childName]);
      if (pinExists.rows.length === 0) break;
      pinAttempts++;
    }
    const pinHash = await hashPassword(rawPin);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM family WHERE id = $1 FOR UPDATE', [req.user.familyId]);
      const dupInside = await checkChildNameInFamily(client, childName, req.user.familyId);
      if (!dupInside.ok) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: dupInside.error,
          code: dupInside.code,
          suggestions: dupInside.suggestions,
        });
      }
      const familyTimezone = await fetchFamilyTimezone(client, req.user.familyId);
      const childResult = await client.query(
        `INSERT INTO child (family_id, name, emoji, birthday, timezone, view_mode, view_type, pin, username, pin_fingerprint)
         VALUES ($1, $2, $3, $4, $5, 'auto', 'now_next_later', $6, $7, $8)
         RETURNING id, name, emoji, birthday, view_type, username, avatar_storage_key, avatar_updated_at, created_at`,
        [req.user.familyId, childName, emoji, childBirthday, familyTimezone, pinHash, username, pinFp]
      );
      const child = childResult.rows[0];

      // Create parent-child relationship
      await client.query(
        'INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, $3)',
        [req.user.id, child.id, 'primary']
      );

      // Link other parents in the family
      const otherParents = await client.query(
        'SELECT id FROM parent WHERE family_id = $1 AND id != $2',
        [req.user.familyId, req.user.id]
      );
      for (const op of otherParents.rows) {
        await client.query(
          `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'shared')
           ON CONFLICT (parent_id, child_id) DO NOTHING`,
          [op.id, child.id]
        );
      }

      // Create streak record
      await client.query('INSERT INTO streak (child_id) VALUES ($1)', [child.id]);

      await client.query('COMMIT');

      // Analytics: funnel step — first child created during onboarding
      const tracker = require('../lib/analytics-tracker');
      tracker.trackFirstChildCreated(req.user.familyId);
      require('../../db/analytics').track(req.user.familyId, 'child_profile_created', {
        child_id: child.id,
      });
      require('../../db/analytics').track(req.user.familyId, 'child_pin_created', {
        child_id: child.id,
        source: 'onboarding_auto',
      });
      require('../lib/journey/ingest').ingestMilestoneAsync({
        familyId: req.user.familyId,
        milestone: 'child_created',
        childId: child.id,
      });
      require('../lib/activation-p0').updateActivationState(req.user.familyId, 'child_created', {
        at: child.created_at,
        metadata: { child_id: child.id, source: 'onboarding' },
      }).catch((err) => {
        console.error('[ONBOARDING] child_created activation state failed:', err.message);
      });
      const countResult = await db.query(
        'SELECT COUNT(*)::int AS n FROM child WHERE family_id = $1',
        [req.user.familyId]
      );
      if ((countResult.rows[0]?.n || 0) > 1) {
        require('../lib/journey/ingest').ingestMilestoneAsync({
          familyId: req.user.familyId,
          milestone: 'second_child_created',
          childId: child.id,
        });
      }

      res.status(201).json({
        id: child.id,
        name: child.name,
        emoji: child.emoji,
        birthday: child.birthday,
        username: child.username,
        pin: rawPin, // show once so parent can note it
        ...avatarApiFields(child, 'child'),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ONBOARDING] child error:', err);
    return sendOnboardingError(res, 500, lang, 'CHILD_CREATE_FAILED');
  }
});

// School/preschool template groups — these only apply to weekdays (Mon–Fri).
// Weekends are left empty by default; the parent can opt in to Helg via weekend-schedule endpoint.
const SCHOOL_GROUPS = new Set(['forskola', 'skola', 'dag']);
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri (JS Date convention: 0=Sun, 6=Sat)
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const ACTIVITY_GUIDE_PRESETS = {
  free_order: {
    require_sequential_completion: false,
    show_now_next: false,
    activity_timers_enabled: false,
  },
  one_at_a_time: {
    require_sequential_completion: true,
    show_now_next: true,
    activity_timers_enabled: false,
  },
  time_and_order: {
    require_sequential_completion: true,
    show_now_next: true,
    activity_timers_enabled: true,
  },
};

async function ingestRoutineAndSeededRewards(familyId) {
  const ingest = require('../lib/journey/ingest');
  const { ingestRewardsReadyIfSeeded } = require('../lib/journey/ingest-rewards-ready-if-seeded');
  try {
    await ingest.ingestMilestone({ familyId, milestone: 'routine_ready' });
    await ingestRewardsReadyIfSeeded(familyId);
  } catch (err) {
    console.error('[ONBOARDING] journey ingest after schedule failed:', err.message);
  }
}

/** ACT-1 slim/starter paths skip the activity-guide screen — enable NU/NÄSTA by default. */
async function applyOnboardingDefaultChildUxIfUnset(childId) {
  const row = await db.query(
    `SELECT show_now_next, require_sequential_completion
     FROM child WHERE id = $1`,
    [childId]
  );
  const child = row.rows[0];
  if (!child) return false;
  if (child.show_now_next === true || child.require_sequential_completion === true) {
    return false;
  }
  const preset = ACTIVITY_GUIDE_PRESETS.one_at_a_time;
  await db.query(
    `UPDATE child SET
       require_sequential_completion = $1,
       show_now_next = $2,
       activity_timers_enabled = $3
     WHERE id = $4`,
    [
      preset.require_sequential_completion,
      preset.show_now_next,
      preset.activity_timers_enabled,
      childId,
    ]
  );
  return true;
}

// ─── POST /api/onboarding/schedule ───────────────────────
// Body: { child_id, template_group: 'forskola'|'skola'|'morgon'|'helg'|'kvall'|'dag' }
// Seeds weekly_schedule from admin-maintained default_schedule tables.
// School/preschool groups → weekdays only. Other groups → all 7 days.
router.post('/schedule', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { child_id, template_group, custom_items, plan_edited_before_save, activity_count } = req.body;

    if (!child_id) return sendOnboardingError(res, 400, lang, 'CHILD_ID_REQUIRED');
    if (!template_group || !VALID_TEMPLATE_GROUPS.includes(template_group)) {
      return sendOnboardingError(res, 400, lang, 'INVALID_TEMPLATE');
    }

    // Verify parent has access to this child
    const childAccess = await authz.getChildAccess(req.user.id, child_id);
    if (!childAccess) {
      return sendOnboardingError(res, 403, lang, 'NO_CHILD_ACCESS');
    }
    const familyId = childAccess.family_id;
    const hasCustomItems = Array.isArray(custom_items) && custom_items.length > 0;

    if (!hasCustomItems) {
      const client = await db.getClient();
      let schedulesCreated = 0;
      try {
        await client.query('BEGIN');
        await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [child_id]);

        const beforeCount = await client.query(
          'SELECT COUNT(*)::int AS count FROM weekly_schedule WHERE child_id = $1',
          [child_id]
        );

        const callerVariants = req.body.variants && typeof req.body.variants === 'object'
          ? req.body.variants
          : null;
        const daysToSeed = SCHOOL_GROUPS.has(template_group) ? WEEKDAYS : ALL_DAYS;
        await copyStandardScheduleToChild(client, {
          familyId,
          childId: child_id,
          days: daysToSeed,
          overwrite: true,
          locale: lang,
          templateGroup: template_group,
          callerVariants,
          allowNonInteractiveAfterSchoolDefault: template_group === 'skola' && !callerVariants?.after_school,
          externalTransaction: true,
        });

        const afterCount = await client.query(
          'SELECT COUNT(*)::int AS count FROM weekly_schedule WHERE child_id = $1',
          [child_id]
        );
        schedulesCreated = Math.max(0, afterCount.rows[0].count - beforeCount.rows[0].count);

        await client.query('COMMIT');

        try {
          const childInfo = await db.query('SELECT timezone FROM child WHERE id = $1', [child_id]);
          const tz = childInfo.rows[0]?.timezone || 'Europe/Stockholm';
          const todayDow = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
          const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
          await syncDailyLogWithSchedule(child_id, dowMap[todayDow]);
        } catch (dlErr) {
          console.error('[ONBOARDING] Daily log sync after schedule change failed:', dlErr.message);
        }

        const { recordActivationMilestone } = require('../lib/activation-p0');
        let schemaNewlyRecorded = false;
        try {
          const schemaResult = await recordActivationMilestone(req.user.familyId, 'schema_saved', {
            metadata: {
              template_group,
              source: 'onboarding_schedule',
              plan_edited_before_save: plan_edited_before_save === true,
              activity_count: Number.isFinite(Number(activity_count)) ? Number(activity_count) : undefined,
            },
          });
          schemaNewlyRecorded = schemaResult.newlyRecorded;
        } catch (err) {
          console.error('[ONBOARDING] activation schema_saved error:', err.message);
        }

        const { markParentOnboardingComplete } = require('../lib/mark-parent-onboarding-complete');
        await markParentOnboardingComplete(req.user.id, familyId).catch((err) => {
          console.error('[ONBOARDING] mark onboarding complete after schema:', err.message);
        });
        await ingestRoutineAndSeededRewards(familyId);

        await applyOnboardingDefaultChildUxIfUnset(child_id).catch((err) => {
          console.error('[ONBOARDING] default child UX after schedule:', err.message);
        });

        return res.json({
          success: true,
          schedules_created: schedulesCreated,
          template_group,
          weekdays_only: SCHOOL_GROUPS.has(template_group),
          meta_milestones: schemaNewlyRecorded
            ? { tutorial_completion: true, flow: 'manual' }
            : {},
        });
      } catch (err) {
        await client.query('ROLLBACK');
        const mapped = mapCanonicalCopyErrorToHttp(err);
        if (mapped) return res.status(mapped.status).json(mapped.body);
        throw err;
      } finally {
        client.release();
      }
    }

    // Legacy path: ACT-1 starter plans with edited custom_items (NON_CANONICAL_SNAPSHOT).
    // User-edited snapshot content — name dedupe on activity_template is intentional here.
    // Base schedule rows are loaded by canonical_id only (never display name identity).
    const GROUP_TO_SCHEDULE = {
      forskola: 'Förskola vardag',
      skola: 'Skola vardag',
      helg: 'Helg',
      morgon: 'Kort morgon',
      kvall: 'Kvällsrutin',
      dag: 'Förskola vardag',
    };
    const canonicalScheduleId = resolveCanonicalScheduleId({ templateGroup: template_group });
    if (!canonicalScheduleId) {
      return sendOnboardingError(res, 400, lang, 'NO_ACTIVITIES');
    }
    const defaultScheduleName = GROUP_TO_SCHEDULE[template_group] || 'Förskola vardag';

    const defaultSchedRow = await db.query(
      `SELECT id FROM default_schedule WHERE canonical_id = $1 LIMIT 1`,
      [canonicalScheduleId]
    );
    if (defaultSchedRow.rows.length === 0) {
      return sendOnboardingError(res, 400, lang, 'NO_ACTIVITIES');
    }
    const defaultSchedId = defaultSchedRow.rows[0].id;

    // Fetch all items for this default schedule (include sub_steps for activity_sub_step creation)
    const defaultItems = await db.query(
      `SELECT name, icon, section, star_value, sort_order, start_time, end_time, sub_steps
       FROM default_schedule_item
       WHERE default_schedule_id = $1
       ORDER BY ${SECTION_ORDER_SQL}`,
      [defaultSchedId]
    );
    if (defaultItems.rows.length === 0) {
      return sendOnboardingError(res, 400, lang, 'NO_ACTIVITIES');
    }

    let seedItems = defaultItems.rows;
    if (Array.isArray(custom_items) && custom_items.length > 0) {
      seedItems = custom_items.map((item, idx) => {
        const base = defaultItems.rows[idx] || defaultItems.rows[defaultItems.rows.length - 1];
        return {
          name: item.name || base.name,
          icon: item.icon || base.icon,
          section: item.section || base.section,
          star_value: item.star_value ?? base.star_value ?? 1,
          sort_order: item.sort_order ?? idx,
          start_time: item.start_time ?? base.start_time,
          end_time: item.end_time ?? base.end_time,
          sub_steps: item.sub_steps || base.sub_steps || [],
        };
      });
    }

    const client = await db.getClient();
    let schedulesCreated = 0;
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [child_id]);
      const sectionToCategoryName = { morgon: 'Morgon', dag: 'Dag', kvall: 'Kväll', natt: 'Natt' };
      const categorySortOrder = { morgon: 0, dag: 1, kvall: 2, natt: 3 };
      const categoryMap = {};

      // Load existing categories
      const existingCats = await client.query(
        'SELECT id, name FROM category WHERE family_id = $1',
        [familyId]
      );
      for (const ec of existingCats.rows) {
        categoryMap[ec.name] = ec.id;
      }

      // Create missing categories
      const sectionsUsed = [...new Set(seedItems.map(r => r.section))];
      for (const sec of sectionsUsed) {
        const catName = sectionToCategoryName[sec] || 'Dag';
        if (!categoryMap[catName]) {
          const catResult = await client.query(
            `INSERT INTO category (family_id, name, sort_order, is_default)
             VALUES ($1, $2, $3, true) RETURNING id`,
            [familyId, catName, categorySortOrder[sec] ?? 99]
          );
          categoryMap[catName] = catResult.rows[0].id;
        }
      }

      // Ensure activity_template records exist (upsert by name+family)
      // Also create activity_sub_step records from default_schedule_item.sub_steps JSONB
      const templateMap = {}; // name → activity_template.id
      for (const item of seedItems) {
        const catName = sectionToCategoryName[item.section] || 'Dag';
        const catId = categoryMap[catName];

        const existing = await client.query(
          `SELECT id FROM activity_template WHERE family_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
          [familyId, item.name]
        );
        if (existing.rows.length > 0) {
          templateMap[item.name] = existing.rows[0].id;

          // Backfill sub-steps if template exists but has none
          const subSteps = item.sub_steps || [];
          if (Array.isArray(subSteps) && subSteps.length > 0) {
            const existingSubs = await client.query(
              'SELECT COUNT(*) AS cnt FROM activity_sub_step WHERE activity_template_id = $1',
              [existing.rows[0].id]
            );
            if (parseInt(existingSubs.rows[0].cnt, 10) === 0) {
              for (let si = 0; si < subSteps.length; si++) {
                await client.query(
                  `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
                   VALUES ($1, $2, $3, $4)`,
                  [existing.rows[0].id, subSteps[si].name, subSteps[si].icon || null, si]
                );
              }
            }
          }
        } else {
          const inserted = await client.query(
            `INSERT INTO activity_template (family_id, category_id, name, icon, star_value, sort_order, source)
             VALUES ($1, $2, $3, $4, $5, $6, 'admin') RETURNING id`,
            [familyId, catId, item.name, item.icon, item.star_value, item.sort_order]
          );
          const newTemplateId = inserted.rows[0].id;
          templateMap[item.name] = newTemplateId;

          // Create sub-steps from default_schedule_item.sub_steps JSONB
          const subSteps = item.sub_steps || [];
          if (Array.isArray(subSteps) && subSteps.length > 0) {
            for (let si = 0; si < subSteps.length; si++) {
              await client.query(
                `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
                 VALUES ($1, $2, $3, $4)`,
                [newTemplateId, subSteps[si].name, subSteps[si].icon || null, si]
              );
            }
          }
        }
      }

      // School/preschool → weekdays only (Mon–Fri); others → all 7 days
      const daysToSeed = SCHOOL_GROUPS.has(template_group) ? WEEKDAYS : ALL_DAYS;
      for (const dow of daysToSeed) {
        // Upsert schedule — clear existing items if already exists
        const existingSched = await client.query(
          'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
          [child_id, dow]
        );

        let scheduleId;
        if (existingSched.rows.length > 0) {
          scheduleId = existingSched.rows[0].id;
          await client.query(
            'DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
            [scheduleId]
          );
        } else {
          try {
            const schedResult = await client.query(
              `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
               VALUES ($1, $2, $3) RETURNING id`,
              [child_id, dow, dow]
            );
            scheduleId = schedResult.rows[0].id;
            schedulesCreated++;
          } catch (insertErr) {
            const { isWeeklyScheduleDowUniqueViolation } = require('../../lib/activation-first-completion');
            if (!isWeeklyScheduleDowUniqueViolation(insertErr)) throw insertErr;
            const again = await client.query(
              'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
              [child_id, dow]
            );
            if (again.rows.length === 0) throw insertErr;
            scheduleId = again.rows[0].id;
            await client.query(
              'DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
              [scheduleId]
            );
          }
        }

        let sortIdx = 0;
        for (const item of seedItems) {
          const tplId = templateMap[item.name];
          if (!tplId) continue;
          await client.query(
            `INSERT INTO weekly_schedule_item
               (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [scheduleId, tplId, item.start_time || null, item.end_time || null, sortIdx++, item.section]
          );
        }
      }

      await client.query('COMMIT');

      // Regenerate today's daily log to reflect the new schedule immediately
      try {
        const childInfo = await db.query('SELECT timezone FROM child WHERE id = $1', [child_id]);
        const tz = childInfo.rows[0]?.timezone || 'Europe/Stockholm';
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz });
        const todayDow = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
        const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        await syncDailyLogWithSchedule(child_id, dowMap[todayDow]);
      } catch (dlErr) {
        // Non-critical: midnight scheduler will catch up
        console.error('[ONBOARDING] Daily log sync after schedule change failed:', dlErr.message);
      }

      const { recordActivationMilestone } = require('../lib/activation-p0');
      const act1StarterPlan = Array.isArray(custom_items) && custom_items.length > 0;
      let schemaNewlyRecorded = false;
      try {
        const schemaResult = await recordActivationMilestone(req.user.familyId, 'schema_saved', {
          metadata: {
            template_group,
            source: 'onboarding_schedule',
            plan_edited_before_save: plan_edited_before_save === true,
            activity_count: Number.isFinite(Number(activity_count))
              ? Number(activity_count)
              : (Array.isArray(custom_items) ? custom_items.length : undefined),
          },
        });
        schemaNewlyRecorded = schemaResult.newlyRecorded;
      } catch (err) {
        console.error('[ONBOARDING] activation schema_saved error:', err.message);
      }
      // Always mark signup complete once a schedule is saved. Leaving this gated on
      // custom_items caused auth to force parents back to /onboarding after handoff
      // film / reinstall (child already exists, cannot leave step 1).
      const { markParentOnboardingComplete } = require('../lib/mark-parent-onboarding-complete');
      await markParentOnboardingComplete(req.user.id, familyId).catch((err) => {
        console.error('[ONBOARDING] mark onboarding complete after schema:', err.message);
      });
      await ingestRoutineAndSeededRewards(familyId);

      await applyOnboardingDefaultChildUxIfUnset(child_id).catch((err) => {
        console.error('[ONBOARDING] default child UX after schedule:', err.message);
      });

      res.json({
        success: true,
        schedules_created: schedulesCreated,
        template_group,
        weekdays_only: SCHOOL_GROUPS.has(template_group),
        meta_milestones: schemaNewlyRecorded
          ? { tutorial_completion: true, flow: act1StarterPlan ? 'wizard' : 'manual' }
          : {},
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ONBOARDING] schedule error:', err);
    return sendOnboardingError(res, 500, lang, 'SCHEDULE_CREATE_FAILED');
  }
});

// ─── POST /api/onboarding/weekend-schedule ──────────────────
// Body: { child_id }
// Applies the "Helg" default schedule to Saturday (6) and Sunday (0).
// Called when parent opts in to adding a weekend schedule during onboarding.
router.post('/weekend-schedule', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { child_id } = req.body;
    if (!child_id) return sendOnboardingError(res, 400, lang, 'CHILD_ID_REQUIRED');

    // Verify parent has access to this child
    const childAccess = await authz.getChildAccess(req.user.id, child_id);
    if (!childAccess) {
      return sendOnboardingError(res, 403, lang, 'NO_CHILD_ACCESS');
    }
    const familyId = childAccess.family_id;

    const client = await db.getClient();
    let schedulesCreated = 0;
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [child_id]);

      const beforeCount = await client.query(
        'SELECT COUNT(*)::int AS count FROM weekly_schedule WHERE child_id = $1 AND day_of_week IN (0, 6)',
        [child_id]
      );

      await copyStandardScheduleToChild(client, {
        familyId,
        childId: child_id,
        days: [0, 6],
        overwrite: true,
        locale: lang,
        templateGroup: 'helg',
        externalTransaction: true,
      });

      const afterCount = await client.query(
        'SELECT COUNT(*)::int AS count FROM weekly_schedule WHERE child_id = $1 AND day_of_week IN (0, 6)',
        [child_id]
      );
      schedulesCreated = Math.max(0, afterCount.rows[0].count - beforeCount.rows[0].count);

      await client.query('COMMIT');

      // Sync today's daily log if today is a weekend day
      try {
        const childInfo = await db.query('SELECT timezone FROM child WHERE id = $1', [child_id]);
        const tz = childInfo.rows[0]?.timezone || 'Europe/Stockholm';
        const todayDow = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
        const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const todayDowNum = dowMap[todayDow];
        if (todayDowNum === 0 || todayDowNum === 6) {
          await syncDailyLogWithSchedule(child_id, todayDowNum);
        }
      } catch (dlErr) {
        console.error('[ONBOARDING] Daily log sync after weekend schedule failed:', dlErr.message);
      }

      res.json({ success: true, schedules_created: schedulesCreated });
    } catch (err) {
      await client.query('ROLLBACK');
      const mapped = mapCanonicalCopyErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ONBOARDING] weekend-schedule error:', err);
    return sendOnboardingError(res, 500, lang, 'WEEKEND_CREATE_FAILED');
  }
});

// ─── POST /api/onboarding/reward ─────────────────────────
// Body: { name, icon, star_cost }
router.post('/reward', validate(OnboardingRewardSchema), async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { name, icon, star_cost } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return sendOnboardingError(res, 400, lang, 'REWARD_NAME_REQUIRED');
    }
    const cost = parseInt(star_cost, 10);
    if (isNaN(cost) || cost < 1) {
      return sendOnboardingError(res, 400, lang, 'REWARD_COST_MIN');
    }

    const result = await db.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active)
       VALUES ($1, $2, $3, $4, false, true)
       RETURNING id, name, icon, star_cost`,
      [req.user.familyId, name.trim(), icon || '🎁', cost]
    );

    require('../lib/journey/ingest').ingestMilestoneAsync({
      familyId: req.user.familyId,
      milestone: 'rewards_ready',
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ONBOARDING] reward error:', err);
    return sendOnboardingError(res, 500, lang, 'REWARD_CREATE_FAILED');
  }
});

// ─── GET /api/onboarding/rewards-preview ─────────────────
// Returns the admin's default rewards for the wizard reward-selection step.
router.get('/rewards-preview', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const result = await db.query(
      `SELECT id, name, icon, star_cost
       FROM default_reward
       ORDER BY sort_order ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[ONBOARDING] rewards-preview error:', err);
    return sendOnboardingError(res, 500, lang, 'REWARDS_FETCH_FAILED');
  }
});

// ─── GET /api/onboarding/template-groups ──────────────────
// Returns all available template groups with activity counts from default_schedule.
// Uses default_schedule tables (reliable) instead of default_activity_template groups
// which were cleared by migration 050.
const CANONICAL_TO_TEMPLATE_GROUP = Object.fromEntries(
  Object.entries(TEMPLATE_GROUP_TO_CANONICAL_SCHEDULE).map(([group, canonicalId]) => [canonicalId, group])
);

router.get('/template-groups', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const templateGroupMeta = getTemplateGroupMeta(lang);
    const result = await db.query(
      `SELECT ds.canonical_id, COUNT(dsi.id) AS count
       FROM default_schedule ds
       LEFT JOIN default_schedule_item dsi ON dsi.default_schedule_id = ds.id
       WHERE ds.canonical_id IS NOT NULL
       GROUP BY ds.canonical_id, ds.sort_order
       ORDER BY ds.sort_order ASC`
    );

    const groups = result.rows
      .map(r => {
        const grpKey = CANONICAL_TO_TEMPLATE_GROUP[r.canonical_id];
        if (!grpKey || !templateGroupMeta[grpKey]) return null;
        const activityCount = parseInt(r.count, 10);
        if (!activityCount) return null;
        return {
          key: grpKey,
          ...templateGroupMeta[grpKey],
          activity_count: activityCount,
        };
      })
      .filter(Boolean);

    // Add 'dag' group (maps to Förskola vardag) if not already present and usable
    if (!groups.find(g => g.key === 'dag') && templateGroupMeta['dag']) {
      const forskolaGroup = groups.find(g => g.key === 'forskola');
      if (forskolaGroup && forskolaGroup.activity_count > 0) {
        groups.push({
          key: 'dag',
          ...templateGroupMeta['dag'],
          activity_count: forskolaGroup.activity_count,
        });
      }
    }

    res.json(groups);
  } catch (err) {
    console.error('[ONBOARDING] template-groups error:', err);
    return sendOnboardingError(res, 500, lang, 'TEMPLATE_GROUPS_FAILED');
  }
});

// ─── GET /api/onboarding/schedule-preview ────────────────
// Returns activity names from the default library for schedule preview.
// Query: ?template=morning|evening|fullday&age=5  (legacy)
//    OR: ?group=forskola|skola|morgon|dag|kvall|helg  (new)
router.get('/schedule-preview', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { group } = req.query;

    if (!group || !VALID_TEMPLATE_GROUPS.includes(group)) {
      return sendOnboardingError(res, 400, lang, 'INVALID_TEMPLATE');
    }

    const canonicalScheduleId = resolveCanonicalScheduleId({ templateGroup: group });
    if (!canonicalScheduleId) {
      return sendOnboardingError(res, 404, lang, 'NO_ACTIVITIES');
    }

    const result = await db.query(
      `SELECT dsi.name, dsi.icon, dsi.section AS category_name
       FROM default_schedule_item dsi
       JOIN default_schedule ds ON ds.id = dsi.default_schedule_id
       WHERE ds.canonical_id = $1
       ORDER BY ${sectionOrderClause('dsi')}`,
      [canonicalScheduleId]
    );

    res.json({ activities: result.rows, schemaType: group, template: group });
  } catch (err) {
    console.error('[ONBOARDING] schedule-preview error:', err);
    return sendOnboardingError(res, 500, lang, 'SCHEDULE_PREVIEW_FAILED');
  }
});

// ─── POST /api/onboarding/child-view ─────────────────────
// Saves view_type for the most recently created child.
// Called from onboarding wizard view-selection step.
// view_type: 'day' | 'timeline' (onboarding UI names)
// Mapped to DB values: 'day_sections' | 'now_next_later'
router.post('/child-view', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { child_id, view_type } = req.body;
    const validViewTypes = ['day', 'timeline', 'day_sections', 'now_next_later'];
    // Map onboarding UI names to canonical DB values
    const dbValueMap = { day: 'day_sections', timeline: 'now_next_later', day_sections: 'day_sections', now_next_later: 'now_next_later' };

    if (!child_id) return sendOnboardingError(res, 400, lang, 'CHILD_ID_REQUIRED');
    if (!view_type || !validViewTypes.includes(view_type)) {
      return sendOnboardingError(res, 400, lang, 'INVALID_VIEW_TYPE');
    }

    const dbViewType = dbValueMap[view_type] || 'now_next_later';

    // Verify child belongs to this parent's family
    const check = await authz.getChildAccess(req.user.id, child_id);
    if (!check) {
      return sendOnboardingError(res, 403, lang, 'NOT_ALLOWED');
    }

    await db.query(
      'UPDATE child SET view_type = $1 WHERE id = $2',
      [dbViewType, child_id]
    );

    res.json({ success: true, view_type });
  } catch (err) {
    console.error('[ONBOARDING] child-view error:', err);
    return sendOnboardingError(res, 500, lang, 'VIEW_SAVE_FAILED');
  }
});

// ─── POST /api/onboarding/child-activity-guide ───────────
// Parent picks how the child completes daily activities (onboarding defaults).
router.post('/child-activity-guide', validate(OnboardingActivityGuideSchema), async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { child_id, mode } = req.body;
    const preset = ACTIVITY_GUIDE_PRESETS[mode];
    if (!preset) {
      return sendOnboardingError(res, 400, lang, 'INVALID_CHOICE');
    }

    const check = await authz.getChildAccess(req.user.id, child_id);
    if (!check) {
      return sendOnboardingError(res, 403, lang, 'NOT_ALLOWED');
    }

    await db.query(
      `UPDATE child SET
         require_sequential_completion = $1,
         show_now_next = $2,
         activity_timers_enabled = $3
       WHERE id = $4`,
      [
        preset.require_sequential_completion,
        preset.show_now_next,
        preset.activity_timers_enabled,
        child_id,
      ]
    );

    res.json({ success: true, mode });
  } catch (err) {
    console.error('[ONBOARDING] child-activity-guide error:', err);
    return sendOnboardingError(res, 500, lang, 'ACTIVITY_GUIDE_SAVE_FAILED');
  }
});

// ─── POST /api/onboarding/update-pin ─────────────────────
// Allows parent to set a custom PIN for their child during onboarding.
// Body: { child_id, pin }
router.post('/update-pin', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { child_id, pin } = req.body;

    if (!child_id) return sendOnboardingError(res, 400, lang, 'CHILD_ID_REQUIRED');
    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return sendOnboardingError(res, 400, lang, 'PIN_MUST_BE_4');
    }

    // Reject weak PINs (all same digit)
    if (/^(\d)\1{3}$/.test(pin)) {
      return sendOnboardingError(res, 400, lang, 'PIN_TOO_WEAK');
    }

    // Verify parent has access to this child
    const childAccess = await authz.getChildAccess(req.user.id, child_id);
    if (!childAccess) {
      return sendOnboardingError(res, 403, lang, 'NO_CHILD_ACCESS');
    }

    const childName = childAccess.name;

    // Check uniqueness (name + PIN combination)
    const pinFp = pinFingerprint(pin);
    const pinExists = await db.query(
      'SELECT id FROM child WHERE pin_fingerprint = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [pinFp, childName, child_id]
    );
    if (pinExists.rows.length > 0) {
      return sendOnboardingError(res, 409, lang, 'PIN_TAKEN');
    }

    // Hash and save
    const pinHash = await hashPassword(pin);
    await db.query(
      'UPDATE child SET pin = $1, pin_fingerprint = $2 WHERE id = $3',
      [pinHash, pinFp, child_id]
    );

    const analytics = require('../../db/analytics');
    analytics.track(req.user.familyId, 'child_pin_created', { child_id, source: 'onboarding_custom' });

    res.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING] update-pin error:', err);
    return sendOnboardingError(res, 500, lang, 'PIN_UPDATE_FAILED');
  }
});

// ─── GET /api/onboarding/handoff-context ─────────────────
// Read-only resume context for ?resume=child-handoff (PR 3). No PIN — hashed server-side.
router.get('/handoff-context', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const activationDb = require('../../db/family-activation-state');
    const state = await activationDb.getByFamilyId(req.user.familyId);
    const childRow = await db.query(
      `SELECT id, name, username FROM child WHERE family_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [req.user.familyId]
    );
    const child = childRow.rows[0] || null;

    if (!state?.schema_saved_at) {
      return res.json({ can_resume_handoff: false, reason: 'no_schema' });
    }
    if (state.child_access_completed_at) {
      return res.json({ can_resume_handoff: false, reason: 'child_access_done' });
    }
    if (state.first_completion_at || state.p0_activated_at) {
      return res.json({ can_resume_handoff: false, reason: 'completion_or_p0_done' });
    }
    if (!child?.id) {
      return res.json({ can_resume_handoff: false, reason: 'no_child' });
    }

    return res.json({
      can_resume_handoff: true,
      reason: 'schema_saved_no_child_access',
      child_id: child.id,
      child_name: child.name,
      child_username: child.username,
    });
  } catch (err) {
    console.error('[ONBOARDING] handoff-context error:', err);
    return sendOnboardingError(res, 500, lang, 'HANDOFF_CONTEXT_FAILED');
  }
});

// ─── POST /api/onboarding/child-access-complete ──────────
// Deprecated: parent handoff clicks are not verified child access.
// child_access_completed_at is written only by verified child login (POST /api/auth/child-login).
router.post('/child-access-complete', async (req, res) => {
  res.json({
    success: true,
    deprecated: true,
    message: 'child_access_completed_at is only set by verified child login',
  });
});

// ─── POST /api/onboarding/complete ───────────────────────
// Marks the parent's onboarding as done (auth/routing only).
// DO NOT USE onboarding_completed FOR PRODUCT LOGIC — use journey_phase / milestones
router.post('/complete', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { resolveFamilyEntitlements } = require('../lib/family-entitlements');
    const {
      markLimitedOnboardingBootstrapFinished,
    } = require('../lib/limited-onboarding-access');
    const { markParentOnboardingComplete } = require('../lib/mark-parent-onboarding-complete');
    const { premium, requires_paywall } = await resolveFamilyEntitlements(req.user.familyId);

    await markParentOnboardingComplete(req.user.id, req.user.familyId);

    if (requires_paywall && !premium.active) {
      await markLimitedOnboardingBootstrapFinished(req.user.familyId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING] complete error:', err);
    return sendOnboardingError(res, 500, lang, 'GENERIC');
  }
});

// ─── ACT-1 starter plan (PR 3 — template-first, no AI) ───

router.post('/starter-plan/suggest', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { isActivationFlagEnabled, FLAG_KEYS } = require('../lib/activation-flags');
    if (!await isActivationFlagEnabled(FLAG_KEYS.onboarding, req.user.familyId)) {
      return sendOnboardingError(res, 403, lang, 'ACTIVATION_NOT_ENABLED');
    }
    const { parseStarterPlanAnswers, slugToTemplateGroup } = require('../lib/starter-plan/slug-to-template-group');
    const { selectStarterTemplate } = require('../lib/starter-plan/select-template');
    const { setActivationVariant } = require('../lib/activation-p0');
    const analytics = require('../../db/analytics');

    const input = parseStarterPlanAnswers(req.body);
    const plan = selectStarterTemplate(input);
    const template_group = slugToTemplateGroup(plan.slug);

    const aiEnabled = await isActivationFlagEnabled(FLAG_KEYS.aiStarterPlan, req.user.familyId);
    const variant = aiEnabled ? 'template_plus_ai' : 'template_only';
    await setActivationVariant(req.user.familyId, variant);
    analytics.track(req.user.familyId, 'starter_template_selected', {
      slug: plan.slug,
      schedule_name: plan.scheduleName,
      template_group,
      routine_type: input.routineType,
      age_band: input.ageBand,
      support_level: input.supportLevel,
      desired_length: input.desiredLength,
      used_ai: aiEnabled,
      variant,
    });

    res.json({
      ...plan,
      displayName: getStarterPlanDisplayName(lang, plan.slug),
      template_group,
      used_ai: aiEnabled,
      variant,
    });
  } catch (err) {
    console.error('[ONBOARDING] starter-plan/suggest error:', err);
    return sendOnboardingError(res, 500, lang, 'STARTER_SUGGEST_FAILED');
  }
});

router.get('/starter-plan/preview', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const scheduleName = req.query.scheduleName;
    const desiredLength = req.query.desiredLength || 'normal';
    if (!scheduleName || typeof scheduleName !== 'string') {
      return sendOnboardingError(res, 400, lang, 'SCHEDULE_NAME_REQUIRED');
    }

    const canonicalScheduleId = resolveCanonicalScheduleId({ legacyScheduleName: scheduleName });
    if (!canonicalScheduleId) {
      return sendOnboardingError(res, 404, lang, 'TEMPLATE_NOT_FOUND');
    }

    const sched = await db.query(
      'SELECT id FROM default_schedule WHERE canonical_id = $1 LIMIT 1',
      [canonicalScheduleId]
    );
    if (sched.rows.length === 0) {
      return sendOnboardingError(res, 404, lang, 'TEMPLATE_NOT_FOUND');
    }

    const items = await db.query(
      `SELECT name, icon, section, star_value, sort_order, start_time, end_time
       FROM default_schedule_item
       WHERE default_schedule_id = $1
       ORDER BY ${SECTION_ORDER_SQL}`,
      [sched.rows[0].id]
    );

    const { enforceActivityCount } = require('../lib/starter-plan/select-template');
    const trimmed = enforceActivityCount(items.rows, desiredLength);

    const analytics = require('../../db/analytics');
    analytics.track(req.user.familyId, 'starter_plan_preview_viewed', {
      schedule_name: scheduleName,
      activity_count: trimmed.length,
      desired_length: desiredLength,
    });

    res.json({
      schedule_name: scheduleName,
      items: trimmed,
      activity_count: trimmed.length,
    });
  } catch (err) {
    console.error('[ONBOARDING] starter-plan/preview error:', err);
    return sendOnboardingError(res, 500, lang, 'STARTER_PREVIEW_FAILED');
  }
});

router.post('/starter-plan/personalize', async (req, res) => {
  const lang = await getFamilyLocale(req.user.familyId);
  try {
    const { isActivationFlagEnabled, FLAG_KEYS } = require('../lib/activation-flags');
    const { parseStarterPlanAnswers } = require('../lib/starter-plan/slug-to-template-group');
    const { generateStarterPlan, buildFallback } = require('../lib/starter-plan/generate-plan');
    const { setActivationVariant } = require('../lib/activation-p0');
    const analytics = require('../../db/analytics');

    if (!await isActivationFlagEnabled(FLAG_KEYS.onboarding, req.user.familyId)) {
      return sendOnboardingError(res, 403, lang, 'ACTIVATION_NOT_ENABLED');
    }

    const { child_name, schedule_name, base_items } = req.body;
    const parsed = parseStarterPlanAnswers(req.body);
    const aiEnabled = await isActivationFlagEnabled(FLAG_KEYS.aiStarterPlan, req.user.familyId);

    analytics.track(req.user.familyId, 'starter_plan_generation_started', {
      schedule_name: schedule_name,
      ai_enabled: aiEnabled,
    });

    const baseItems = Array.isArray(base_items) ? base_items : [];
    const genInput = {
      childName: child_name,
      ageBand: parsed.ageBand,
      routineType: parsed.routineType,
      mainChallenges: parsed.mainChallenges,
      supportLevel: parsed.supportLevel,
      desiredLength: parsed.desiredLength,
      freeText: parsed.freeText,
      baseItems,
      scheduleName: schedule_name,
    };

    let result;
    if (aiEnabled) {
      await setActivationVariant(req.user.familyId, 'template_plus_ai');
      result = await generateStarterPlan(genInput);
    } else {
      result = buildFallback(genInput, baseItems, 'AI_DISABLED');
    }

    if (aiEnabled && result.used_ai) {
      analytics.track(req.user.familyId, 'starter_plan_generation_succeeded', {
        schedule_name: schedule_name,
        activity_count: result.items.length,
      });
    } else if (aiEnabled) {
      analytics.track(req.user.familyId, 'starter_plan_generation_failed', {
        reason: result.fallback_reason || 'unknown',
        schedule_name: schedule_name,
      });
    }

    res.json({
      plan_title: result.planTitle,
      intro_text: result.introText,
      items: result.items,
      used_ai: result.used_ai,
      fallback_reason: result.fallback_reason,
    });
  } catch (err) {
    console.error('[ONBOARDING] starter-plan/personalize error:', err);
    return sendOnboardingError(res, 500, lang, 'STARTER_PERSONALIZE_FAILED');
  }
});

module.exports = router;

