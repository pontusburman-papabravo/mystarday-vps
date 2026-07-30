'use strict';

/**
 * Family account-deletion route.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { deleteFamilyAccountData } = require('../../lib/family-account-deletion');

const router = express.Router();

// ─── DELETE /api/family/delete-account ─────────────────────
// Apple App Store Guideline 5.1.1: Account deletion must be accessible from settings.
// Requires parent auth (requireParent blocks child PIN sessions) + global CSRF.
// Permanently deletes the entire family and all associated data.
router.delete('/delete-account', requireParent, async (req, res) => {
  const client = await db.getClient();
  try {
    const parentRow = await client.query(
      'SELECT id, family_id FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentRow.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Konto hittades inte' });
    }
    const family_id = parentRow.rows[0].family_id;

    await client.query('BEGIN');
    await deleteFamilyAccountData(client, family_id);
    await client.query('COMMIT');

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('token');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[FAMILY] delete-account error:', err);
    res.status(500).json({ error: 'Något gick fel vid radering. Försök igen.' });
  } finally {
    client.release();
  }
});

module.exports = router;
