'use strict';

/**
 * Family member + child management routes.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 */

const express = require('express');
const db = require('../../lib/db');
const { deleteAvatarForChildRecord, deleteAvatarForParentRecord } = require('../../lib/avatar-service');
const { validate } = require('../../middleware/validate');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { UpdateFamilyMemberSchema } = require('../../lib/schemas');
const { syncAccountType } = require('../../../db/parent-access');
const { setActiveChildrenForParent, revokeAllActiveLinksForParent, grantPrimaryAdminLink } = require('../../../db/parent-child-links');
const { revokeAllRefreshTokens } = require('../../lib/refresh-tokens');
const {
  assertCanUpdateMemberChildren,
  assertAuthorizedChildLinkDelta,
  assertAuthorizedMemberDelete,
  assertCanRecoverOrphanChild,
  lockParentChildRowsForChildren,
  assertNoChildWithoutAdmin,
} = require('../../lib/family-member-children-authz');
const { notifyParentAccessRevoked } = require('../../lib/parent-access-sse');

const router = express.Router();

// ─── PUT /api/family/members/:id ────────────────────────
router.put('/members/:id', validate(UpdateFamilyMemberSchema), async (req, res) => {
  try {
    const { family_role } = req.body;
    const memberId = req.params.id;

    // Verify member belongs to the same family
    const memberResult = await db.query(
      'SELECT id FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medlem hittades inte' });
    }

    const validRoles = ['mamma', 'pappa', 'bonusförälder', 'annan'];
    if (family_role !== undefined) {
      if (family_role !== null && !validRoles.includes(family_role)) {
        return res.status(400).json({ error: 'Ogiltig roll. Välj: mamma, pappa, bonusförälder eller annan' });
      }
      await db.query(
        'UPDATE parent SET family_role = $1 WHERE id = $2',
        [family_role || null, memberId]
      );
    }

    res.json({ message: 'Roll uppdaterad!' });
  } catch (err) {
    console.error('[FAMILY] Member update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/family/members/:id/children ────────────────
// Update which children a parent can see
router.put('/members/:id/children', async (req, res) => {
  const client = await db.getClient();
  try {
    const memberId = req.params.id;
    const childIds = req.body.child_ids || req.body.childIds;

    if (!Array.isArray(childIds) || childIds.length === 0) {
      return res.status(400).json({ error: 'Minst ett barn måste väljas' });
    }

    const authzCheck = await assertCanUpdateMemberChildren(req.user.id, memberId, req.user.familyId);
    if (!authzCheck.ok) {
      return res.status(403).json({ error: authzCheck.message || 'Åtkomst nekad' });
    }

    await client.query('BEGIN');

    const memberResult = await client.query(
      'SELECT id FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medlem hittades inte' });
    }

    const childResult = await client.query(
      'SELECT id FROM child WHERE family_id = $1 ORDER BY id',
      [req.user.familyId]
    );
    const familyChildIds = childResult.rows.map((r) => r.id);
    const familyChildIdSet = new Set(familyChildIds);
    const invalidIds = childIds.filter((id) => !familyChildIdSet.has(id));
    if (invalidIds.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ogiltiga barn-ID:n' });
    }

    await lockParentChildRowsForChildren(client, familyChildIds);

    const deltaCheck = await assertAuthorizedChildLinkDelta(
      client,
      req.user.id,
      req.user.familyId,
      memberId,
      childIds
    );
    if (!deltaCheck.ok) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: deltaCheck.message || 'Åtkomst nekad' });
    }

    const orphanCheck = await assertNoChildWithoutAdmin(
      client,
      req.user.familyId,
      memberId,
      childIds
    );
    if (!orphanCheck.ok) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: orphanCheck.message || 'Åtkomst nekad' });
    }

    await setActiveChildrenForParent(client, memberId, childIds, { revokedBy: req.user.id });

    await client.query('COMMIT');

    notifyParentAccessRevoked(memberId, req.user.familyId);

    await syncAccountType(memberId);
    await revokeAllRefreshTokens({ userId: memberId, userType: 'parent' });

    res.json({ message: 'Barnkopplingar uppdaterade!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Update member children error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/family/members/:id ─────────────────────
router.delete('/members/:id', async (req, res) => {
  const client = await db.getClient();
  try {
    const memberId = req.params.id;

    const authzCheck = await assertCanUpdateMemberChildren(req.user.id, memberId, req.user.familyId);
    if (!authzCheck.ok) {
      return res.status(403).json({ error: authzCheck.message || 'Åtkomst nekad' });
    }

    await client.query('BEGIN');

    const allParents = await client.query(
      'SELECT id, is_admin FROM parent WHERE family_id = $1',
      [req.user.familyId]
    );
    if (allParents.rows.length <= 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Kan inte ta bort sista föräldern i familjen' });
    }

    const memberResult = await client.query(
      'SELECT id, is_admin FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medlem hittades inte' });
    }

    if (!req.user.isAdmin && memberResult.rows[0].is_admin) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Kan inte ta bort en admin' });
    }

    const childResult = await client.query(
      'SELECT id FROM child WHERE family_id = $1 ORDER BY id',
      [req.user.familyId]
    );
    const familyChildIds = childResult.rows.map((r) => r.id);
    await lockParentChildRowsForChildren(client, familyChildIds);

    const deleteAuthz = await assertAuthorizedMemberDelete(
      client,
      req.user.id,
      req.user.familyId,
      memberId
    );
    if (!deleteAuthz.ok) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: deleteAuthz.message || 'Åtkomst nekad' });
    }

    const orphanCheck = await assertNoChildWithoutAdmin(
      client,
      req.user.familyId,
      memberId,
      []
    );
    if (!orphanCheck.ok) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: orphanCheck.message || 'Åtkomst nekad' });
    }

    await revokeAllActiveLinksForParent(client, memberId, req.user.id);

    await client.query(
      'DELETE FROM notification_preference WHERE parent_id = $1',
      [memberId]
    );

    await deleteAvatarForParentRecord(memberId);

    await client.query('DELETE FROM parent WHERE id = $1', [memberId]);

    await client.query('COMMIT');

    notifyParentAccessRevoked(memberId, req.user.familyId);
    await revokeAllRefreshTokens({ userId: memberId, userType: 'parent' });

    res.json({ message: 'Förälder borttagen från familjen.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Member delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

// ─── POST /api/family/children/:id/recover-admin ────────
router.post('/children/:id/recover-admin', requireNotPedagogOnly, async (req, res) => {
  const client = await db.getClient();
  try {
    const childId = req.params.id;
    await client.query('BEGIN');

    const recoverCheck = await assertCanRecoverOrphanChild(
      client,
      req.user.id,
      req.user.familyId,
      childId
    );
    if (!recoverCheck.ok) {
      await client.query('ROLLBACK');
      const status = recoverCheck.code === 'NOT_FOUND' ? 404 : 403;
      return res.status(status).json({ error: recoverCheck.message || 'Åtkomst nekad' });
    }

    await lockParentChildRowsForChildren(client, [childId]);
    await grantPrimaryAdminLink(client, req.user.id, childId);

    await client.query('COMMIT');
    console.warn('[FAMILY] orphan_admin_recovery', {
      familyId: req.user.familyId,
      childId,
      callerId: req.user.id,
    });
    res.json({ message: 'Åtkomst återställd för barnet' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Orphan recover error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/family/children/:id ───────────────────
// Explicit cascading delete — older FK constraints lack ON DELETE CASCADE
// Blocked for pedagog-only parents
router.delete('/children/:id', requireNotPedagogOnly, async (req, res) => {
  const client = await db.getClient();
  try {
    const childId = req.params.id;

    // Verify child belongs to this family
    const childResult = await client.query(
      'SELECT id FROM child WHERE id = $1 AND family_id = $2',
      [childId, req.user.familyId]
    );
    if (childResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Barn hittades inte' });
    }

    await client.query('BEGIN');

    // Delete related records in dependency order (tables without ON DELETE CASCADE)
    await client.query('DELETE FROM streak WHERE child_id = $1', [childId]);
    await client.query('DELETE FROM parent_note WHERE child_id = $1', [childId]);
    await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [childId]);

    // daily_log_item ratings → daily_log_items → daily_logs
    await client.query(
      `DELETE FROM rating WHERE daily_log_item_id IN (
         SELECT dli.id FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         WHERE dl.child_id = $1
       )`, [childId]
    );
    await client.query(
      `DELETE FROM daily_log_item WHERE daily_log_id IN (
         SELECT id FROM daily_log WHERE child_id = $1
       )`, [childId]
    );
    await client.query('DELETE FROM daily_log WHERE child_id = $1', [childId]);

    // weekly_schedule_items → weekly_schedules
    await client.query(
      `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
         SELECT id FROM weekly_schedule WHERE child_id = $1
       )`, [childId]
    );
    await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [childId]);

    await deleteAvatarForChildRecord(childId);

    // parent-child links and child record
    await client.query('DELETE FROM parent_child WHERE child_id = $1', [childId]);
    await client.query('DELETE FROM child WHERE id = $1', [childId]);

    await client.query('COMMIT');
    res.json({ message: 'Barn borttaget' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Child delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

module.exports = router;
