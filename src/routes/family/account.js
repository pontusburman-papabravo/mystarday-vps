'use strict';

/**
 * Family account-deletion route.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const familyDeletion = require('../../lib/family-deletion');

const router = express.Router();

function clearSessionCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('token');
}

// ─── DELETE /api/family/delete-account ─────────────────────
// Settings path: self-leave when other authorized adults remain; full family
// deletion only for the last authorized administrative adult.
router.delete('/delete-account', requireParent, requireNotPedagogOnly, async (req, res) => {
  const client = await db.getClient();
  let capturedAvatarKeys = [];
  let deletionMode = null;
  let committed = false;
  let selfParentId = null;

  try {
    const parentRow = await client.query(
      'SELECT id, family_id FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentRow.rows.length === 0) {
      return res.status(404).json({ error: 'Konto hittades inte' });
    }

    const parentId = parentRow.rows[0].id;
    const familyId = parentRow.rows[0].family_id;

    await client.query('BEGIN');
    await familyDeletion.lockFamilyDeletionAuthority(client, familyId);
    const impact = await familyDeletion.deletionConsequenceForCaller(client, parentId, familyId);
    if (impact.mode === 'denied') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Åtkomst nekad. Kontot har inte behörighet att radera familjedata.' });
    }

    if (impact.mode === 'family') {
      capturedAvatarKeys = await familyDeletion.collectFamilyAvatarStorageKeys(client, familyId);
      await familyDeletion.hardDeleteFamilyData(client, familyId);
    } else {
      const parentKey = await familyDeletion.collectParentAvatarStorageKey(client, parentId);
      capturedAvatarKeys = parentKey ? [parentKey] : [];
      await familyDeletion.removeParentFromFamily(client, {
        parentId,
        familyId,
        revokedBy: parentId,
      });
      selfParentId = parentId;
    }

    await client.query('COMMIT');
    committed = true;
    deletionMode = impact.mode;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[FAMILY] delete-account error:', err);
    const status = err.code === 'FORBIDDEN' || err.code === 'LAST_ADMIN' ? 403 : 500;
    return res.status(status).json({
      error: status === 403
        ? (err.message || 'Åtkomst nekad')
        : 'Något gick fel vid radering. Försök igen.',
    });
  } finally {
    client.release();
  }

  if (committed) {
    await familyDeletion.cleanupAvatarStorageKeysAfterCommit(capturedAvatarKeys);
    if (deletionMode === 'self') {
      await familyDeletion.invalidateParentSessions(selfParentId, req.user.familyId);
    }
    clearSessionCookies(res);
    return res.json({
      success: true,
      mode: deletionMode,
    });
  }
});

module.exports = router;
