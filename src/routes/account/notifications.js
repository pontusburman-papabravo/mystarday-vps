'use strict';

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { UpdateNotificationPrefsSchema, ReorderSchema } = require('../../lib/schemas');

const router = express.Router();

// ─── PUT /api/account/notifications ─────────────────────
router.put('/notifications', requireParent, validate(UpdateNotificationPrefsSchema), async (req, res) => {
  try {
    const { weekly_summary, reward_redemption, email_enabled } = req.body;

    // Upsert notification preferences
    const existing = await db.query(
      'SELECT id FROM notification_preference WHERE parent_id = $1',
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      const updates = [];
      const values = [];
      let idx = 1;

      if (typeof weekly_summary === 'boolean') {
        updates.push(`weekly_summary = $${idx++}`);
        values.push(weekly_summary);
      }
      if (typeof reward_redemption === 'boolean') {
        updates.push(`reward_redemption = $${idx++}`);
        values.push(reward_redemption);
      }
      if (typeof email_enabled === 'boolean') {
        updates.push(`email_enabled = $${idx++}`);
        values.push(email_enabled);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Inga inställningar att uppdatera' });
      }

      values.push(req.user.id);
      await db.query(
        `UPDATE notification_preference SET ${updates.join(', ')} WHERE parent_id = $${idx}`,
        values
      );
    } else {
      await db.query(
        `INSERT INTO notification_preference (parent_id, weekly_summary, reward_redemption, email_enabled)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          weekly_summary !== false,
          reward_redemption !== false,
          email_enabled !== false,
        ]
      );
    }

    // Return current preferences
    const prefs = await db.query(
      'SELECT weekly_summary, reward_redemption, email_enabled FROM notification_preference WHERE parent_id = $1',
      [req.user.id]
    );

    res.json({
      message: 'Inställningar uppdaterade!',
      notifications: prefs.rows[0],
    });
  } catch (err) {
    console.error('[ACCOUNT] Notifications error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/account/notifications ─────────────────────
router.get('/notifications', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT weekly_summary, reward_redemption, email_enabled FROM notification_preference WHERE parent_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        weekly_summary: true,
        reward_redemption: true,
        email_enabled: true,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ACCOUNT] Get notifications error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/account/status ─────────────────────────────
router.get('/status', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pending_deletion, deletion_requested_at
       FROM parent WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const row = result.rows[0];
    let daysRemaining = null;
    if (row.pending_deletion && row.deletion_requested_at) {
      const due = new Date(row.deletion_requested_at);
      due.setDate(due.getDate() + 30);
      const now = new Date();
      const remaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, remaining);
    }

    res.json({
      pending_deletion: row.pending_deletion,
      deletion_requested_at: row.deletion_requested_at,
      days_remaining: daysRemaining,
    });
  } catch (err) {
    console.error('[ACCOUNT] Get status error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
