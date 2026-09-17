'use strict';

const { sendApiError } = require('../../lib/api-user-error');

/**
 * Family member + child management routes.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 */

const express = require('express');
const db = require('../../lib/db');
const { deleteAvatarForParentRecord } = require('../../lib/avatar-service');
const childDeletion = require('../../lib/child-deletion');
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
  childHasNoAdministrativeAdult,
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
      return sendApiError(res, 404, 'MEMBER_NOT_FOUND');
    }

    const validRoles = ['mamma', 'pappa', 'bonusförälder', 'annan'];
    if (family_role !== undefined) {
      if (family_role !== null && !validRoles.includes(family_role)) {
        return sendApiError(res, 400, 'INVITE_INVALID_ROLE');
      }
      await db.query(
        'UPDATE parent SET family_role = $1 WHERE id = $2',
        [family_role || null, memberId]
      );
    }

    res.json({ code: 'ROLE_UPDATED' });
  } catch (err) {
    console.error('[FAMILY] Member update error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
      return sendApiError(res, 400, 'INVITE_NO_CHILDREN');
    }

    const authzCheck = await assertCanUpdateMemberChildren(req.user.id, memberId, req.user.familyId);
    if (!authzCheck.ok) {
      return sendApiError(res, 403, authzCheck.code || 'ACCESS_DENIED');
    }

    await client.query('BEGIN');

    const memberResult = await client.query(
      'SELECT id FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendApiError(res, 404, 'MEMBER_NOT_FOUND');
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
      return sendApiError(res, 400, 'INVALID_CHILD_IDS');
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
      return sendApiError(res, 403, deltaCheck.code || 'ACCESS_DENIED');
    }

    const orphanCheck = await assertNoChildWithoutAdmin(
      client,
      req.user.familyId,
      memberId,
      childIds
    );
    if (!orphanCheck.ok) {
      await client.query('ROLLBACK');
      return sendApiError(res, 403, orphanCheck.code || 'ACCESS_DENIED');
    }

    await setActiveChildrenForParent(client, memberId, childIds, { revokedBy: req.user.id });

    await client.query('COMMIT');

    notifyParentAccessRevoked(memberId, req.user.familyId);

    await syncAccountType(memberId);
    await revokeAllRefreshTokens({ userId: memberId, userType: 'parent' });

    res.json({ code: 'CHILD_LINKS_UPDATED' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Update member children error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
      return sendApiError(res, 403, authzCheck.code || 'ACCESS_DENIED');
    }

    await client.query('BEGIN');

    const allParents = await client.query(
      'SELECT id, is_admin FROM parent WHERE family_id = $1',
      [req.user.familyId]
    );
    if (allParents.rows.length <= 1) {
      await client.query('ROLLBACK');
      return sendApiError(res, 400, 'LAST_PARENT');
    }

    const memberResult = await client.query(
      'SELECT id, is_admin FROM parent WHERE id = $1 AND family_id = $2',
      [memberId, req.user.familyId]
    );
    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendApiError(res, 404, 'MEMBER_NOT_FOUND');
    }

    if (!req.user.isAdmin && memberResult.rows[0].is_admin) {
      await client.query('ROLLBACK');
      return sendApiError(res, 403, 'CANNOT_DELETE_ADMIN');
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
      return sendApiError(res, 403, deleteAuthz.code || 'ACCESS_DENIED');
    }

    const orphanCheck = await assertNoChildWithoutAdmin(
      client,
      req.user.familyId,
      memberId,
      []
    );
    if (!orphanCheck.ok) {
      await client.query('ROLLBACK');
      return sendApiError(res, 403, orphanCheck.code || 'ACCESS_DENIED');
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

    res.json({ code: 'PARENT_REMOVED' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Member delete error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
      return sendApiError(res, status, recoverCheck.code || 'ACCESS_DENIED');
    }

    await lockParentChildRowsForChildren(client, [childId]);
    if (!(await childHasNoAdministrativeAdult(client, childId))) {
      await client.query('ROLLBACK');
      return sendApiError(res, 403, 'CHILD_HAS_ADULT');
    }
    await grantPrimaryAdminLink(client, req.user.id, childId);

    await client.query('COMMIT');
    console.warn('[FAMILY] orphan_admin_recovery', {
      familyId: req.user.familyId,
      childId,
      callerId: req.user.id,
    });
    res.json({ code: 'CHILD_ACCESS_RESTORED' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY] Orphan recover error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  } finally {
    client.release();
  }
});

// ─── DELETE /api/family/children/:id ───────────────────
// Canonical child-deletion: active primary for THIS child only.
router.delete('/children/:id', requireNotPedagogOnly, async (req, res) => {
  const client = await db.getClient();
  let capturedAvatarKeys = [];
  let committed = false;
  try {
    const outcome = await childDeletion.performChildDeletionInTransaction(client, {
      callerParentId: req.user.id,
      callerFamilyId: req.user.familyId,
      childId: req.params.id,
    });
    if (!outcome.ok) {
      return sendApiError(res, outcome.status, outcome.code || outcome.error || 'ACCESS_DENIED');
    }
    capturedAvatarKeys = outcome.capturedAvatarKeys;
    committed = true;
  } catch (err) {
    console.error('[FAMILY] Child delete error:', err);
    return sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  } finally {
    client.release();
  }

  if (committed) {
    await childDeletion.cleanupAvatarStorageKeysAfterCommit(capturedAvatarKeys);
    return res.json({ code: 'CHILD_DELETED' });
  }
});

module.exports = router;
