/**
 * Rewards and redemption routes.
 * Exports: { parentRouter, childRouter }
 *
 * Sends reward_redemption email notifications to linked parents on child redeem,
 * gated by notification_preference.reward_redemption = true.
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent, requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const { requireNotPedagogOnly } = require('../middleware/authz');
const { sendEmail } = require('../lib/email');
const { notifyParentsRewardRequest } = require('../lib/push');
const { validate, validateParams } = require('../middleware/validate');
const {
  CreateRewardSchema,
  UpdateRewardSchema,
  ReorderSchema,
  UUIDParam,
} = require('../lib/schemas');

/**
 * Compute star balance for a child.
 * Earned = sum of star_value on completed daily_log_items.
 * Spent = sum of star_cost snapshots on approved/auto redemptions
 *         (falls back to reward.star_cost for pre-migration rows).
 */
async function getStarBalance(childId) {
  // Run all balance queries in parallel — they are independent reads
  const [earnedResult, spentSnapshotResult, spentLegacyResult] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(dli.star_value), 0) AS earned
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [childId]
    ),
    // Snapshotted star_cost (migration 007+)
    db.query(
      `SELECT COALESCE(SUM(rr.star_cost), 0) AS spent
       FROM reward_redemption rr
       WHERE rr.child_id = $1
         AND rr.status IN ('approved', 'auto')
         AND rr.star_cost IS NOT NULL`,
      [childId]
    ),
    // Legacy rows without snapshot — join to reward for current price
    db.query(
      `SELECT COALESCE(SUM(r.star_cost), 0) AS spent
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1
         AND rr.status IN ('approved', 'auto')
         AND rr.star_cost IS NULL`,
      [childId]
    ),
  ]);

  // Manual star grants from parents (migration 042+) — table may not exist on old instances
  let manualStars = 0;
  try {
    const manualResult = await db.query(
      `SELECT COALESCE(SUM(star_count), 0) AS manual FROM manual_star_grant WHERE child_id = $1`,
      [childId]
    );
    manualStars = parseInt(manualResult.rows[0].manual, 10);
  } catch (_) {
    // Table may not exist yet on old instances — graceful fallback
  }

  const earned = parseInt(earnedResult.rows[0].earned, 10);
  const spent = parseInt(spentSnapshotResult.rows[0].spent, 10) + parseInt(spentLegacyResult.rows[0].spent, 10);
  return Math.max(0, earned + manualStars - spent);
}

// ─── Parent Router ────────────────────────────────────────

const parentRouter = express.Router();
parentRouter.use(requireParent);
parentRouter.use(requireNotPedagogOnly);

/**
 * GET /api/rewards/child-view/:childId
 * Parent read-only view of a child's Skattkammaren.
 * Returns same shape as the child's /api/me/rewards endpoint:
 * { rewards, starBalance, redemptions }
 * Also includes the child's name/emoji for display.
 * Requires the requesting parent to have parent_child link to childId.
 */
parentRouter.get('/child-view/:childId', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;

    // Verify parent has access to this child
    const accessCheck = await db.query(
      `SELECT c.id, c.name, c.emoji, c.family_id FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE c.id = $1 AND pc.parent_id = $2`,
      [childId, parentId]
    );
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Inget tillstånd för detta barn' });
    }
    const child = accessCheck.rows[0];
    const familyId = child.family_id;

    // All active rewards visible to this child — DISTINCT ON prevents duplicate rows
    // if same reward somehow ended up with multiple rows (e.g. copy-flux on child creation)
    const rewards = await db.query(
      `SELECT DISTINCT ON (r.id) r.id, r.name, r.icon, r.star_cost, r.requires_approval
       FROM reward r
       WHERE r.family_id = $1 AND r.is_active = true
         AND (r.visible_to_children IS NULL OR $2 = ANY(r.visible_to_children))
       ORDER BY r.id, r.sort_order ASC, r.star_cost ASC`,
      [familyId, childId]
    );

    const balance = await getStarBalance(childId);

    const redemptions = await db.query(
      `SELECT rr.id, rr.reward_id, rr.status, rr.created_at,
              r.name AS reward_name, r.icon AS reward_icon,
              COALESCE(rr.star_cost, r.star_cost) AS star_cost
       FROM reward_redemption rr JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1 ORDER BY rr.created_at DESC LIMIT 50`,
      [childId]
    );

    res.json({
      child: { id: child.id, name: child.name, emoji: child.emoji },
      rewards: rewards.rows,
      starBalance: balance,
      redemptions: redemptions.rows,
    });
  } catch (err) {
    console.error('[REWARDS] Child-view error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

parentRouter.get('/', async (req, res) => {
  try {
    // Also fetch children for the visibility checkbox UI
    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1
       ORDER BY c.sort_order ASC, c.created_at ASC`,
      [req.user.id]
    );
    const result = await db.query(
      `SELECT id, name, icon, star_cost, requires_approval, is_active, is_favorite, sort_order, visible_to_children
       FROM reward WHERE family_id = $1 ORDER BY sort_order ASC, star_cost ASC`,
      [req.user.familyId]
    );
    res.json({ rewards: result.rows, children: childrenResult.rows });
  } catch (err) {
    console.error('[REWARDS] List error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

parentRouter.post('/', validate(CreateRewardSchema), async (req, res) => {
  try {
    const { name, icon, star_cost, requires_approval, visible_to_children } = req.body;
    if (!name || !star_cost) {
      return res.status(400).json({ error: 'Namn och stjärnkostnad krävs' });
    }
    const cost = parseInt(star_cost, 10);
    if (isNaN(cost) || cost < 1) {
      return res.status(400).json({ error: 'Stjärnkostnad måste vara minst 1' });
    }
    // visible_to_children: null = all children, array = specific children
    // Validate: if it's an array, it must only contain UUIDs and belong to this family
    let validatedVisible = null;
    if (visible_to_children && Array.isArray(visible_to_children)) {
      // Validate all child IDs belong to this family
      const childIds = visible_to_children.filter(id => typeof id === 'string' && id.length > 0);
      if (childIds.length > 0) {
        const validChildren = await db.query(
          `SELECT id FROM child WHERE id = ANY($1) AND family_id = $2`,
          [childIds, req.user.familyId]
        );
        const validIds = validChildren.rows.map(r => r.id);
        // Only include children that actually exist and belong to this family
        validatedVisible = childIds.filter(id => validIds.includes(id));
      }
    }
    const result = await db.query(
      `INSERT INTO reward (family_id, name, icon, star_cost, requires_approval, is_active, visible_to_children)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, name, icon, star_cost, requires_approval, is_active, visible_to_children`,
      [req.user.familyId, name.trim(), icon || '🎁', cost, requires_approval === true, (validatedVisible?.length > 0 ? validatedVisible : null)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[REWARDS] Create error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── PUT /api/rewards/reorder ───────────────────────────
// IMPORTANT: This route MUST be defined before /:id to avoid Express matching "reorder" as a UUID
parentRouter.put('/reorder', validate(ReorderSchema), async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, sort_order }' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const item of order) {
        if (!item.id || typeof item.sort_order !== 'number') continue;
        await client.query(
          'UPDATE reward SET sort_order = $1 WHERE id = $2 AND family_id = $3',
          [item.sort_order, item.id, req.user.familyId]
        );
      }
      await client.query('COMMIT');
      res.json({ message: 'Ordning uppdaterad' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[REWARDS] Reorder error:', err);
    res.status(500).json({ error: 'Något gick fel vid sparandet.' });
  }
});

parentRouter.put('/:id', validateParams(UUIDParam), validate(UpdateRewardSchema), async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id FROM reward WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Belöning hittades inte' });
    }
    const body = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (body.name !== undefined) { updates.push('name = $' + idx); idx++; values.push(body.name.trim()); }
    if (body.icon !== undefined) { updates.push('icon = $' + idx); idx++; values.push(body.icon); }
    if (body.star_cost !== undefined) {
      const cost = parseInt(body.star_cost, 10);
      if (isNaN(cost) || cost < 1) {
        return res.status(400).json({ error: 'Stjärnkostnad måste vara minst 1' });
      }
      updates.push('star_cost = $' + idx); idx++; values.push(cost);
    }
    if (body.requires_approval !== undefined) {
      updates.push('requires_approval = $' + idx); idx++; values.push(Boolean(body.requires_approval));
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = $' + idx); idx++; values.push(Boolean(body.is_active));
    }
    if (body.is_favorite !== undefined) {
      updates.push('is_favorite = $' + idx); idx++; values.push(Boolean(body.is_favorite));
    }
    if (body.visible_to_children !== undefined) {
      // null = all children, [] = no children, [id,...] = specific children
      let validated = null; // default: visible to all
      if (body.visible_to_children === null) {
        validated = null; // explicit null → visible to all
      } else if (Array.isArray(body.visible_to_children)) {
        const childIds = body.visible_to_children.filter(id => typeof id === 'string' && id.length > 0);
        if (childIds.length === 0) {
          validated = []; // empty array → hidden from all children
        } else {
          const validChildren = await db.query(
            `SELECT id FROM child WHERE id = ANY($1) AND family_id = $2`,
            [childIds, req.user.familyId]
          );
          const validIds = validChildren.rows.map(r => r.id);
          validated = childIds.filter(id => validIds.includes(id));
          // If validated is empty after filtering (all IDs were invalid), hide from all
          if (validated.length === 0) validated = [];
        }
      }
      updates.push('visible_to_children = $' + idx); idx++; values.push(validated);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Inget att uppdatera' });
    }
    // Mark as family-modified so admin syncs won't overwrite it
    updates.push('modified_by_family = true');
    values.push(req.params.id);
    const result = await db.query(
      `UPDATE reward SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, icon, star_cost, requires_approval, is_active, is_favorite, visible_to_children`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[REWARDS] Update error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

parentRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id FROM reward WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Belöning hittades inte' });
    }
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM reward_redemption WHERE reward_id = $1', [req.params.id]);
      await client.query('DELETE FROM reward WHERE id = $1', [req.params.id]);
      await client.query('COMMIT');
      res.json({ message: 'Belöning borttagen' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[REWARDS] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

parentRouter.get('/redemptions', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rr.id, rr.status, rr.created_at, rr.approved_by, rr.sort_order,
              COALESCE(rr.star_cost, r.star_cost) AS star_cost,
              r.name AS reward_name, r.icon AS reward_icon,
              c.name AS child_name, c.emoji AS child_emoji, c.id AS child_id
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       JOIN child c ON c.id = rr.child_id
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1
       ORDER BY rr.sort_order ASC, rr.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[REWARDS] Redemptions list error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── PUT /api/rewards/redemptions/reorder ────────────────
// IMPORTANT: This route MUST be defined before /redemptions/:id/* to avoid Express matching "reorder" as a UUID
parentRouter.put('/redemptions/reorder', validate(ReorderSchema), async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, sort_order }' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const item of order) {
        if (!item.id || typeof item.sort_order !== 'number') continue;
        // Only allow reordering redemptions that belong to this parent's children
        await client.query(
          `UPDATE reward_redemption SET sort_order = $1
           WHERE id = $2
           AND child_id IN (SELECT child_id FROM parent_child WHERE parent_id = $3)`,
          [item.sort_order, item.id, req.user.id]
        );
      }
      await client.query('COMMIT');
      res.json({ message: 'Ordning uppdaterad' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[REWARDS] Redemptions reorder error:', err);
    res.status(500).json({ error: 'Något gick fel vid sparandet.' });
  }
});

parentRouter.put('/redemptions/:id/approve', async (req, res) => {
  // Lock order: child row FIRST (to match redeem-path order), then redemption row.
  // Inline balance calculation via transaction client (not pool) for consistent snapshot.
  // Deadlock risk eliminated: both approve and redeem lock child → redemption in same order.
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch redemption to get child_id (no FOR UPDATE here — child lock comes first)
    const rrLookup = await client.query(
      `SELECT rr.id, rr.status, rr.child_id, rr.star_cost, r.name AS reward_name
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       JOIN parent_child pc ON pc.child_id = rr.child_id
       WHERE rr.id = $1 AND pc.parent_id = $2`,
      [req.params.id, req.user.id]
    );

    if (rrLookup.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inlösen hittades inte' });
    }

    const { child_id, star_cost, reward_name } = rrLookup.rows[0];
    if (rrLookup.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Kan bara godkänna väntande inlösen' });
    }

    const cost = parseInt(star_cost ?? 0, 10);

    // 2. Lock child row FIRST — serializes all approves + redeems for this child.
    // Matches the lock order in the redeem path to prevent deadlock.
    await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [child_id]);

    // 3. Now lock the redemption row
    const rr = await client.query(
      `SELECT id, status FROM reward_redemption WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (rr.rows.length === 0 || rr.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Redan hanterad' });
    }

    // 4. Inline balance check via transaction client — same SQL as redeem path (lines 569-599).
    // Runs inside the transaction so snapshot is consistent with the row locks.
    const earnedResult = await client.query(
      `SELECT COALESCE(SUM(dli.star_value), 0) AS earned
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [child_id]
    );
    let manualStars = 0;
    try {
      const manualResult = await client.query(
        `SELECT COALESCE(SUM(star_count), 0) AS manual FROM manual_star_grant WHERE child_id = $1`,
        [child_id]
      );
      manualStars = parseInt(manualResult.rows[0].manual, 10);
    } catch (_) { /* table may not exist on old instances */ }
    const spentSnapshotResult = await client.query(
      `SELECT COALESCE(SUM(rr.star_cost), 0) AS spent
       FROM reward_redemption rr
       WHERE rr.child_id = $1 AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NOT NULL`,
      [child_id]
    );
    const spentLegacyResult = await client.query(
      `SELECT COALESCE(SUM(r.star_cost), 0) AS spent
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1 AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NULL`,
      [child_id]
    );
    const earned = parseInt(earnedResult.rows[0].earned, 10);
    const spent = parseInt(spentSnapshotResult.rows[0].spent, 10) + parseInt(spentLegacyResult.rows[0].spent, 10);
    const balance = Math.max(0, earned + manualStars - spent);

    if (balance < cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Barnet har inte tillräckligt med stjärnor' });
    }

    await client.query(
      `UPDATE reward_redemption SET status = 'approved', approved_by = $1 WHERE id = $2`,
      [req.user.id, req.params.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Inlösen av ' + reward_name + ' godkänd!' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '40P01') {
      // Deadlock detected — log explicitly for monitoring
      console.error('[REWARDS] Deadlock detected in approve:', err);
      return res.status(503).json({ error: 'Tjänsten är upptagen, försök igen.' });
    }
    console.error('[REWARDS] Approve error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  } finally {
    client.release();
  }
});

parentRouter.put('/redemptions/:id/deny', async (req, res) => {
  try {
    const rr = await db.query(
      `SELECT rr.id, rr.status, r.name AS reward_name FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       JOIN parent_child pc ON pc.child_id = rr.child_id
       WHERE rr.id = $1 AND pc.parent_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rr.rows.length === 0) return res.status(404).json({ error: 'Inlösen hittades inte' });
    if (rr.rows[0].status !== 'pending') return res.status(400).json({ error: 'Kan bara neka väntande inlösen' });
    await db.query(`UPDATE reward_redemption SET status = 'denied' WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Inlösen av ' + rr.rows[0].reward_name + ' nekad.' });
  } catch (err) {
    console.error('[REWARDS] Deny error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── Child Router ─────────────────────────────────────────

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/rewards'));
childRouter.use(requireChild);

childRouter.get('/rewards', async (req, res) => {
  try {
    const childId = req.user.id;
    const childResult = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    if (childResult.rows.length === 0) return res.status(404).json({ error: 'Barn hittades inte' });
    const familyId = childResult.rows[0].family_id;

    // Filter: show only active rewards where:
    // - visible_to_children is NULL (visible to all) OR
    // - visible_to_children contains this child's ID
    // Exclude rewards that have already been redeemed by another child (redeemed_at set, not by this child)
    const rewards = await db.query(
      `SELECT r.id, r.name, r.icon, r.star_cost, r.requires_approval,
              CASE WHEN rr_redeemed.id IS NOT NULL AND rr_redeemed.child_id != $1 THEN true ELSE false END AS already_redeemed_by_other
       FROM reward r
       LEFT JOIN reward_redemption rr_redeemed ON rr_redeemed.reward_id = r.id AND rr_redeemed.redeemed_at IS NOT NULL AND rr_redeemed.child_id != $1
       WHERE r.family_id = $2 AND r.is_active = true
         AND (r.visible_to_children IS NULL OR $1 = ANY(r.visible_to_children))
       ORDER BY r.sort_order ASC, r.star_cost ASC`,
      [childId, familyId]
    );
    // Filter out rewards already redeemed by another child
    const visibleRewards = rewards.rows.filter(r => !r.already_redeemed_by_other).map(({ already_redeemed_by_other, ...r }) => r);
    const balance = await getStarBalance(childId);
    const redemptions = await db.query(
      `SELECT rr.id, rr.reward_id, rr.status, rr.created_at,
              r.name AS reward_name, r.icon AS reward_icon,
              COALESCE(rr.star_cost, r.star_cost) AS star_cost
       FROM reward_redemption rr JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1 ORDER BY rr.created_at DESC LIMIT 50`,
      [childId]
    );
    res.json({ rewards: visibleRewards, starBalance: balance, redemptions: redemptions.rows });
  } catch (err) {
    console.error('[REWARDS] Child list error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

childRouter.post('/rewards/:id/redeem', async (req, res) => {
  const childId = req.user.id;
  let redemptionResult = null;
  let rewardForNotify = null;
  let familyIdForNotify = null;

  // Pre-fetch child info outside the transaction (read-only, no race risk)
  let familyId;
  try {
    const childResult = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    if (childResult.rows.length === 0) return res.status(404).json({ error: 'Barn hittades inte' });
    familyId = childResult.rows[0].family_id;
  } catch (err) {
    console.error('[REWARDS] Redeem child lookup error:', err);
    return res.status(500).json({ error: 'Något gick fel.' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Lock the child row to serialize concurrent redemption attempts for the same child.
    // SELECT FOR UPDATE on child serializes all redemptions for this child — prevents
    // two simultaneous requests from both reading the same balance and both succeeding.
    await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [childId]);

    const rewardResult = await client.query(
      `SELECT id, name, icon, star_cost, requires_approval, is_active, visible_to_children
       FROM reward WHERE id = $1 AND family_id = $2`,
      [req.params.id, familyId]
    );
    if (rewardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Belöning hittades inte' });
    }
    const reward = rewardResult.rows[0];

    if (!reward.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Den här belöningen är inte längre tillgänglig' });
    }

    // Check: is this reward visible to this child?
    if (reward.visible_to_children !== null && Array.isArray(reward.visible_to_children)) {
      if (!reward.visible_to_children.includes(childId)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Den här belöningen är inte synlig för dig' });
      }
    }

    // Check: has another child already redeemed this exclusive reward?
    const otherRedemption = await client.query(
      `SELECT id, child_id FROM reward_redemption
       WHERE reward_id = $1 AND redeemed_at IS NOT NULL AND child_id != $2
       LIMIT 1`,
      [req.params.id, childId]
    );
    if (otherRedemption.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Den här belöningen har redan låsts in av ett annat barn' });
    }

    // Re-compute balance inside the transaction (after acquiring the row lock)
    const earnedResult = await client.query(
      `SELECT COALESCE(SUM(dli.star_value), 0) AS earned
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [childId]
    );
    let manualStars = 0;
    try {
      const manualResult = await client.query(
        `SELECT COALESCE(SUM(star_count), 0) AS manual FROM manual_star_grant WHERE child_id = $1`,
        [childId]
      );
      manualStars = parseInt(manualResult.rows[0].manual, 10);
    } catch (_) { /* table may not exist on old instances */ }
    const spentSnapshotResult = await client.query(
      `SELECT COALESCE(SUM(rr.star_cost), 0) AS spent
       FROM reward_redemption rr
       WHERE rr.child_id = $1 AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NOT NULL`,
      [childId]
    );
    const spentLegacyResult = await client.query(
      `SELECT COALESCE(SUM(r.star_cost), 0) AS spent
       FROM reward_redemption rr
       JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1 AND rr.status IN ('approved', 'auto') AND rr.star_cost IS NULL`,
      [childId]
    );
    const earned = parseInt(earnedResult.rows[0].earned, 10);
    const spent = parseInt(spentSnapshotResult.rows[0].spent, 10) + parseInt(spentLegacyResult.rows[0].spent, 10);
    const balance = Math.max(0, earned + manualStars - spent);

    if (balance < reward.star_cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Du har ${balance} stjärnor men behöver ${reward.star_cost} för ${reward.name}`,
      });
    }

    const existingPending = await client.query(
      `SELECT id FROM reward_redemption WHERE child_id = $1 AND reward_id = $2 AND status = 'pending'`,
      [childId, req.params.id]
    );
    if (existingPending.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Du har redan en väntande inlösen för den här belöningen' });
    }

    // All child-initiated redemptions go through parent approval
    // Snapshot star_cost at redemption time
    const insertResult = await client.query(
      `INSERT INTO reward_redemption (reward_id, child_id, status, star_cost, redeemed_at)
       VALUES ($1, $2, 'pending', $3, NOW()) RETURNING id, status`,
      [req.params.id, childId, reward.star_cost]
    );

    await client.query('COMMIT');
    redemptionResult = insertResult.rows[0];
    rewardForNotify = reward;
    familyIdForNotify = familyId;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[REWARDS] Redeem error:', err);
    return res.status(500).json({ error: 'Något gick fel.' });
  } finally {
    client.release();
  }

  // Analytics: feature_treasure_chest — child redeemed a reward
  require('../lib/analytics-tracker').trackTreasureChest(familyIdForNotify);

  const message = `${rewardForNotify.name} skickad för godkännande`;
  res.status(201).json({ message, redemption: redemptionResult, requiresApproval: true });

  // Fire-and-forget: email + push notify linked parents
  notifyParentsOfRedemption(childId, rewardForNotify).catch(err => {
    console.error('[REWARDS] Redemption notification error:', err.message);
  });
  // Push notification to parents for this child's family
  db.query('SELECT name FROM child WHERE id = $1', [childId]).then(cr => {
    const childName = cr.rows[0]?.name || 'Barnet';
    return notifyParentsRewardRequest(familyIdForNotify, childId, childName, rewardForNotify.name);
  }).catch(() => {});
});

/**
 * Send reward redemption email to all parents linked to childId
 * who have reward_redemption = true in notification_preference.
 * Fire-and-forget — never blocks the redeem response.
 */
async function notifyParentsOfRedemption(childId, reward) {
  const childResult = await db.query(
    `SELECT c.name AS child_name, c.emoji AS child_emoji
     FROM child c WHERE c.id = $1`,
    [childId]
  );
  if (childResult.rows.length === 0) return;
  const { child_name, child_emoji } = childResult.rows[0];

  const parentsResult = await db.query(
    `SELECT p.id, p.email, p.name AS parent_name
     FROM parent p
     JOIN parent_child pc ON pc.parent_id = p.id
     JOIN notification_preference np ON np.parent_id = p.id
     WHERE pc.child_id = $1
       AND np.reward_redemption = true
       AND np.email_enabled = true
       AND p.verified = true`,
    [childId]
  );

  for (const parent of parentsResult.rows) {
    const firstName = (parent.parent_name || '').split(' ')[0] || 'Förälder';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1B2340;">
        <h2 style="color:#1B2340;margin-bottom:4px;">Belöning väntar på godkännande! 🎁</h2>
        <p>Hej ${firstName}!</p>
        <div style="border:1px solid #E8ECF4;border-radius:12px;padding:20px;margin:16px 0;">
          <p style="margin:0;font-size:18px;">${child_emoji || '⭐'} <strong>${child_name}</strong> vill lösa in:</p>
          <p style="margin:12px 0 0;font-size:22px;font-weight:700;color:#F5A623;">${reward.icon || '🎁'} ${reward.name}</p>
          <p style="margin:4px 0 0;color:#5A6178;">Kostnad: ${reward.star_cost} stjärnor</p>
        </div>
        <p>Logga in i appen för att godkänna eller neka inlösen.</p>
        <p style="margin-top:24px;font-size:14px;color:#5A6178;">
          Du kan stänga av dessa aviseringar under <strong>Inställningar → Aviseringar</strong>.
        </p>
      </div>
    `;
    await sendEmail({
      to: parent.email,
      subject: `${child_name} vill lösa in "${reward.name}" ⭐`,
      html,
    });
    console.log(`[REWARDS] Redemption notification sent to ${parent.email} for child ${child_name}`);
  }
}

module.exports = { parentRouter, childRouter, getStarBalance };
