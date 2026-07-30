/**
 * Rewards and redemption routes.
 * Exports: { parentRouter, childRouter }
 *
 * Sends reward_redemption email notifications to linked parents on child redeem,
 * gated by notification_preference.reward_redemption = true.
 */

const express = require('express');
const db = require('../lib/db');
const { getStarBalance } = require('../lib/reward-balance');
const {
  sendRewardRedemptionError,
  mapRedemptionUniqueViolation,
} = require('../lib/reward-redemption-errors');
const { requireParent, requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const { requireNotPedagogOnly, getChildAccess, requireChildAccess } = require('../middleware/authz');
const { sendRewardRedemptionEmail } = require('../lib/email');
const { notifyParentsRewardRequest } = require('../lib/push');
const { getFamilyPreferredLocale } = require('../lib/family-locale');
const { localizeRewardItems } = require('../lib/family-content-display');
const { validate, validateParams } = require('../middleware/validate');
const {
  CreateRewardSchema,
  UpdateRewardSchema,
  ReorderSchema,
  UUIDParam,
} = require('../lib/schemas');

const REDEMPTION_SNAPSHOT_SQL = `
  COALESCE(rr.reward_name, r.name) AS reward_name,
  COALESCE(rr.reward_icon, r.icon) AS reward_icon,
  COALESCE(rr.star_cost, r.star_cost) AS star_cost`;

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
parentRouter.get('/child-view/:childId', requireChildAccess('childId'), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;

    const child = req.authzChild;
    const familyId = child.family_id;

    // All active rewards visible to this child — DISTINCT ON prevents duplicate rows
    // if same reward somehow ended up with multiple rows (e.g. copy-flux on child creation)
    const rewards = await db.query(
      `SELECT DISTINCT ON (r.id) r.id, r.name, r.icon, r.star_cost, r.requires_approval,
              r.source_default_id, COALESCE(r.modified_by_family, false) AS modified_by_family
       FROM reward r
       WHERE r.family_id = $1 AND r.is_active = true
         AND (r.visible_to_children IS NULL OR $2 = ANY(r.visible_to_children))
       ORDER BY r.id, r.sort_order ASC, r.star_cost ASC`,
      [familyId, childId]
    );

    const balance = await getStarBalance(childId);

    const redemptions = await db.query(
      `SELECT rr.id, rr.reward_id, rr.status, rr.created_at,
              ${REDEMPTION_SNAPSHOT_SQL},
              r.source_default_id, COALESCE(r.modified_by_family, false) AS modified_by_family
       FROM reward_redemption rr JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1 ORDER BY rr.created_at DESC LIMIT 50`,
      [childId]
    );

    const locale = await getFamilyPreferredLocale(familyId);

    res.json({
      child: { id: child.id, name: child.name, emoji: child.emoji },
      rewards: await localizeRewardItems(rewards.rows, locale),
      starBalance: balance,
      redemptions: await localizeRewardItems(redemptions.rows, locale),
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
      `SELECT id, name, icon, star_cost, requires_approval, is_active, is_favorite, sort_order, visible_to_children,
              source_default_id, COALESCE(modified_by_family, false) AS modified_by_family
       FROM reward WHERE family_id = $1 ORDER BY sort_order ASC, star_cost ASC`,
      [req.user.familyId]
    );
    const locale = await getFamilyPreferredLocale(req.user.familyId);
    res.json({
      rewards: await localizeRewardItems(result.rows, locale),
      children: childrenResult.rows,
    });
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
      'SELECT id, is_active FROM reward WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Belöning hittades inte' });
    }
    if (!existing.rows[0].is_active) {
      return res.json({ message: 'Belöning borttagen' });
    }
    await db.query(
      `UPDATE reward SET is_active = false, modified_by_family = true WHERE id = $1 AND family_id = $2`,
      [req.params.id, req.user.familyId]
    );
    res.json({ message: 'Belöning borttagen' });
  } catch (err) {
    console.error('[REWARDS] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

parentRouter.get('/redemptions', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rr.id, rr.status, rr.created_at, rr.approved_by, rr.sort_order,
              ${REDEMPTION_SNAPSHOT_SQL},
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
  // Lock order: child row first, then conditional redemption update (matches deny path).
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const rrLookup = await client.query(
      `SELECT rr.id, rr.status, rr.child_id, rr.star_cost,
              COALESCE(rr.reward_name, r.name) AS reward_name
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
      return sendRewardRedemptionError(res, 'redemption_not_pending');
    }

    const cost = parseInt(star_cost ?? 0, 10);

    await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [child_id]);

    const balance = await getStarBalance(child_id, client);
    if (balance < cost) {
      await client.query('ROLLBACK');
      return sendRewardRedemptionError(res, 'insufficient_stars', {
        error: 'Barnet har inte tillräckligt med stjärnor',
      });
    }

    const updated = await client.query(
      `UPDATE reward_redemption
       SET status = 'approved', approved_by = $1, redeemed_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING id`,
      [req.user.id, req.params.id]
    );

    if (updated.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendRewardRedemptionError(res, 'redemption_not_pending');
    }

    await client.query('COMMIT');
    res.json({ message: 'Inlösen av ' + reward_name + ' godkänd!' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '40P01') {
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
  // Lock order: child row first, then conditional redemption update (matches approve path).
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const rrLookup = await client.query(
      `SELECT rr.id, rr.status, rr.child_id,
              COALESCE(rr.reward_name, r.name) AS reward_name
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

    const { child_id, reward_name } = rrLookup.rows[0];
    if (rrLookup.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return sendRewardRedemptionError(res, 'redemption_not_pending');
    }

    await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [child_id]);

    const updated = await client.query(
      `UPDATE reward_redemption
       SET status = 'denied', redeemed_at = NULL
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [req.params.id]
    );

    if (updated.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendRewardRedemptionError(res, 'redemption_not_pending');
    }

    await client.query('COMMIT');
    res.json({ message: 'Inlösen av ' + reward_name + ' nekad.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '40P01') {
      console.error('[REWARDS] Deadlock detected in deny:', err);
      return res.status(503).json({ error: 'Tjänsten är upptagen, försök igen.' });
    }
    console.error('[REWARDS] Deny error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  } finally {
    client.release();
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
  // Active rewards stay visible; each approval is a separate history row (repeatable redemptions).
    const rewards = await db.query(
      `SELECT r.id, r.name, r.icon, r.star_cost, r.requires_approval,
              r.source_default_id, COALESCE(r.modified_by_family, false) AS modified_by_family
       FROM reward r
       WHERE r.family_id = $1 AND r.is_active = true
         AND (r.visible_to_children IS NULL OR $2 = ANY(r.visible_to_children))
       ORDER BY r.sort_order ASC, r.star_cost ASC`,
      [familyId, childId]
    );
    const visibleRewards = rewards.rows;
    const balance = await getStarBalance(childId);
    const redemptions = await db.query(
      `SELECT rr.id, rr.reward_id, rr.status, rr.created_at,
              ${REDEMPTION_SNAPSHOT_SQL},
              r.source_default_id, COALESCE(r.modified_by_family, false) AS modified_by_family
       FROM reward_redemption rr JOIN reward r ON r.id = rr.reward_id
       WHERE rr.child_id = $1 ORDER BY rr.created_at DESC LIMIT 50`,
      [childId]
    );
    const locale = await getFamilyPreferredLocale(familyId);
    res.json({
      rewards: await localizeRewardItems(visibleRewards, locale),
      starBalance: balance,
      redemptions: await localizeRewardItems(redemptions.rows, locale),
    });
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

    // Lock order: reward row -> child row (serializes concurrent pending inserts).
    const rewardResult = await client.query(
      `SELECT id, name, icon, star_cost, requires_approval, is_active, visible_to_children
       FROM reward WHERE id = $1 AND family_id = $2
       FOR UPDATE`,
      [req.params.id, familyId]
    );
    if (rewardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Belöning hittades inte' });
    }
    const reward = rewardResult.rows[0];

    if (!reward.is_active) {
      await client.query('ROLLBACK');
      return sendRewardRedemptionError(res, 'reward_inactive');
    }

    if (reward.visible_to_children !== null && Array.isArray(reward.visible_to_children)) {
      if (!reward.visible_to_children.includes(childId)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Den här belöningen är inte synlig för dig' });
      }
    }

    await client.query('SELECT id FROM child WHERE id = $1 FOR UPDATE', [childId]);

    const balance = await getStarBalance(childId, client);
    if (balance < reward.star_cost) {
      await client.query('ROLLBACK');
      return sendRewardRedemptionError(res, 'insufficient_stars', {
        error: `Du har ${balance} stjärnor men behöver ${reward.star_cost} för ${reward.name}`,
      });
    }

    const insertResult = await client.query(
      `INSERT INTO reward_redemption (
         reward_id, child_id, status, star_cost, reward_name, reward_icon
       )
       VALUES ($1, $2, 'pending', $3, $4, $5)
       RETURNING id, status`,
      [req.params.id, childId, reward.star_cost, reward.name, reward.icon]
    );

    await client.query('COMMIT');
    redemptionResult = insertResult.rows[0];
    rewardForNotify = reward;
    familyIdForNotify = familyId;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const conflictKey = mapRedemptionUniqueViolation(err);
    if (conflictKey) {
      return sendRewardRedemptionError(res, conflictKey);
    }
    if (err.code === '40P01') {
      console.error('[REWARDS] Deadlock detected in redeem:', err);
      return res.status(503).json({ error: 'Tjänsten är upptagen, försök igen.' });
    }
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
    `SELECT c.name AS child_name, c.emoji AS child_emoji, c.family_id
     FROM child c WHERE c.id = $1`,
    [childId]
  );
  if (childResult.rows.length === 0) return;
  const { child_name, child_emoji, family_id } = childResult.rows[0];
  const locale = await getFamilyPreferredLocale(family_id);

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
    await sendRewardRedemptionEmail({
      to: parent.email,
      parentName: parent.parent_name,
      childName: child_name,
      childEmoji: child_emoji,
      rewardName: reward.name,
      rewardIcon: reward.icon,
      starCost: reward.star_cost,
      locale,
    });
    console.log(`[REWARDS] Redemption notification sent to parent ${parent.id} for child ${child_name}`);
  }
}

module.exports = { parentRouter, childRouter, getStarBalance };
