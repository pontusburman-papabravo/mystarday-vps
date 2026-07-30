/**
 * Reward Goals, Goal Change Requests & Manual Star Grants
 *
 * Parent routes (requireParent):
 *   GET    /api/rewards/goals                  — all children's active goals (for parent panel)
 *   PUT    /api/rewards/goals/:childId         — set/override a child's active goal (directly)
 *   GET    /api/rewards/goals/:childId/pending — pending change request for a child
 *   PUT    /api/rewards/goal-change-requests/:id/approve
 *   PUT    /api/rewards/goal-change-requests/:id/deny
 *   POST   /api/rewards/manual-stars           — give manual stars to a child
 *   GET    /api/rewards/manual-stars/:childId  — list manual star grants for a child
 *   GET    /api/rewards/redemption-history     — redemption history per child
 *
 * Child routes (requireChild, mounted under /api/me):
 *   GET    /api/me/goal                        — child's active goal + progress
 *   POST   /api/me/goal                        — child sets their own goal (if no active goal)
 *   POST   /api/me/goal/change-request         — request to change goal
 *   GET    /api/me/manual-stars                — child's manual star feed
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent, requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const { requireNotPedagogOnly, getChildAccess } = require('../middleware/authz');
const { broadcast } = require('../lib/sse-broadcast');
const { notifyChildStarGranted } = require('../lib/push');
const { validate, validateParams } = require('../middleware/validate');
const {
  SetGoalSchema,
  ManualStarsSchema,
  GoalChangeRequestSchema,
  ChildSetGoalSchema,
  UUIDParam,
} = require('../lib/schemas');
const { getFamilyPreferredLocale } = require('../lib/family-locale');
const { localizeRewardRow, localizeRewardItems } = require('../lib/family-content-display');
const {
  resolveChildContentLocaleForFamily,
  childRewardLocalizeOptions,
} = require('../lib/child-ui-locale');

// ─── SSE helper: look up family_id for a child ───────────
async function getChildFamilyId(childId) {
  const r = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
  return r.rows[0]?.family_id || null;
}

// ─── Shared: star balance including manual grants ─────────

async function getFullStarBalance(childId) {
  const earnedResult = await db.query(
    `SELECT COALESCE(SUM(dli.star_value), 0) AS earned
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dli.completed = true`,
    [childId]
  );
  const manualResult = await db.query(
    `SELECT COALESCE(SUM(star_count), 0) AS manual
     FROM manual_star_grant WHERE child_id = $1`,
    [childId]
  );
  const spentSnapshotResult = await db.query(
    `SELECT COALESCE(SUM(rr.star_cost), 0) AS spent
     FROM reward_redemption rr
     WHERE rr.child_id = $1
       AND rr.status IN ('approved', 'auto')
       AND rr.star_cost IS NOT NULL`,
    [childId]
  );
  const spentLegacyResult = await db.query(
    `SELECT COALESCE(SUM(r.star_cost), 0) AS spent
     FROM reward_redemption rr
     JOIN reward r ON r.id = rr.reward_id
     WHERE rr.child_id = $1
       AND rr.status IN ('approved', 'auto')
       AND rr.star_cost IS NULL`,
    [childId]
  );
  const earned = parseInt(earnedResult.rows[0].earned, 10);
  const manual = parseInt(manualResult.rows[0].manual, 10);
  const spent = parseInt(spentSnapshotResult.rows[0].spent, 10) + parseInt(spentLegacyResult.rows[0].spent, 10);
  return Math.max(0, earned + manual - spent);
}

// ─── Parent Router ────────────────────────────────────────

const parentRouter = express.Router();
parentRouter.use(requireParent);
parentRouter.use(requireNotPedagogOnly);

/**
 * GET /api/rewards/goals
 * Returns active goals for ALL children the parent has access to.
 */
parentRouter.get('/goals', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         crg.id, crg.child_id, crg.status, crg.created_at,
         r.id AS reward_id, r.name AS reward_name, r.icon AS reward_icon, r.star_cost,
         c.name AS child_name, c.emoji AS child_emoji
       FROM child_reward_goal crg
       JOIN child c ON c.id = crg.child_id
       JOIN parent_child pc ON pc.child_id = c.id
       LEFT JOIN reward r ON r.id = crg.reward_id
       WHERE pc.parent_id = $1 AND crg.status = 'active' AND pc.revoked_at IS NULL
       ORDER BY c.sort_order ASC, c.created_at ASC`,
      [req.user.id]
    );
    // Also attach change requests
    const changeReqs = await db.query(
      `SELECT crgcr.id, crgcr.child_id, crgcr.status, crgcr.created_at,
              r.name AS to_reward_name, r.icon AS to_reward_icon, r.star_cost AS to_star_cost,
              crgcr.to_reward_id
       FROM child_reward_goal_change_request crgcr
       JOIN reward r ON r.id = crgcr.to_reward_id
       JOIN parent_child pc ON pc.child_id = crgcr.child_id
       WHERE pc.parent_id = $1 AND crgcr.status = 'pending' AND pc.revoked_at IS NULL`,
      [req.user.id]
    );
    const pendingByChild = {};
    for (const cr of changeReqs.rows) {
      pendingByChild[cr.child_id] = cr;
    }
    const goals = await Promise.all(result.rows.map(async (g) => {
      const balance = await getFullStarBalance(g.child_id);
      const progress = g.star_cost > 0
        ? Math.min(100, Math.round((balance / g.star_cost) * 100))
        : 0;
      return {
        ...g,
        stars_toward_goal: balance,
        progress_pct: progress,
        pending_change_request: pendingByChild[g.child_id] || null,
      };
    }));
    res.json({ goals });
  } catch (err) {
    console.error('[GOALS] List error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * PUT /api/rewards/goals/:childId
 * Parent directly sets (or overrides) a child's goal.
 * Cancels existing active goal first.
 */
parentRouter.put('/goals/:childId', validate(SetGoalSchema), async (req, res) => {
  try {
    const { childId } = req.params;
    const { reward_id } = req.body;
    if (!reward_id) return res.status(400).json({ error: 'reward_id krävs' });

    // Verify child belongs to this parent's family
    const childCheck = await getChildAccess(req.user.id, childId);
    if (!childCheck) return res.status(404).json({ error: 'Barn hittades inte' });

    // Verify reward belongs to this family
    const rewardCheck = await db.query(
      'SELECT id, name FROM reward WHERE id = $1 AND family_id = $2 AND is_active = true',
      [reward_id, childCheck.family_id]
    );
    if (rewardCheck.rows.length === 0) return res.status(404).json({ error: 'Belöning hittades inte' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Cancel existing active goal
      await client.query(
        `UPDATE child_reward_goal SET status = 'cancelled', updated_at = NOW()
         WHERE child_id = $1 AND status = 'active'`,
        [childId]
      );
      // Cancel pending change requests
      await client.query(
        `UPDATE child_reward_goal_change_request SET status = 'denied', updated_at = NOW()
         WHERE child_id = $1 AND status = 'pending'`,
        [childId]
      );
      // Create new goal
      const result = await client.query(
        `INSERT INTO child_reward_goal (child_id, reward_id, status, set_by)
         VALUES ($1, $2, 'active', $3) RETURNING id`,
        [childId, reward_id, req.user.id]
      );
      await client.query('COMMIT');
      res.json({ message: 'Mål satt!', goal_id: result.rows[0].id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[GOALS] Set error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * GET /api/rewards/goals/:childId/pending
 * Returns pending change request for a specific child.
 */
parentRouter.get('/goals/:childId/pending', async (req, res) => {
  try {
    const { childId } = req.params;
    const childCheck = await getChildAccess(req.user.id, childId);
    if (!childCheck) return res.status(404).json({ error: 'Barn hittades inte' });

    const result = await db.query(
      `SELECT crgcr.id, crgcr.status, crgcr.created_at,
              rf.name AS from_reward_name, rf.icon AS from_reward_icon,
              rt.id AS to_reward_id, rt.name AS to_reward_name, rt.icon AS to_reward_icon, rt.star_cost AS to_star_cost
       FROM child_reward_goal_change_request crgcr
       LEFT JOIN reward rf ON rf.id = crgcr.from_reward_id
       JOIN reward rt ON rt.id = crgcr.to_reward_id
       WHERE crgcr.child_id = $1 AND crgcr.status = 'pending'
       ORDER BY crgcr.created_at DESC LIMIT 1`,
      [childId]
    );
    res.json({ request: result.rows[0] || null });
  } catch (err) {
    console.error('[GOALS] Pending check error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * PUT /api/rewards/goal-change-requests/:id/approve
 */
parentRouter.put('/goal-change-requests/:id/approve', async (req, res) => {
  try {
    const cr = await db.query(
      `SELECT crgcr.id, crgcr.child_id, crgcr.to_reward_id, crgcr.status,
              c.family_id
       FROM child_reward_goal_change_request crgcr
       JOIN child c ON c.id = crgcr.child_id
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE crgcr.id = $1 AND pc.parent_id = $2 AND pc.revoked_at IS NULL`,
      [req.params.id, req.user.id]
    );
    if (cr.rows.length === 0) return res.status(404).json({ error: 'Begäran hittades inte' });
    if (cr.rows[0].status !== 'pending') return res.status(400).json({ error: 'Kan bara godkänna väntande begäran' });

    const { child_id, to_reward_id } = cr.rows[0];
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Cancel existing active goal
      await client.query(
        `UPDATE child_reward_goal SET status = 'cancelled', updated_at = NOW()
         WHERE child_id = $1 AND status = 'active'`,
        [child_id]
      );
      // Create new active goal
      await client.query(
        `INSERT INTO child_reward_goal (child_id, reward_id, status, set_by)
         VALUES ($1, $2, 'active', $3)`,
        [child_id, to_reward_id, req.user.id]
      );
      // Mark request approved
      await client.query(
        `UPDATE child_reward_goal_change_request
         SET status = 'approved', resolved_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, req.params.id]
      );
      await client.query('COMMIT');
      res.json({ message: 'Målbyte godkänt!' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[GOALS] Approve change request error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * PUT /api/rewards/goal-change-requests/:id/deny
 */
parentRouter.put('/goal-change-requests/:id/deny', async (req, res) => {
  try {
    const cr = await db.query(
      `SELECT crgcr.id, crgcr.status FROM child_reward_goal_change_request crgcr
       JOIN child c ON c.id = crgcr.child_id
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE crgcr.id = $1 AND pc.parent_id = $2 AND pc.revoked_at IS NULL`,
      [req.params.id, req.user.id]
    );
    if (cr.rows.length === 0) return res.status(404).json({ error: 'Begäran hittades inte' });
    if (cr.rows[0].status !== 'pending') return res.status(400).json({ error: 'Kan bara neka väntande begäran' });
    await db.query(
      `UPDATE child_reward_goal_change_request
       SET status = 'denied', resolved_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Målbyte nekat.' });
  } catch (err) {
    console.error('[GOALS] Deny change request error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * POST /api/rewards/manual-stars
 * Parent gives manual stars to a child.
 * Body: { child_id, star_count, reason, image_url? }
 */
parentRouter.post('/manual-stars', validate(ManualStarsSchema), async (req, res) => {
  try {
    const { child_id, star_count, reason, image_url } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id krävs' });
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Anledning krävs' });
    const count = parseInt(star_count, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      return res.status(400).json({ error: 'Antal stjärnor måste vara 1–100' });
    }

    // Verify child belongs to this parent
    const childCheck = await getChildAccess(req.user.id, child_id);
    if (!childCheck) return res.status(404).json({ error: 'Barn hittades inte' });

    await db.query(
      `INSERT INTO manual_star_grant (child_id, granted_by, star_count, reason, image_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [child_id, req.user.id, count, reason.trim(), image_url || null]
    );
    res.status(201).json({ message: `⭐ ${count} stjärnor givna!` });
    // Broadcast STAR_GRANTED + push notify (fire-and-forget)
    getChildFamilyId(child_id).then(async (fid) => {
      if (!fid) return;
      broadcast(fid, 'STAR_GRANTED', { childId: child_id, starCount: count, reason: reason.trim() });
      try {
        const [childRow, parentRow] = await Promise.all([
          db.query('SELECT name FROM child WHERE id = $1', [child_id]),
          db.query('SELECT name FROM parent WHERE id = $1', [req.user.id]),
        ]);
        const childName = childRow.rows[0]?.name || 'Barnet';
        const parentName = parentRow.rows[0]?.name || 'En förälder';
        notifyChildStarGranted(child_id, childName, count, parentName).catch((err) => {
          console.error('[GOALS] notifyChildStarGranted failed:', err.message);
        });
      } catch (err) {
        console.error('[GOALS] Star-grant notify lookup failed:', err.message);
      }
    }).catch((err) => console.error('[GOALS] STAR_GRANTED broadcast failed:', err.message));
  } catch (err) {
    console.error('[GOALS] Manual stars error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * GET /api/rewards/manual-stars/:childId
 * Lists manual star grants for a child (parent view).
 */
parentRouter.get('/manual-stars/:childId', async (req, res) => {
  try {
    const childCheck = await getChildAccess(req.user.id, req.params.childId);
    if (!childCheck) return res.status(404).json({ error: 'Barn hittades inte' });

    const result = await db.query(
      `SELECT msg.id, msg.star_count, msg.reason, msg.image_url, msg.created_at,
              p.name AS parent_name
       FROM manual_star_grant msg
       JOIN parent p ON p.id = msg.granted_by
       WHERE msg.child_id = $1
       ORDER BY msg.created_at DESC LIMIT 50`,
      [req.params.childId]
    );
    res.json({ grants: result.rows });
  } catch (err) {
    console.error('[GOALS] Manual stars list error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * GET /api/rewards/redemption-history
 * Returns redemption history grouped per child.
 */
parentRouter.get('/redemption-history', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rr.id, rr.status, rr.created_at,
              COALESCE(rr.star_cost, r.star_cost) AS star_cost,
              r.name AS reward_name, r.icon AS reward_icon,
              c.name AS child_name, c.emoji AS child_emoji, c.id AS child_id
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       JOIN child c ON c.id = rr.child_id
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1 AND rr.status IN ('approved', 'auto') AND pc.revoked_at IS NULL
       ORDER BY rr.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error('[GOALS] Redemption history error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * GET /api/rewards/pending-requests
 * Returns all pending redemptions + pending goal change requests (for the badge count).
 */
parentRouter.get('/pending-requests', async (req, res) => {
  try {
    const [redemptions, goalChanges] = await Promise.all([
      db.query(
        `SELECT rr.id, rr.created_at,
                r.name AS reward_name, r.icon AS reward_icon,
                c.name AS child_name, c.emoji AS child_emoji, c.id AS child_id,
                COALESCE(rr.star_cost, r.star_cost) AS star_cost
         FROM reward_redemption rr
         JOIN reward r ON r.id = rr.reward_id
         JOIN child c ON c.id = rr.child_id
         JOIN parent_child pc ON pc.child_id = c.id
         WHERE pc.parent_id = $1 AND rr.status = 'pending' AND pc.revoked_at IS NULL
         ORDER BY rr.created_at ASC`,
        [req.user.id]
      ),
      db.query(
        `SELECT crgcr.id, crgcr.child_id, crgcr.created_at,
                rt.name AS to_reward_name, rt.icon AS to_reward_icon,
                c.name AS child_name, c.emoji AS child_emoji
         FROM child_reward_goal_change_request crgcr
         JOIN child c ON c.id = crgcr.child_id
         JOIN parent_child pc ON pc.child_id = c.id
         JOIN reward rt ON rt.id = crgcr.to_reward_id
         WHERE pc.parent_id = $1 AND crgcr.status = 'pending' AND pc.revoked_at IS NULL
         ORDER BY crgcr.created_at ASC`,
        [req.user.id]
      ),
    ]);
    res.json({
      pending_redemptions: redemptions.rows,
      pending_goal_changes: goalChanges.rows,
      total: redemptions.rows.length + goalChanges.rows.length,
    });
  } catch (err) {
    console.error('[GOALS] Pending requests error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── Child Router ─────────────────────────────────────────

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/goal', '/manual-stars'));
childRouter.use(requireChild);

/**
 * GET /api/me/goal
 * Returns the child's active goal with progress info.
 */
childRouter.get('/goal', async (req, res) => {
  try {
    const childId = req.user.id;
    const balance = await getFullStarBalance(childId);
    const familyId = await getChildFamilyId(childId);
    const contentLocale = await resolveChildContentLocaleForFamily(familyId);
    const rewardLocalizeOpts = childRewardLocalizeOptions(contentLocale);

    const goalResult = await db.query(
      `SELECT crg.id, crg.status, crg.created_at,
              r.id AS reward_id, r.name AS reward_name, r.icon AS reward_icon, r.star_cost,
              r.source_default_id, COALESCE(r.modified_by_family, false) AS modified_by_family
       FROM child_reward_goal crg
       LEFT JOIN reward r ON r.id = crg.reward_id
       WHERE crg.child_id = $1 AND crg.status = 'active'
       ORDER BY crg.created_at DESC LIMIT 1`,
      [childId]
    );

    const pendingChangeResult = await db.query(
      `SELECT crgcr.id, crgcr.status, crgcr.created_at,
              rt.name AS to_reward_name, rt.icon AS to_reward_icon, rt.star_cost AS to_star_cost,
              rt.source_default_id, COALESCE(rt.modified_by_family, false) AS modified_by_family
       FROM child_reward_goal_change_request crgcr
       JOIN reward rt ON rt.id = crgcr.to_reward_id
       WHERE crgcr.child_id = $1 AND crgcr.status = 'pending'
       ORDER BY crgcr.created_at DESC LIMIT 1`,
      [childId]
    );

    let goal = goalResult.rows[0] || null;
    if (goal) {
      goal = await localizeRewardRow(goal, contentLocale, 'sv-SE', rewardLocalizeOpts);
    }

    let pendingChangeRequest = pendingChangeResult.rows[0] || null;
    if (pendingChangeRequest) {
      const [localized] = await localizeRewardItems(
        [pendingChangeRequest],
        contentLocale,
        'sv-SE',
        rewardLocalizeOpts
      );
      pendingChangeRequest = localized;
    }

    let progress = 0;
    if (goal && goal.star_cost > 0) {
      progress = Math.min(100, Math.round((balance / goal.star_cost) * 100));
    }

    res.json({
      goal,
      star_balance: balance,
      progress_pct: progress,
      pending_change_request: pendingChangeRequest,
    });
  } catch (err) {
    console.error('[GOALS] Child goal get error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * POST /api/me/goal
 * Child sets their own goal (only if no active goal exists).
 * Body: { reward_id }
 */
childRouter.post('/goal', validate(ChildSetGoalSchema), async (req, res) => {
  try {
    const childId = req.user.id;
    const { reward_id } = req.body;
    if (!reward_id) return res.status(400).json({ error: 'reward_id krävs' });

    // Check no active goal exists
    const existing = await db.query(
      `SELECT id FROM child_reward_goal WHERE child_id = $1 AND status = 'active' LIMIT 1`,
      [childId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Du har redan ett aktivt mål. Begär byte istället.' });
    }

    // Verify reward is visible to this child
    const childResult = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    if (childResult.rows.length === 0) return res.status(404).json({ error: 'Barn hittades inte' });
    const familyId = childResult.rows[0].family_id;

    const rewardCheck = await db.query(
      `SELECT id, name FROM reward WHERE id = $1 AND family_id = $2 AND is_active = true
       AND (visible_to_children IS NULL OR $3 = ANY(visible_to_children))`,
      [reward_id, familyId, childId]
    );
    if (rewardCheck.rows.length === 0) return res.status(404).json({ error: 'Belöning hittades inte' });

    await db.query(
      `INSERT INTO child_reward_goal (child_id, reward_id, status) VALUES ($1, $2, 'active')`,
      [childId, reward_id]
    );
    res.status(201).json({ message: `Mål satt: ${rewardCheck.rows[0].name}!` });
  } catch (err) {
    console.error('[GOALS] Child set goal error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * POST /api/me/goal/change-request
 * Child requests to change their active goal.
 * Body: { to_reward_id }
 */
childRouter.post('/goal/change-request', validate(GoalChangeRequestSchema), async (req, res) => {
  try {
    const childId = req.user.id;
    const { to_reward_id } = req.body;
    if (!to_reward_id) return res.status(400).json({ error: 'to_reward_id krävs' });

    // Get current active goal
    const current = await db.query(
      `SELECT crg.id, crg.reward_id FROM child_reward_goal crg
       WHERE crg.child_id = $1 AND crg.status = 'active' LIMIT 1`,
      [childId]
    );

    // Check no pending change request already
    const existingReq = await db.query(
      `SELECT id FROM child_reward_goal_change_request
       WHERE child_id = $1 AND status = 'pending' LIMIT 1`,
      [childId]
    );
    if (existingReq.rows.length > 0) {
      return res.status(409).json({ error: 'Du har redan en väntande bytebegäran.' });
    }

    // Verify the new reward is visible to this child
    const childResult = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    if (childResult.rows.length === 0) return res.status(404).json({ error: 'Barn hittades inte' });
    const familyId = childResult.rows[0].family_id;

    const rewardCheck = await db.query(
      `SELECT id, name FROM reward WHERE id = $1 AND family_id = $2 AND is_active = true
       AND (visible_to_children IS NULL OR $3 = ANY(visible_to_children))`,
      [to_reward_id, familyId, childId]
    );
    if (rewardCheck.rows.length === 0) return res.status(404).json({ error: 'Belöning hittades inte' });

    const fromRewardId = current.rows.length > 0 ? current.rows[0].reward_id : null;

    await db.query(
      `INSERT INTO child_reward_goal_change_request (child_id, from_reward_id, to_reward_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [childId, fromRewardId, to_reward_id]
    );
    res.status(201).json({ message: `Bytebegäran skickad för ${rewardCheck.rows[0].name}!` });
  } catch (err) {
    console.error('[GOALS] Change request error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

/**
 * GET /api/me/manual-stars
 * Returns the child's manual star feed (from parents).
 */
childRouter.get('/manual-stars', async (req, res) => {
  try {
    const childId = req.user.id;
    const result = await db.query(
      `SELECT msg.id, msg.star_count, msg.reason, msg.image_url, msg.created_at,
              p.name AS parent_name
       FROM manual_star_grant msg
       JOIN parent p ON p.id = msg.granted_by
       WHERE msg.child_id = $1
       ORDER BY msg.created_at DESC LIMIT 30`,
      [childId]
    );
    res.json({ grants: result.rows });
  } catch (err) {
    console.error('[GOALS] Child manual stars error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = { parentRouter, childRouter };
