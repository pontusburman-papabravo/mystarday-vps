'use strict';

/**
 * Core family routes: family read/update, settings, dashboard-stats,
 * readiness, star-history, subscription-status.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { getChildrenForParent } = require('../../../db/parent-access');
const appSettings = require('../../../db/app-settings');
const { validate } = require('../../middleware/validate');
const { UpdateFamilySchema } = require('../../lib/schemas');
const { getLocalDateStr, getOrGenerateDailyLog } = require('../../lib/daily-log-generator');

const router = express.Router();

// ─── GET /api/family ────────────────────────────────────
// Blocked for pedagog-only (cannot see family data)
router.get('/', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyResult = await db.query(
      `SELECT id, name, timezone, time_display_mode, morning_start, morning_end,
              day_start, day_end, evening_start, evening_end,
              night_start, night_end, streak_start_day, sound_enabled,
              family_chest_enabled, created_at
       FROM family WHERE id = $1`,
      [req.user.familyId]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Familj hittades inte' });
    }

    const family = familyResult.rows[0];

    // Get parents in family with their child links
    const parentsResult = await db.query(
      'SELECT id, email, name, is_admin, family_role, created_at FROM parent WHERE family_id = $1',
      [req.user.familyId]
    );

    // Get parent-child links for all parents
    const parentChildLinks = await db.query(
      `SELECT pc.parent_id, pc.child_id, pc.role
       FROM parent_child pc
       JOIN parent p ON p.id = pc.parent_id
       WHERE p.family_id = $1`,
      [req.user.familyId]
    );
    const linksByParent = {};
    for (const link of parentChildLinks.rows) {
      if (!linksByParent[link.parent_id]) linksByParent[link.parent_id] = [];
      linksByParent[link.parent_id].push(link.child_id);
    }
    for (const p of parentsResult.rows) {
      p.linked_child_ids = linksByParent[p.id] || [];
    }

    // Get children in family (only those the current parent has access to — revoked_at filtered by getChildrenForParent)
    const children = await getChildrenForParent(req.user.id, { allowedRoles: ['primary', 'shared'] });
    // children already has .id, .name, .emoji, .birthday, .username, .timezone, .sort_order, .role
    // Add has_pin computed field
    const childrenWithPin = children.map(c => ({
      ...c,
      has_pin: c.pin != null && c.pin !== '',
    }));

    // Get ALL children in family (for parent-child assignment UI)
    const allChildrenResult = await db.query(
      `SELECT id, name, emoji FROM child WHERE family_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [req.user.familyId]
    );

    // Get pending invites
    const invitesResult = await db.query(
      `SELECT id, email, expires_at, accepted, created_at
       FROM family_invite
       WHERE family_id = $1 AND accepted = false AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.user.familyId]
    );

    res.json({
      ...family,
      parents: parentsResult.rows,
      children: childrenWithPin,
      allChildren: allChildrenResult.rows,
      pendingInvites: invitesResult.rows,
    });
  } catch (err) {
    console.error('[FAMILY] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/family ───────────────────────────────────────
router.put('/', validate(UpdateFamilySchema), async (req, res) => {
  try {
    const { name, timezone } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim() || null);
    }

    if (timezone !== undefined) {
      updates.push(`timezone = $${idx++}`);
      values.push(timezone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Inga ändringar att spara' });
    }

    values.push(req.user.familyId);
    const result = await db.query(
      `UPDATE family SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, timezone`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Familj hittades inte' });
    }

    res.json({ message: 'Familj uppdaterad!', family: result.rows[0] });
  } catch (err) {
    console.error('[FAMILY] Put error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/family/settings ───────────────────────────
router.put('/settings', requireNotPedagogOnly, validate(UpdateFamilySchema), async (req, res) => {
  try {
    const {
      name,
      timezone,
      time_display_mode,
      morning_start, morning_end,
      day_start, day_end,
      evening_start, evening_end,
      night_start, night_end,
      streak_start_day,
      sound_enabled,
      family_chest_enabled,
    } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    // Family name
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim() || null);
    }

    // Family timezone
    if (timezone !== undefined) {
      updates.push(`timezone = $${idx++}`);
      values.push(timezone);
    }

    // Validate time_display_mode
    if (time_display_mode !== undefined) {
      const validModes = ['simple', 'starttime', 'full'];
      if (!validModes.includes(time_display_mode)) {
        return res.status(400).json({ error: 'Ogiltigt tidsvisningsläge. Välj: simple, starttime eller full' });
      }
      updates.push(`time_display_mode = $${idx++}`);
      values.push(time_display_mode);
    }

    // Time fields — validate HH:MM format
    const timeFields = {
      morning_start, morning_end, day_start, day_end,
      evening_start, evening_end, night_start, night_end,
    };
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const [field, value] of Object.entries(timeFields)) {
      if (value !== undefined) {
        if (!timeRegex.test(value)) {
          return res.status(400).json({ error: `Ogiltigt tidsformat för ${field}. Använd HH:MM` });
        }
        updates.push(`${field} = $${idx++}`);
        values.push(value);
      }
    }

    // streak_start_day (0=Sunday ... 6=Saturday, 1=Monday default)
    if (streak_start_day !== undefined) {
      const day = parseInt(streak_start_day);
      if (isNaN(day) || day < 0 || day > 6) {
        return res.status(400).json({ error: 'Ogiltigt värde för streak-startdag (0-6)' });
      }
      updates.push(`streak_start_day = $${idx++}`);
      values.push(day);
    }

    if (sound_enabled !== undefined) {
      updates.push(`sound_enabled = $${idx++}`);
      values.push(!!sound_enabled);
    }

    if (family_chest_enabled !== undefined) {
      updates.push(`family_chest_enabled = $${idx++}`);
      values.push(!!family_chest_enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Inga inställningar att uppdatera' });
    }

    values.push(req.user.familyId);
    const result = await db.query(
      `UPDATE family SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, timezone, time_display_mode, morning_start, morning_end,
                 day_start, day_end, evening_start, evening_end,
                 night_start, night_end, streak_start_day, sound_enabled,
                 family_chest_enabled`,
      values
    );

    res.json({
      message: 'Inställningar uppdaterade!',
      settings: result.rows[0],
    });
  } catch (err) {
    console.error('[FAMILY] Settings error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/family/dashboard-stats ────────────────────
// Returns per-child stats: today's progress, star balance, 7-day history
// Blocked for pedagog-only parents
router.get('/dashboard-stats', requireNotPedagogOnly, async (req, res) => {
  try {
    const parentId = req.user.id;

    // Get parent's children
    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji, c.timezone, c.birthday
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1
       ORDER BY c.created_at ASC`,
      [parentId]
    );
    const children = childrenResult.rows;

    if (children.length === 0) {
      return res.json({ children: [] });
    }

    const childIds = children.map(c => c.id);

    // Per-child "today" date in each child's own timezone (fallback to Europe/Stockholm)
    const childTodayMap = {};
    for (const child of children) {
      childTodayMap[child.id] = getLocalDateStr(new Date(), child.timezone || 'Europe/Stockholm');
    }
    const uniqueDates = [...new Set(Object.values(childTodayMap))];

    // Get today's log stats per child for all relevant dates (include log_id + is_paused for pause toggle)
    const todayStatsRaw = await db.query(
      `SELECT dl.child_id, dl.id AS log_id, dl.is_paused, dl.date::text,
              COUNT(dli.id) AS total,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date = ANY($2::date[])
       GROUP BY dl.child_id, dl.id, dl.is_paused, dl.date`,
      [childIds, uniqueDates]
    );

    // Match each child's stats to their local "today" date
    const todayStatsByChild = {};
    for (const row of todayStatsRaw.rows) {
      if (row.date === childTodayMap[row.child_id]) {
        todayStatsByChild[row.child_id] = { total: parseInt(row.total, 10), completed: parseInt(row.completed, 10), log_id: row.log_id, is_paused: row.is_paused };
      }
    }

    // Get star balances per child
    const earnedResult = await db.query(
      `SELECT dl.child_id, COALESCE(SUM(dli.star_value), 0) AS earned
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = ANY($1) AND dli.completed = true
       GROUP BY dl.child_id`,
      [childIds]
    );
    const spentResult = await db.query(
      `SELECT rr.child_id, COALESCE(SUM(rr.star_cost), 0) AS spent
       FROM reward_redemption rr
       WHERE rr.child_id = ANY($1) AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NOT NULL
       GROUP BY rr.child_id`,
      [childIds]
    );
    // Fallback for children without star_cost snapshot (legacy redemptions)
    const spentFallbackResult = await db.query(
      `SELECT rr.child_id, COALESCE(SUM(r.star_cost), 0) AS spent
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = ANY($1) AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NULL
       GROUP BY rr.child_id`,
      [childIds]
    );

    const earnedMap = {};
    for (const row of earnedResult.rows) earnedMap[row.child_id] = parseInt(row.earned, 10);

    const spentMap = {};
    for (const row of spentResult.rows) {
      spentMap[row.child_id] = (spentMap[row.child_id] || 0) + parseInt(row.spent, 10);
    }
    for (const row of spentFallbackResult.rows) {
      spentMap[row.child_id] = (spentMap[row.child_id] || 0) + parseInt(row.spent, 10);
    }

    // 7-day completion history per child
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const fromStr = sevenDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

    const historyResult = await db.query(
      `SELECT dl.child_id, dl.date::text AS date,
              COUNT(dli.id) AS total,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed,
              dl.is_paused
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date >= $2
       GROUP BY dl.child_id, dl.date, dl.is_paused
       ORDER BY dl.date ASC`,
      [childIds, fromStr]
    );
    const historyByChild = {};
    for (const row of historyResult.rows) {
      if (!historyByChild[row.child_id]) historyByChild[row.child_id] = [];
      historyByChild[row.child_id].push({
        date: row.date,
        total: parseInt(row.total, 10),
        completed: parseInt(row.completed, 10),
        is_paused: row.is_paused,
        pct: row.total > 0 ? Math.round((parseInt(row.completed, 10) / parseInt(row.total, 10)) * 100) : null,
      });
    }

    // Pending redemptions per child
    const pendingResult = await db.query(
      `SELECT rr.child_id, COUNT(*) AS count
       FROM reward_redemption rr
       WHERE rr.child_id = ANY($1) AND rr.status = 'pending'
       GROUP BY rr.child_id`,
      [childIds]
    );
    const pendingMap = {};
    for (const row of pendingResult.rows) pendingMap[row.child_id] = parseInt(row.count, 10);

    // Pending goal change requests per child
    const pendingGoalMap = {};
    try {
      const pendingGoalResult = await db.query(
        `SELECT crgcr.child_id, COUNT(*) AS count
         FROM child_reward_goal_change_request crgcr
         WHERE crgcr.child_id = ANY($1) AND crgcr.status = 'pending'
         GROUP BY crgcr.child_id`,
        [childIds]
      );
      for (const row of pendingGoalResult.rows) pendingGoalMap[row.child_id] = parseInt(row.count, 10);
    } catch (_) {
      // Table may not exist yet
    }

    // Generate (or retrieve) daily logs for each child using the same canonical path as
    // Daglig logg. This replaces the old parallel sync code (syncDailyLogWithSchedule /
    // syncDailyLogForSpecialDay) with a single call that ensures both views show identical items.
    // getOrGenerateDailyLog handles: log creation, special day schedules, empty-log
    // population, and morning activity additions — all in one place.
    const logResults = await Promise.all(children.map(async c => {
      try {
        return await getOrGenerateDailyLog(c.id, childTodayMap[c.id]);
      } catch (err) {
        console.error(`[DASHBOARD] Daily log generation failed for child ${c.id}:`, err.message);
        return null;
      }
    }));

    // Re-fetch today's stats after log generation (items may have been populated)
    const refreshedStats = await db.query(
      `SELECT dl.child_id, dl.id AS log_id, dl.is_paused, dl.date::text,
              COUNT(dli.id) AS total,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date = ANY($2::date[])
       GROUP BY dl.child_id, dl.id, dl.is_paused, dl.date`,
      [childIds, uniqueDates]
    );
    for (const row of refreshedStats.rows) {
      if (row.date === childTodayMap[row.child_id]) {
        todayStatsByChild[row.child_id] = { total: parseInt(row.total, 10), completed: parseInt(row.completed, 10), log_id: row.log_id, is_paused: row.is_paused };
      }
    }

    // Build todayItemsMap from the canonical getOrGenerateDailyLog results.
    // This is the same data source Daglig logg uses — eliminating divergence between the two views.
    const todayItemsMap = {};
    for (let i = 0; i < children.length; i++) {
      const result = logResults[i];
      if (!result) continue;
      const childId = children[i].id;
      const stats = todayStatsByChild[childId];
      if (!stats || !stats.log_id) continue;
      todayItemsMap[stats.log_id] = result.items.map(item => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        section: item.section,
        start_time: item.start_time,
        end_time: item.end_time,
        star_value: item.star_value,
        completed: item.completed,
        sort_order: item.sort_order,
        is_once_task: !item.activity_template_id,
      }));
    }

    // Stars earned today per child (per-child timezone)
    const todayEarnedResult = await db.query(
      `SELECT dl.child_id, dl.date::text, COALESCE(SUM(dli.star_value), 0) AS earned_today
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = ANY($1) AND dl.date = ANY($2::date[]) AND dli.completed = true AND dli.star_value > 0
       GROUP BY dl.child_id, dl.date`,
      [childIds, uniqueDates]
    );
    const todayEarnedMap = {};
    for (const row of todayEarnedResult.rows) {
      if (row.date === childTodayMap[row.child_id]) {
        todayEarnedMap[row.child_id] = parseInt(row.earned_today, 10);
      }
    }

    // Nearest reward per child (lowest star_cost, visible + active, for parent's family)
    const rewardsResult = await db.query(
      `SELECT r.id, r.name, r.icon, r.star_cost FROM reward r
       JOIN parent_child pc ON pc.child_id = ANY($1)
       JOIN child c ON c.id = pc.child_id
       WHERE r.family_id = c.family_id AND r.is_active = true
       GROUP BY r.id, r.name, r.icon, r.star_cost
       ORDER BY r.star_cost ASC`,
      [childIds]
    );
    const allRewards = rewardsResult.rows;

    // Build response
    // Manual star grants per child
    const manualMap = {};
    try {
      const manualResult = await db.query(
        `SELECT child_id, COALESCE(SUM(star_count), 0) AS manual
         FROM manual_star_grant WHERE child_id = ANY($1)
         GROUP BY child_id`,
        [childIds]
      );
      for (const row of manualResult.rows) manualMap[row.child_id] = parseInt(row.manual, 10);
    } catch (_) {
      // Table may not exist yet on old instances
    }

    const childStats = children.map(c => {
      const earned = earnedMap[c.id] || 0;
      const manual = manualMap[c.id] || 0;
      const spent = spentMap[c.id] || 0;
      const balance = Math.max(0, earned + manual - spent);
      const today = todayStatsByChild[c.id] || { total: 0, completed: 0, log_id: null, is_paused: false };

      // Get today's items and annotate with status
      const rawItems = today.log_id ? (todayItemsMap[today.log_id] || []) : [];
      let nuAssigned = false;
      let nextaAssigned = false;
      const annotatedItems = rawItems.map(item => {
        let status = 'SEDAN';
        if (item.completed) {
          status = 'DONE';
        } else if (!nuAssigned) {
          status = 'NU';
          nuAssigned = true;
        } else if (!nextaAssigned) {
          status = 'NÄSTA';
          nextaAssigned = true;
        }
        return {
          id: item.id,
          name: item.name,
          icon: item.icon,
          section: item.section,
          star_value: item.star_value,
          completed: item.completed,
          start_time: item.start_time,
          end_time: item.end_time,
          is_once_task: item.is_once_task || false,
          status,
        };
      });

      // Nearest reward: first reward whose cost > balance (not yet earned), else first reward
      const nearestReward = allRewards.find(r => r.star_cost > balance) || allRewards[0] || null;

      return {
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        birthday: c.birthday || null,
        today_total: today.total,
        today_completed: today.completed,
        today_pct: today.total > 0 ? Math.round((today.completed / today.total) * 100) : null,
        today_log_id: today.log_id || null,
        today_is_paused: today.is_paused || false,
        star_balance: balance,
        stars_today: todayEarnedMap[c.id] || 0,
        today_items: annotatedItems,
        nearest_reward: nearestReward ? {
          id: nearestReward.id,
          name: nearestReward.name,
          icon: nearestReward.icon,
          star_cost: nearestReward.star_cost,
        } : null,
        pending_redemptions: pendingMap[c.id] || 0,
        pending_goal_changes: pendingGoalMap[c.id] || 0,
        history: historyByChild[c.id] || [],
      };
    });

    // Medförälder CTA: count parents in this family (excluding the current user's role)
    const parentCountResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM parent WHERE family_id = $1`,
      [req.user.familyId]
    );
    const parent_count = parentCountResult.rows[0].count;

    const totalPending = childStats.reduce((s, c) => s + c.pending_redemptions + c.pending_goal_changes, 0);

    res.json({
      children: childStats,
      todayByChild: childTodayMap,
      total_pending_redemptions: totalPending,
      parent_count,
    });
  } catch (err) {
    console.error('[FAMILY] Dashboard stats error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/family/readiness — action items for Hem (vuxenmeny v2.1) ───
router.get('/readiness', requireNotPedagogOnly, async (req, res) => {
  try {
    const parentId = req.user.id;
    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji, (c.pin IS NOT NULL AND c.pin <> '') AS has_pin
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1
       ORDER BY c.created_at ASC`,
      [parentId]
    );
    const children = childrenResult.rows;
    if (!children.length) return res.json({ items: [] });

    const childIds = children.map((c) => c.id);
    const statsRes = await db.query(
      `SELECT dl.child_id, dl.id AS log_id, dl.is_paused, dl.date::text,
              COUNT(dli.id) AS total
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date = CURRENT_DATE
       GROUP BY dl.child_id, dl.id, dl.is_paused, dl.date`,
      [childIds]
    );
    const todayByChild = {};
    for (const row of statsRes.rows) {
      todayByChild[row.child_id] = {
        log_id: row.log_id,
        is_paused: row.is_paused,
        total: parseInt(row.total, 10),
      };
    }

    const pendingRedemptions = await db.query(
      `SELECT rr.child_id, COUNT(*)::int AS cnt
       FROM reward_redemption rr
       JOIN child c ON c.id = rr.child_id
       JOIN parent_child pc ON pc.child_id = c.id AND pc.parent_id = $1
       WHERE rr.status = 'pending'
       GROUP BY rr.child_id`,
      [parentId]
    );
    const pendingGoals = await db.query(
      `SELECT crgcr.child_id, COUNT(*)::int AS cnt
       FROM child_reward_goal_change_request crgcr
       JOIN child c ON c.id = crgcr.child_id
       JOIN parent_child pc ON pc.child_id = c.id AND pc.parent_id = $1
       WHERE crgcr.status = 'pending'
       GROUP BY crgcr.child_id`,
      [parentId]
    );
    const pendRedMap = {};
    const pendGoalMap = {};
    pendingRedemptions.rows.forEach((r) => { pendRedMap[r.child_id] = r.cnt; });
    pendingGoals.rows.forEach((r) => { pendGoalMap[r.child_id] = r.cnt; });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromStr = sevenDaysAgo.toISOString().slice(0, 10);
    const incompleteRes = await db.query(
      `SELECT child_id, COUNT(*)::int AS incomplete_days
       FROM (
         SELECT dl.child_id, dl.date
         FROM daily_log dl
         JOIN daily_log_item dli ON dli.daily_log_id = dl.id
         WHERE dl.child_id = ANY($1)
           AND dl.date >= $2::date
           AND dl.date < CURRENT_DATE
           AND dl.is_paused = false
         GROUP BY dl.child_id, dl.id, dl.date
         HAVING COUNT(dli.id) > 0
           AND COUNT(CASE WHEN dli.completed THEN 1 END) < COUNT(dli.id)
       ) sub
       GROUP BY child_id`,
      [childIds, fromStr]
    );
    const incompleteMap = {};
    for (const row of incompleteRes.rows) {
      incompleteMap[row.child_id] = parseInt(row.incomplete_days, 10) || 0;
    }

    let pendingInviteCount = 0;
    if (req.user.familyId) {
      const inviteRes = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM family_invite
         WHERE family_id = $1 AND accepted = false AND expires_at > NOW()`,
        [req.user.familyId]
      );
      pendingInviteCount = inviteRes.rows[0]?.cnt || 0;
    }

    const items = [];
    if (pendingInviteCount > 0) {
      items.push({
        type: 'pending_invite',
        child_id: null,
        child_name: null,
        title: pendingInviteCount + ' väntande medförälder-inbjudan',
        sub: 'Hantera under Familj',
        href: '/family',
        priority: 0,
      });
    }
    for (const c of children) {
      const today = todayByChild[c.id];
      const pending = (pendRedMap[c.id] || 0) + (pendGoalMap[c.id] || 0);
      if (pending > 0) {
        items.push({
          type: 'pending_approval',
          child_id: c.id,
          child_name: c.name,
          title: c.name + ' — ' + pending + ' väntande förfrågan',
          sub: 'Godkänn i Belöningar',
          href: '/rewards',
          priority: 0,
        });
      }
      const incompleteDays = incompleteMap[c.id] || 0;
      if (incompleteDays > 0) {
        items.push({
          type: 'incomplete_past_days',
          child_id: c.id,
          child_name: c.name,
          title: c.name + ' — ' + incompleteDays + ' ofullständig' + (incompleteDays === 1 ? ' dag' : 'a dagar'),
          sub: 'Fyll i i efterhand',
          href: '/daily-log?childId=' + encodeURIComponent(c.id),
          priority: 1,
        });
      }
      if (!c.has_pin) {
        items.push({
          type: 'missing_pin',
          child_id: c.id,
          child_name: c.name,
          title: c.name + ' saknar PIN',
          sub: 'Sätt PIN i barnprofilen',
          href: '/family/child/' + encodeURIComponent(c.id) + '?tab=setup',
          priority: 2,
        });
      }
      if (today && today.is_paused) {
        items.push({
          type: 'paused_day',
          child_id: c.id,
          child_name: c.name,
          title: c.name + ' — pausad idag',
          sub: 'Öppna daglig logg',
          href: '/daily-log?childId=' + encodeURIComponent(c.id),
          priority: 3,
        });
      }
      if (!today || today.total === 0) {
        items.push({
          type: 'no_schedule_today',
          child_id: c.id,
          child_name: c.name,
          title: c.name + ' — inget schema idag',
          sub: 'Öppna veckoschema',
          href: '/schedule?child=' + encodeURIComponent(c.id),
          priority: 4,
        });
      }
    }

    items.sort((a, b) => a.priority - b.priority);
    res.json({ items });
  } catch (err) {
    console.error('[FAMILY] Readiness error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/family/star-history ────────────────────────
// Returns per-child weekly star totals for the last 8 weeks
router.get('/star-history', async (req, res) => {
  try {
    const parentId = req.user.id;

    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1
       ORDER BY c.created_at ASC`,
      [parentId]
    );
    const children = childrenResult.rows;
    if (children.length === 0) return res.json({ children: [], weeks: [] });

    const childIds = children.map(c => c.id);

    // Get weekly star data (8 weeks back)
    const weeksBack = 8;
    const now = new Date();
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);

    const fromDate = new Date(thisMonday);
    fromDate.setDate(thisMonday.getDate() - (weeksBack - 1) * 7);
    const fromStr = fromDate.toLocaleDateString('sv-SE');

    // Get stars earned per child per date from completed log items
    const starsResult = await db.query(
      `SELECT dl.child_id, dl.date::text AS date, COALESCE(SUM(dli.star_value), 0) AS stars_earned
       FROM daily_log dl
       JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = ANY($1) AND dl.date >= $2 AND dli.completed = true AND dli.star_value > 0
       GROUP BY dl.child_id, dl.date
       ORDER BY dl.date ASC`,
      [childIds, fromStr]
    );

    // Get manual star grants per child per date
    const manualResult = await db.query(
      `SELECT child_id, created_at::date::text AS date, COALESCE(SUM(star_count), 0) AS stars_manual
       FROM manual_star_grant
       WHERE child_id = ANY($1) AND created_at >= $2
       GROUP BY child_id, created_at::date
       ORDER BY created_at::date ASC`,
      [childIds, fromStr]
    ).catch(() => ({ rows: [] })); // graceful if table not yet migrated

    // Build lookup: childId -> date -> { earned, manual }
    const byChild = {};
    for (const c of children) byChild[c.id] = {};
    for (const row of starsResult.rows) {
      if (!byChild[row.child_id][row.date]) byChild[row.child_id][row.date] = { earned: 0, manual: 0 };
      byChild[row.child_id][row.date].earned = parseInt(row.stars_earned, 10);
    }
    for (const row of manualResult.rows) {
      if (!byChild[row.child_id][row.date]) byChild[row.child_id][row.date] = { earned: 0, manual: 0 };
      byChild[row.child_id][row.date].manual = parseInt(row.stars_manual, 10);
    }

    // Build 8 weeks
    const weeks = [];
    for (let w = weeksBack - 1; w >= 0; w--) {
      const weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekLabel = `V${getWeekNumber(weekStart)}`;
      const weekStartStr = weekStart.toLocaleDateString('sv-SE');

      const childTotals = {};
      for (const c of children) {
        let total = 0;
        for (let d = 0; d < 7; d++) {
          const day = new Date(weekStart);
          day.setDate(weekStart.getDate() + d);
          const dayStr = day.toLocaleDateString('sv-SE');
          const data = byChild[c.id][dayStr];
          if (data) total += (data.earned || 0) + (data.manual || 0);
        }
        childTotals[c.id] = total;
      }

      weeks.push({
        week_label: weekLabel,
        week_start: weekStartStr,
        is_current: w === 0,
        child_totals: childTotals,
      });
    }

    res.json({
      children: children.map(c => ({ id: c.id, name: c.name, emoji: c.emoji })),
      weeks,
    });
  } catch (err) {
    console.error('[FAMILY] Star history error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// GET /api/family/subscription-status — returns trial info for the banner
// WHY payment_enabled is included: frontend hides all payment UI unless this is true
router.get('/subscription-status', requireParent, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT subscription_status, trial_ends_at, is_lifetime_free FROM family WHERE id = $1`,
      [req.user.familyId || req.user.family_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Familj hittades inte' });
    const { subscription_status, trial_ends_at, is_lifetime_free } = rows[0];
    let trial_days_remaining = null;
    if (subscription_status === 'trial' && trial_ends_at) {
      const diff = new Date(trial_ends_at) - new Date();
      trial_days_remaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    const paymentPolicy = require('../../lib/payment-policy');
    const payment_enabled = await appSettings.getPaymentEnabled();
    res.json({
      subscription_status,
      is_lifetime_free: !!is_lifetime_free,
      is_beta: subscription_status === 'beta',
      trial_days_remaining,
      payment_enabled,
      pricing_info_url: '/pricing-info',
      founder_limit: await paymentPolicy.getFounderFamilyLimit(),
    });
  } catch (err) {
    console.error('[FAMILY] subscription-status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta prenumerationsstatus' });
  }
});

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
module.exports = router;
