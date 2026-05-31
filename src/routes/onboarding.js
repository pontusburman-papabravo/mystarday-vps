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
const { requireFeature } = require('../middleware/feature-gate');
const { validate } = require('../middleware/validate');
const {
  OnboardingChildSchema,
  OnboardingScheduleSchema,
  OnboardingRewardSchema,
} = require('../lib/schemas');
const { getOrGenerateDailyLog, syncDailyLogWithSchedule } = require('../lib/daily-log-generator');

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
const TEMPLATE_GROUP_META = {
  forskola: { name: 'Förskola', icon: '🏫', description: 'Hel dag — barn 2–5 år' },
  skola:    { name: 'Skola',    icon: '📚', description: 'Hel dag — barn 6+ år' },
  morgon:   { name: 'Morgon',   icon: '☀️', description: 'Morgonrutin' },
  dag:      { name: 'Dag',      icon: '🌤️', description: 'Dag-aktiviteter' },
  kvall:    { name: 'Kväll',    icon: '🌙', description: 'Kvällsrutin' },
  helg:     { name: 'Helg',     icon: '🎉', description: 'Helgrutin' },
};
const VALID_TEMPLATE_GROUPS = Object.keys(TEMPLATE_GROUP_META);

// ─── POST /api/onboarding/child ──────────────────────────
// Creates a child with just name + emoji. Auto-generates PIN.
// Does NOT auto-create weekly schedules (onboarding step 2 handles that).
// Gates: child_creation_wizard feature. Admin bypass via requireFeature.
router.post('/child', requireParent, requireFeature('child_creation_wizard'), validate(OnboardingChildSchema), async (req, res) => {
  try {
    const { name, emoji, birthday, avatar_url } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: 'Barnets namn krävs' });
    }
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Välj en emoji för barnet' });
    }

    // Validate birthday format if provided
    let childBirthday = null;
    if (birthday && typeof birthday === 'string' && birthday.trim() !== '') {
      const birthDate = new Date(birthday);
      if (isNaN(birthDate.getTime())) {
        return res.status(400).json({ error: 'Ogiltigt datum för födelsedag' });
      }
      if (birthDate > new Date()) {
        return res.status(400).json({ error: 'Födelsedagen kan inte vara i framtiden' });
      }
      childBirthday = birthday.trim();
    }

    const childName = name.trim();

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

      // Insert child
      const childResult = await client.query(
        `INSERT INTO child (family_id, name, emoji, birthday, timezone, view_mode, pin, username, pin_fingerprint, avatar_url)
         VALUES ($1, $2, $3, $4, 'Europe/Stockholm', 'auto', $5, $6, $7, $8)
         RETURNING id, name, emoji, birthday, username, avatar_url, created_at`,
        [req.user.familyId, childName, emoji, childBirthday, pinHash, username, pinFp, avatar_url || null]
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
      require('../lib/analytics-tracker').trackFirstChildCreated(req.user.familyId);

      res.status(201).json({
        id: child.id,
        name: child.name,
        emoji: child.emoji,
        birthday: child.birthday,
        username: child.username,
        pin: rawPin, // show once so parent can note it
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ONBOARDING] child error:', err);
    res.status(500).json({ error: 'Något gick fel när barnet skapades.' });
  }
});

// School/preschool template groups — these only apply to weekdays (Mon–Fri).
// Weekends are left empty by default; the parent can opt in to Helg via weekend-schedule endpoint.
const SCHOOL_GROUPS = new Set(['forskola', 'skola', 'dag']);
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri (JS Date convention: 0=Sun, 6=Sat)
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// ─── POST /api/onboarding/schedule ───────────────────────
// Body: { child_id, template_group: 'forskola'|'skola'|'morgon'|'helg'|'kvall'|'dag' }
// Seeds weekly_schedule from admin-maintained default_schedule tables.
// School/preschool groups → weekdays only. Other groups → all 7 days.
router.post('/schedule', async (req, res) => {
  try {
    const { child_id, template_group } = req.body;

    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });
    if (!template_group || !VALID_TEMPLATE_GROUPS.includes(template_group)) {
      return res.status(400).json({ error: 'Ogiltigt val. Välj ett giltigt schema.' });
    }

    // Verify parent has access to this child
    const childAccess = await db.query(
      `SELECT c.id, c.family_id FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1 AND c.id = $2`,
      [req.user.id, child_id]
    );
    if (childAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }
    const familyId = childAccess.rows[0].family_id;

    // Map template_group key to default_schedule name (admin-maintained curated schedules)
    const GROUP_TO_SCHEDULE = {
      forskola: 'Förskola vardag',
      skola:    'Skola vardag',
      helg:     'Helg',
      morgon:   'Kort morgon',
      kvall:    'Kvällsrutin',
      dag:      'Förskola vardag', // "dag" has no dedicated schedule; use Förskola as sensible default
    };
    const defaultScheduleName = GROUP_TO_SCHEDULE[template_group] || 'Förskola vardag';

    // Look up the matching default_schedule
    const defaultSchedRow = await db.query(
      `SELECT id FROM default_schedule WHERE name = $1 LIMIT 1`,
      [defaultScheduleName]
    );
    if (defaultSchedRow.rows.length === 0) {
      return res.status(400).json({ error: 'Inga aktiviteter hittades för valt schema.' });
    }
    const defaultSchedId = defaultSchedRow.rows[0].id;

    // Fetch all items for this default schedule (include sub_steps for activity_sub_step creation)
    const defaultItems = await db.query(
      `SELECT name, icon, section, star_value, sort_order, start_time, end_time, sub_steps
       FROM default_schedule_item
       WHERE default_schedule_id = $1
       ORDER BY sort_order ASC`,
      [defaultSchedId]
    );
    if (defaultItems.rows.length === 0) {
      return res.status(400).json({ error: 'Inga aktiviteter hittades för valt schema.' });
    }

    const client = await db.getClient();
    let schedulesCreated = 0;
    try {
      await client.query('BEGIN');

      // Ensure category records exist for each section used
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
      const sectionsUsed = [...new Set(defaultItems.rows.map(r => r.section))];
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
      for (const item of defaultItems.rows) {
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
            `INSERT INTO activity_template (family_id, category_id, name, icon, star_value, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
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
          const schedResult = await client.query(
            `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
             VALUES ($1, $2, $3) RETURNING id`,
            [child_id, dow, dow]
          );
          scheduleId = schedResult.rows[0].id;
          schedulesCreated++;
        }

        let sortIdx = 0;
        for (const item of defaultItems.rows) {
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

      res.json({
        success: true,
        schedules_created: schedulesCreated,
        template_group,
        weekdays_only: SCHOOL_GROUPS.has(template_group),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ONBOARDING] schedule error:', err);
    res.status(500).json({ error: 'Något gick fel när schemat skapades.' });
  }
});

// ─── POST /api/onboarding/weekend-schedule ──────────────────
// Body: { child_id }
// Applies the "Helg" default schedule to Saturday (6) and Sunday (0).
// Called when parent opts in to adding a weekend schedule during onboarding.
router.post('/weekend-schedule', async (req, res) => {
  try {
    const { child_id } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });

    // Verify parent has access to this child
    const childAccess = await db.query(
      `SELECT c.id, c.family_id FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1 AND c.id = $2`,
      [req.user.id, child_id]
    );
    if (childAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }
    const familyId = childAccess.rows[0].family_id;

    // Look up the "Helg" default schedule
    const helgRow = await db.query(
      `SELECT id FROM default_schedule WHERE name = 'Helg' LIMIT 1`
    );
    if (helgRow.rows.length === 0) {
      return res.status(400).json({ error: 'Helgschemat hittades inte i biblioteket.' });
    }
    const helgSchedId = helgRow.rows[0].id;

    // Fetch all items for the Helg schedule
    const helgItems = await db.query(
      `SELECT name, icon, section, star_value, sort_order, start_time, end_time, sub_steps
       FROM default_schedule_item
       WHERE default_schedule_id = $1
       ORDER BY sort_order ASC`,
      [helgSchedId]
    );
    if (helgItems.rows.length === 0) {
      return res.status(400).json({ error: 'Helgschemat har inga aktiviteter.' });
    }

    const client = await db.getClient();
    let schedulesCreated = 0;
    try {
      await client.query('BEGIN');

      // Ensure categories exist
      const sectionToCategoryName = { morgon: 'Morgon', dag: 'Dag', kvall: 'Kväll', natt: 'Natt' };
      const categorySortOrder = { morgon: 0, dag: 1, kvall: 2, natt: 3 };
      const categoryMap = {};

      const existingCats = await client.query(
        'SELECT id, name FROM category WHERE family_id = $1',
        [familyId]
      );
      for (const ec of existingCats.rows) {
        categoryMap[ec.name] = ec.id;
      }

      const sectionsUsed = [...new Set(helgItems.rows.map(r => r.section))];
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
      const templateMap = {};
      for (const item of helgItems.rows) {
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
            `INSERT INTO activity_template (family_id, category_id, name, icon, star_value, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [familyId, catId, item.name, item.icon, item.star_value, item.sort_order]
          );
          const newTemplateId = inserted.rows[0].id;
          templateMap[item.name] = newTemplateId;

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

      // Create weekend schedule for Saturday (6) and Sunday (0)
      const weekendDays = [0, 6]; // Sunday and Saturday
      for (const dow of weekendDays) {
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
          const schedResult = await client.query(
            `INSERT INTO weekly_schedule (child_id, day_of_week, sort_order)
             VALUES ($1, $2, $3) RETURNING id`,
            [child_id, dow, dow]
          );
          scheduleId = schedResult.rows[0].id;
          schedulesCreated++;
        }

        let sortIdx = 0;
        for (const item of helgItems.rows) {
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
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[ONBOARDING] weekend-schedule error:', err);
    res.status(500).json({ error: 'Något gick fel när helgschemat skapades.' });
  }
});

// ─── POST /api/onboarding/reward ─────────────────────────
// Body: { name, icon, star_cost }
router.post('/reward', validate(OnboardingRewardSchema), async (req, res) => {
  try {
    const { name, icon, star_cost } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: 'Belöningens namn krävs' });
    }
    const cost = parseInt(star_cost, 10);
    if (isNaN(cost) || cost < 1) {
      return res.status(400).json({ error: 'Stjärnkostnad måste vara minst 1' });
    }

    const result = await db.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active)
       VALUES ($1, $2, $3, $4, false, true)
       RETURNING id, name, icon, star_cost`,
      [req.user.familyId, name.trim(), icon || '🎁', cost]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ONBOARDING] reward error:', err);
    res.status(500).json({ error: 'Något gick fel när belöningen skapades.' });
  }
});

// ─── GET /api/onboarding/rewards-preview ─────────────────
// Returns the admin's default rewards for the wizard reward-selection step.
router.get('/rewards-preview', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, icon, star_cost
       FROM default_reward
       ORDER BY sort_order ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[ONBOARDING] rewards-preview error:', err);
    res.status(500).json({ error: 'Kunde inte hämta belöningar.' });
  }
});

// ─── GET /api/onboarding/template-groups ──────────────────
// Returns all available template groups with activity counts from default_schedule.
// Uses default_schedule tables (reliable) instead of default_activity_template groups
// which were cleared by migration 050.
const SCHEDULE_TO_GROUP = {
  'Förskola vardag': 'forskola',
  'Skola vardag':    'skola',
  'Helg':            'helg',
  'Kort morgon':     'morgon',
  'Kvällsrutin':     'kvall',
};

router.get('/template-groups', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ds.name AS schedule_name, COUNT(dsi.id) AS count
       FROM default_schedule ds
       LEFT JOIN default_schedule_item dsi ON dsi.default_schedule_id = ds.id
       GROUP BY ds.name, ds.sort_order
       ORDER BY ds.sort_order ASC`
    );

    const groups = result.rows
      .map(r => {
        const grpKey = SCHEDULE_TO_GROUP[r.schedule_name];
        if (!grpKey || !TEMPLATE_GROUP_META[grpKey]) return null;
        return {
          key: grpKey,
          ...TEMPLATE_GROUP_META[grpKey],
          activity_count: parseInt(r.count, 10),
        };
      })
      .filter(Boolean);

    // Add 'dag' group (maps to Förskola vardag) if not already present
    if (!groups.find(g => g.key === 'dag') && TEMPLATE_GROUP_META['dag']) {
      const forskolaGroup = groups.find(g => g.key === 'forskola');
      groups.push({
        key: 'dag',
        ...TEMPLATE_GROUP_META['dag'],
        activity_count: forskolaGroup ? forskolaGroup.activity_count : 0,
      });
    }

    res.json(groups);
  } catch (err) {
    console.error('[ONBOARDING] template-groups error:', err);
    res.status(500).json({ error: 'Kunde inte hämta schemagrupper.' });
  }
});

// ─── GET /api/onboarding/schedule-preview ────────────────
// Returns activity names from the default library for schedule preview.
// Query: ?template=morning|evening|fullday&age=5  (legacy)
//    OR: ?group=forskola|skola|morgon|dag|kvall|helg  (new)
router.get('/schedule-preview', async (req, res) => {
  try {
    const { group } = req.query;

    if (!group || !VALID_TEMPLATE_GROUPS.includes(group)) {
      return res.status(400).json({ error: 'Ogiltigt val. Ange ?group=forskola|skola|helg|morgon|kvall|dag' });
    }

    // Map template_group to default_schedule name (same as schedule creation endpoint)
    const GROUP_TO_SCHEDULE = {
      forskola: 'Förskola vardag',
      skola:    'Skola vardag',
      helg:     'Helg',
      morgon:   'Kort morgon',
      kvall:    'Kvällsrutin',
      dag:      'Förskola vardag',
    };
    const schedName = GROUP_TO_SCHEDULE[group] || 'Förskola vardag';

    // Fetch items from default_schedule_item (reliable, not affected by migration 050)
    const result = await db.query(
      `SELECT dsi.name, dsi.icon, dsi.section AS category_name
       FROM default_schedule_item dsi
       JOIN default_schedule ds ON ds.id = dsi.default_schedule_id
       WHERE ds.name = $1
       ORDER BY dsi.sort_order ASC`,
      [schedName]
    );

    res.json({ activities: result.rows, schemaType: group, template: group });
  } catch (err) {
    console.error('[ONBOARDING] schedule-preview error:', err);
    res.status(500).json({ error: 'Kunde inte hämta schema.' });
  }
});

// ─── POST /api/onboarding/child-view ─────────────────────
// Saves view_type for the most recently created child.
// Called from onboarding wizard view-selection step.
// view_type: 'day' | 'timeline' (onboarding UI names)
// Mapped to DB values: 'day_sections' | 'now_next_later'
router.post('/child-view', async (req, res) => {
  try {
    const { child_id, view_type } = req.body;
    const validViewTypes = ['day', 'timeline', 'day_sections', 'now_next_later'];
    // Map onboarding UI names to canonical DB values
    const dbValueMap = { day: 'day_sections', timeline: 'now_next_later', day_sections: 'day_sections', now_next_later: 'now_next_later' };

    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });
    if (!view_type || !validViewTypes.includes(view_type)) {
      return res.status(400).json({ error: 'Ogiltig view_type. Välj dag eller tidslinje.' });
    }

    const dbViewType = dbValueMap[view_type] || 'day_sections';

    // Verify child belongs to this parent's family
    const check = await db.query(
      `SELECT c.id FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1 AND c.id = $2`,
      [req.user.id, child_id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Inte tillåtet' });
    }

    await db.query(
      'UPDATE child SET view_type = $1 WHERE id = $2',
      [dbViewType, child_id]
    );

    res.json({ success: true, view_type });
  } catch (err) {
    console.error('[ONBOARDING] child-view error:', err);
    res.status(500).json({ error: 'Kunde inte spara vy-val.' });
  }
});

// ─── POST /api/onboarding/update-pin ─────────────────────
// Allows parent to set a custom PIN for their child during onboarding.
// Body: { child_id, pin }
router.post('/update-pin', async (req, res) => {
  try {
    const { child_id, pin } = req.body;

    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });
    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN-koden måste vara exakt 4 siffror' });
    }

    // Reject weak PINs (all same digit)
    if (/^(\d)\1{3}$/.test(pin)) {
      return res.status(400).json({ error: 'Välj en starkare PIN-kod' });
    }

    // Verify parent has access to this child
    const childAccess = await db.query(
      `SELECT c.id, c.name FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1 AND c.id = $2`,
      [req.user.id, child_id]
    );
    if (childAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }

    const childName = childAccess.rows[0].name;

    // Check uniqueness (name + PIN combination)
    const pinFp = pinFingerprint(pin);
    const pinExists = await db.query(
      'SELECT id FROM child WHERE pin_fingerprint = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [pinFp, childName, child_id]
    );
    if (pinExists.rows.length > 0) {
      return res.status(409).json({ error: 'Denna PIN-kod är redan upptagen för ett barn med samma namn' });
    }

    // Hash and save
    const pinHash = await hashPassword(pin);
    await db.query(
      'UPDATE child SET pin = $1, pin_fingerprint = $2 WHERE id = $3',
      [pinHash, pinFp, child_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING] update-pin error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera PIN-koden.' });
  }
});

// ─── POST /api/onboarding/complete ───────────────────────
// Marks the parent's onboarding as done.
// Tracks funnel_onboarding_completed analytics event.
router.post('/complete', async (req, res) => {
  try {
    await db.query(
      'UPDATE parent SET onboarding_completed = true WHERE id = $1',
      [req.user.id]
    );
    // Analytics: funnel step — onboarding completed
    require('../lib/analytics-tracker').trackOnboardingCompleted(req.user.familyId);
    res.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING] complete error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;

