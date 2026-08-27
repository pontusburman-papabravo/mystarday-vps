/**
 * Standard Library routes — browse & copy admin-created default activities, rewards, and schedules.
 *
 * Activities are returned as a FLAT list (no category grouping).
 * Parents can copy individual activities or batches to their own library.
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { syncDailyLogWithSchedule } = require('../lib/daily-log-generator');
const { broadcast } = require('../lib/sse-broadcast');
const {
  copyStandardActivityToFamily,
  familyHasCanonicalActivity,
  mapCanonicalCopyErrorToHttp,
} = require('../lib/standard-library-family-seed');
const { applyScheduleSourceToChildPlan, ScheduleApplyError } = require('../lib/schedule-apply');
const { getFamilyLocale } = require('../lib/onboarding-locale');
const {
  CONTENT_SCOPE,
  localizeActivityItems,
  localizeRewardItems,
  localizeStandardSchedules,
} = require('../lib/family-content-display');

const STANDARD_LIBRARY_SCOPE = { contentScope: CONTENT_SCOPE.STANDARD_LIBRARY };

const router = express.Router();
router.use(requireParent);
// Gate 2K: standardbibliotek — all parent-facing routes require feature access
router.use(requireFeature('standardbibliotek'));

// ─── GET /api/standard-library ─────────────────────────────
// Returns all default activities as a flat list with copy status per family.
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, icon, star_value, sort_order, sub_steps, canonical_id
       FROM default_activity_template
       ORDER BY sort_order ASC, name ASC`
    );

    const familyActivities = await db.query(
      `SELECT source_canonical_id FROM activity_template
       WHERE family_id = $1 AND source_canonical_id IS NOT NULL`,
      [req.user.familyId]
    );
    const existingCanonical = new Set(familyActivities.rows.map((a) => a.source_canonical_id));

    const activities = result.rows.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      star_value: a.star_value,
      sort_order: a.sort_order,
      sub_steps: a.sub_steps || [],
      already_copied: a.canonical_id ? existingCanonical.has(a.canonical_id) : false,
    }));

    const locale = await getFamilyLocale(req.user.familyId);
    res.json(await localizeActivityItems(activities, locale, 'sv-SE', STANDARD_LIBRARY_SCOPE));
  } catch (err) {
    console.error('[STANDARD-LIBRARY] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/activities/copy-batch ─────────
// Copies multiple default activities into the parent's family library
router.post('/activities/copy-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Inga aktiviteter valda.' });
    }

    // Fetch all requested default activities
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const defaults = await db.query(
      `SELECT id, name, icon, star_value, sub_steps, seven_questions, canonical_id
       FROM default_activity_template WHERE id IN (${placeholders})`,
      ids
    );
    if (defaults.rows.length === 0) {
      return res.status(404).json({ error: 'Inga av de valda aktiviteterna hittades.' });
    }

    const locale = await getFamilyLocale(req.user.familyId);
    const toCopy = [];
    for (const act of defaults.rows) {
      if (!act.canonical_id) {
        return res.status(400).json({ error: 'Aktiviteten saknar canonical identitet.' });
      }
      const exists = await familyHasCanonicalActivity(db, req.user.familyId, act.canonical_id);
      if (!exists) toCopy.push(act);
    }

    if (toCopy.length === 0) {
      return res.status(409).json({ error: 'Alla valda aktiviteter finns redan i ditt bibliotek.' });
    }

    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const act of toCopy) {
        await copyStandardActivityToFamily(client, {
          familyId: req.user.familyId,
          defaultActivityId: act.id,
          canonicalActivityId: act.canonical_id,
          locale,
          sortOrder: nextOrder++,
          externalTransaction: true,
        });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      const mapped = mapCanonicalCopyErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw err;
    } finally {
      client.release();
    }

    const skipped = ids.length - toCopy.length;
    let message = `${toCopy.length} ${toCopy.length === 1 ? 'aktivitet kopierad' : 'aktiviteter kopierade'}`;
    if (skipped > 0) message += ` (${skipped} redan i biblioteket)`;

    res.status(201).json({ message, copied: toCopy.length, skipped });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Batch activity copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/activities/:id/copy ───────────
// Copies a single default activity into the parent's family library
router.post('/activities/:id/copy', async (req, res) => {
  try {
    const { id } = req.params;

    const defaultAct = await db.query(
      `SELECT id, name, icon, star_value, sub_steps, seven_questions, canonical_id
       FROM default_activity_template WHERE id = $1`,
      [id]
    );
    if (defaultAct.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte.' });
    }

    const act = defaultAct.rows[0];
    if (!act.canonical_id) {
      return res.status(400).json({ error: 'Aktiviteten saknar canonical identitet.' });
    }

    const locale = await getFamilyLocale(req.user.familyId);
    if (await familyHasCanonicalActivity(db, req.user.familyId, act.canonical_id)) {
      return res.status(409).json({ error: `Du har redan "${act.name}" i ditt bibliotek.` });
    }

    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    const nextOrder = parseInt(maxSort.rows[0].next_order, 10);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      await copyStandardActivityToFamily(client, {
        familyId: req.user.familyId,
        defaultActivityId: act.id,
        canonicalActivityId: act.canonical_id,
        locale,
        sortOrder: nextOrder,
        externalTransaction: true,
      });

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      const mapped = mapCanonicalCopyErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({ message: `"${act.name}" har kopierats till ditt bibliotek!` });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Activity copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── Backward compat: POST /api/standard-library/:group/copy ─────
// Legacy route that copies all activities into the parent's library.
// Kept for backward compatibility but now copies all default activities regardless of group.
router.post('/:group/copy', async (req, res) => {
  try {
    // Fetch all default activities
    const activities = await db.query(
      `SELECT id, name, icon, star_value, sub_steps, seven_questions, canonical_id
       FROM default_activity_template
       WHERE canonical_id IS NOT NULL
       ORDER BY sort_order ASC`
    );

    if (activities.rows.length === 0) {
      return res.status(404).json({ error: 'Inga aktiviteter hittades.' });
    }

    const locale = await getFamilyLocale(req.user.familyId);
    const toCopy = [];
    for (const act of activities.rows) {
      const exists = await familyHasCanonicalActivity(db, req.user.familyId, act.canonical_id);
      if (!exists) toCopy.push(act);
    }

    if (toCopy.length === 0) {
      return res.status(409).json({ error: 'Alla aktiviteter finns redan i ditt bibliotek.' });
    }

    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM activity_template WHERE family_id = $1`,
      [req.user.familyId]
    );
    let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const act of toCopy) {
        await copyStandardActivityToFamily(client, {
          familyId: req.user.familyId,
          defaultActivityId: act.id,
          canonicalActivityId: act.canonical_id,
          locale,
          sortOrder: nextOrder++,
          externalTransaction: true,
        });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      const mapped = mapCanonicalCopyErrorToHttp(err);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: `${toCopy.length} aktiviteter har kopierats till ditt bibliotek!`,
      activities_copied: toCopy.length,
    });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/standard-library/rewards ─────────────────────
// Returns all default rewards with copy status
router.get('/rewards', async (req, res) => {
  try {
    const defaultRewards = await db.query(
      `SELECT id, name, icon, star_cost, sort_order
       FROM default_reward
       ORDER BY sort_order ASC`
    );

    const familyRewards = await db.query(
      `SELECT source_default_id FROM reward
       WHERE family_id = $1 AND source_default_id IS NOT NULL`,
      [req.user.familyId]
    );
    const copiedIds = new Set(familyRewards.rows.map(r => r.source_default_id));

    const rewards = defaultRewards.rows.map(r => ({
      ...r,
      already_copied: copiedIds.has(r.id),
    }));

    const locale = await getFamilyLocale(req.user.familyId);
    res.json(await localizeRewardItems(rewards, locale, 'sv-SE', STANDARD_LIBRARY_SCOPE));
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Rewards list error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/rewards/copy-batch ─────────
// Copies multiple default rewards into the parent's family library
router.post('/rewards/copy-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Inga belöningar valda.' });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const defaultRewards = await db.query(
      `SELECT id, name, icon, star_cost FROM default_reward WHERE id IN (${placeholders})`,
      ids
    );
    if (defaultRewards.rows.length === 0) {
      return res.status(404).json({ error: 'Inga av de valda belöningarna hittades.' });
    }

    const existingCopies = await db.query(
      `SELECT source_default_id FROM reward WHERE family_id = $1 AND source_default_id = ANY($2::uuid[])`,
      [req.user.familyId, ids]
    );
    const alreadyCopiedIds = new Set(existingCopies.rows.map(r => r.source_default_id));

    const toCopy = defaultRewards.rows.filter(r => !alreadyCopiedIds.has(r.id));

    if (toCopy.length === 0) {
      return res.status(409).json({ error: 'Alla valda belöningar finns redan i ditt bibliotek.' });
    }

    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM reward WHERE family_id = $1`,
      [req.user.familyId]
    );
    let nextOrder = parseInt(maxSort.rows[0].max_order, 10) + 1;

    for (const r of toCopy) {
      await db.query(
        `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, sort_order, source_default_id, modified_by_family)
         VALUES ($1, $2, $3, $4, false, true, $5, $6, false)`,
        [req.user.familyId, r.name, r.icon, r.star_cost, nextOrder++, r.id]
      );
    }

    const skipped = ids.length - toCopy.length;
    let message = `${toCopy.length} ${toCopy.length === 1 ? 'belöning kopierad' : 'belöningar kopierade'}`;
    if (skipped > 0) message += ` (${skipped} redan i biblioteket)`;

    res.status(201).json({ message, copied: toCopy.length, skipped });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Batch reward copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/rewards/:id/copy ───────────
// Copies a single default reward into the parent's family library
router.post('/rewards/:id/copy', async (req, res) => {
  try {
    const { id } = req.params;

    const defaultReward = await db.query(
      `SELECT id, name, icon, star_cost FROM default_reward WHERE id = $1`,
      [id]
    );
    if (defaultReward.rows.length === 0) {
      return res.status(404).json({ error: 'Standardbelöningen hittades inte.' });
    }

    const r = defaultReward.rows[0];

    const existing = await db.query(
      `SELECT id FROM reward WHERE family_id = $1 AND source_default_id = $2`,
      [req.user.familyId, id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Du har redan en kopia av "${r.name}" i ditt bibliotek.` });
    }

    const maxSort = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM reward WHERE family_id = $1`,
      [req.user.familyId]
    );
    const nextOrder = parseInt(maxSort.rows[0].next_order, 10);

    await db.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, sort_order, source_default_id, modified_by_family)
       VALUES ($1, $2, $3, $4, false, true, $5, $6, false)`,
      [req.user.familyId, r.name, r.icon, r.star_cost, nextOrder, r.id]
    );

    res.status(201).json({ message: `"${r.name}" har kopierats till ditt belöningsbibliotek!` });
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Reward copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/standard-library/schedules ─────────────────
// Returns all admin-created standard schedules with items.
// Single JOIN query to avoid N+1 — items grouped in-memory.
router.get('/schedules', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT ds.id AS schedule_id, ds.name AS schedule_name, ds.description, ds.icon AS schedule_icon, ds.sort_order AS schedule_sort,
              dsi.id AS item_id, dsi.name AS item_name, dsi.icon AS item_icon, dsi.section,
              dsi.star_value, dsi.start_time, dsi.end_time, dsi.sort_order AS item_sort, dsi.sub_steps
       FROM default_schedule ds
       LEFT JOIN default_schedule_item dsi ON dsi.default_schedule_id = ds.id
       ORDER BY ds.sort_order ASC,
                CASE dsi.section WHEN 'morgon' THEN 0 WHEN 'dag' THEN 1 WHEN 'kvall' THEN 2 ELSE 3 END,
                dsi.sort_order ASC`
    );

    // Group items by schedule in a single pass
    const scheduleMap = new Map();
    for (const row of rows.rows) {
      if (!scheduleMap.has(row.schedule_id)) {
        scheduleMap.set(row.schedule_id, {
          id: row.schedule_id,
          name: row.schedule_name,
          description: row.description,
          icon: row.schedule_icon,
          sort_order: row.schedule_sort,
          items: [],
        });
      }
      if (row.item_id) {
        scheduleMap.get(row.schedule_id).items.push({
          id: row.item_id,
          name: row.item_name,
          icon: row.item_icon,
          section: row.section,
          star_value: row.star_value,
          start_time: row.start_time,
          end_time: row.end_time,
          sort_order: row.item_sort,
          sub_steps: row.sub_steps,
        });
      }
    }

    const schedules = Array.from(scheduleMap.values());
    const locale = await getFamilyLocale(req.user.familyId);
    res.json(await localizeStandardSchedules(schedules, locale));
  } catch (err) {
    console.error('[STANDARD-LIBRARY] Schedules list error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/standard-library/schedules/:id/copy ───────
// Copies a standard schedule to a child's weekly schedule for selected days.
//
// Routed through the canonical schedule-apply service (src/lib/schedule-apply.js, Phase 1A) —
// the same day-write primitive family_template apply uses (see src/routes/schedules/templates.js).
// `overwrite` compatibility mapping matches the family-template route: days without an existing
// schedule are filled (merge into empty day); days with an existing schedule are only touched
// when overwrite=true (full replace_day), never merged, matching the pre-Phase-1A behaviour of
// copyCanonicalScheduleToFamily's writeScheduleDays loop this replaces. Every day that WILL be
// mutated is submitted as one single-child plan (`applyScheduleSourceToChildPlan`) so a mixed
// merge/replace_day request executes as ONE transaction — see templates.js for the same pattern.
router.post('/schedules/:id/copy', async (req, res) => {
  let locale = 'sv-SE';
  try {
    const { child_id, days, overwrite, optional_selections, variants, operation_id: rawOperationId } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });
    if (!Array.isArray(days) || days.length === 0) return res.status(400).json({ error: 'days[] krävs (t.ex. [1,2,3,4,5])' });

    const childAccess = await db.query(
      'SELECT c.id, c.family_id FROM child c JOIN parent_child pc ON pc.child_id = c.id WHERE pc.parent_id = $1 AND c.id = $2',
      [req.user.id, child_id]
    );
    if (childAccess.rows.length === 0) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    const familyId = childAccess.rows[0].family_id;
    locale = await getFamilyLocale(familyId);

    const validDays = days.map((d) => parseInt(d, 10)).filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);
    if (validDays.length === 0) return res.status(400).json({ error: 'Inga giltiga dagar' });

    const existingByDay = await db.query(
      'SELECT day_of_week FROM weekly_schedule WHERE child_id = $1 AND day_of_week = ANY($2::int[])',
      [child_id, validDays]
    );
    const daysWithExisting = new Set(existingByDay.rows.map((r) => r.day_of_week));
    const planTargets = validDays
      .filter((d) => !daysWithExisting.has(d) || overwrite)
      .map((d) => ({ dayOfWeek: d, mode: daysWithExisting.has(d) ? 'replace_day' : 'merge' }));

    let filledDays = [];
    let activitiesCreated = 0;
    let scheduleCanonicalId = null;
    let scheduleName = null;

    if (planTargets.length > 0) {
      const result = await applyScheduleSourceToChildPlan({
        familyId,
        childId: child_id,
        sourceType: 'standard_schedule',
        sourceId: req.params.id,
        targets: planTargets,
        locale,
        variants: variants ?? null,
        optionalSelections: optional_selections ?? null,
        operationId: rawOperationId || null,
      });
      filledDays = [...result.applied_days].sort((a, b) => a - b);
      activitiesCreated = result.source.activities_created || 0;
      scheduleCanonicalId = result.source.canonical_id;
      scheduleName = result.source.name;
    }

    if (!scheduleName) {
      // No day was actually written (e.g. overwrite=false and every requested day already
      // has a schedule) — fetch the name for the response message without materializing.
      const nameRes = await db.query('SELECT name, canonical_id FROM default_schedule WHERE id = $1', [req.params.id]);
      scheduleName = nameRes.rows[0]?.name || null;
      scheduleCanonicalId = scheduleCanonicalId || nameRes.rows[0]?.canonical_id || null;
    }

    for (const dow of filledDays) {
      try {
        await syncDailyLogWithSchedule(child_id, dow);
      } catch (syncErr) {
        console.error('[STANDARD-LIBRARY] Sync error (non-fatal):', syncErr.message);
      }
    }

    broadcast(familyId, 'SCHEDULE_UPDATED', { childId: child_id });

    const dayNames = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
    const dayStr = filledDays.map((d) => dayNames[d]).join(', ');

    res.status(201).json({
      message: `"${scheduleName}" kopierat till ${filledDays.length} dag(ar): ${dayStr}`,
      filled_days: filledDays,
      activities_created: activitiesCreated,
      schedule_canonical_id: scheduleCanonicalId,
    });
  } catch (err) {
    if (err instanceof ScheduleApplyError) {
      return res.status(err.httpStatus).json({ error: err.message, code: err.code, details: err.details });
    }
    const mapped = mapCanonicalCopyErrorToHttp(err, locale);
    if (mapped) return res.status(mapped.status).json(mapped.body);
    console.error('[STANDARD-LIBRARY] Schedule copy error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
