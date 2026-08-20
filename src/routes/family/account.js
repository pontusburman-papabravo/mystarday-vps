'use strict';

/**
 * Family account-deletion route.
 * Mounted at /api/family AFTER router.use(requireParent) in index.js.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { deleteAvatarsForFamily } = require('../../lib/avatar-service');

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

    // Delete in dependency order (no ON DELETE CASCADE in schema).
    await client.query(`
      DELETE FROM rating WHERE daily_log_item_id IN (
        SELECT dli.id FROM daily_log_item dli
        JOIN daily_log dl ON dli.daily_log_id = dl.id
        JOIN child c ON dl.child_id = c.id WHERE c.family_id = $1
      )`, [family_id]);
    await client.query(`
      DELETE FROM daily_log_item WHERE daily_log_id IN (
        SELECT dl.id FROM daily_log dl JOIN child c ON dl.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);
    await client.query(`DELETE FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM reward_redemption WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM reward_redemption WHERE reward_id IN (SELECT id FROM reward WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
      SELECT ws.id FROM weekly_schedule ws JOIN child c ON ws.child_id = c.id WHERE c.family_id = $1
    )`, [family_id]);
    await client.query(`DELETE FROM weekly_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM special_day_schedule_item WHERE special_day_schedule_id IN (
      SELECT sds.id FROM special_day_schedule sds JOIN child c ON sds.child_id = c.id WHERE c.family_id = $1
    )`, [family_id]);
    await client.query(`DELETE FROM special_day_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM streak WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM parent_note WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM pedagog_notes WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM child_observation WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM general_observations WHERE family_id = $1`, [family_id]);

    await client.query(`DELETE FROM reward WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM activity_template WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM category WHERE family_id = $1`, [family_id]);

    await client.query(`DELETE FROM pin_lockout WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM pin_notification_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM pin_audit_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);

    await client.query(`DELETE FROM family_invite WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM pedagog_invite WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM professional_share_link WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM system_messages WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM win_back_email_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM push_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM notification_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM email_verification WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM password_reset WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(
      `DELETE FROM waitlist w
       WHERE EXISTS (
         SELECT 1 FROM parent p
         WHERE p.family_id = $1
           AND LOWER(TRIM(p.email)) = LOWER(TRIM(w.email))
       )`,
      [family_id]
    );
    await client.query(`DELETE FROM notification_preference WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM parent_child WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [family_id]);
    await client.query(`DELETE FROM email_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [family_id]);

    // Family-scoped analytics (GDPR: no identifiable family bucket after deletion)
    await client.query(`DELETE FROM analytics_events WHERE family_id = $1`, [family_id]);

    await deleteAvatarsForFamily(family_id);

    await client.query(`DELETE FROM child WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM parent WHERE family_id = $1`, [family_id]);
    await client.query(`DELETE FROM family WHERE id = $1`, [family_id]);

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
