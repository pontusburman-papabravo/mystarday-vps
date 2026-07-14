'use strict';

const express = require('express');
const db = require('../../lib/db');
const { hashPassword, comparePassword } = require('../../lib/hash');
const { requireParent } = require('../../middleware/auth');
const { revokeAllRefreshTokens } = require('../../lib/refresh-tokens');
const { sendAccountDeletionRequestedEmail } = require('../../lib/email');

const router = express.Router();

// ─── POST /api/account/delete ───────────────────────────
router.post('/delete', requireParent, async (req, res) => {
  try {
    // Check if already pending deletion
    const existing = await db.query(
      `SELECT pending_deletion, deletion_requested_at FROM parent WHERE id = $1`,
      [req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    if (existing.rows[0].pending_deletion) {
      // Already pending — return success without re-triggering
      return res.json({
        message: 'Kontot är redan markerat för radering.',
        pending_deletion: true,
        deletion_requested_at: existing.rows[0].deletion_requested_at,
      });
    }

    // Set soft delete
    const now = new Date();
    await db.query(
      `UPDATE parent SET pending_deletion = true, deletion_requested_at = $1 WHERE id = $2`,
      [now, req.user.id]
    );

    // Get email for notification
    const parentResult = await db.query(
      `SELECT email, family_id FROM parent WHERE id = $1`,
      [req.user.id]
    );
    const { email } = parentResult.rows[0];
    const firstName = email.split('@')[0].split('.')[0];

    // Send confirmation email
    sendAccountDeletionRequestedEmail(email, firstName).catch(err => {
      console.warn('[ACCOUNT] Failed to send deletion email:', err.message);
    });

    res.json({
      message: 'Kontot har markerats för radering. Du har 30 dagar att ångra dig.',
      pending_deletion: true,
      deletion_requested_at: now.toISOString(),
      days_remaining: 30,
    });
  } catch (err) {
    console.error('[ACCOUNT] Delete account error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/cancel-deletion ─────────────────
router.post('/cancel-deletion', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pending_deletion FROM parent WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    if (!result.rows[0].pending_deletion) {
      return res.json({ message: 'Ingen radering att avbryta.' });
    }

    // Cancel the deletion
    await db.query(
      `UPDATE parent SET pending_deletion = false, deletion_requested_at = NULL WHERE id = $1`,
      [req.user.id]
    );

    res.json({ message: 'Raderingen har avbrutits. Ditt konto är nu aktivt igen.' });
  } catch (err) {
    console.error('[ACCOUNT] Cancel deletion error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/account/widget-order ────────────────────────
router.get('/widget-order', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT widget_order FROM parent WHERE id = $1',
      [req.user.id]
    );
    res.json({ widget_order: result.rows[0]?.widget_order || [] });
  } catch (err) {
    console.error('[ACCOUNT] Get widget-order error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/account/widget-order ───────────────────────
router.put('/widget-order', requireParent, async (req, res) => {
  try {
    const { widget_order } = req.body;
    if (!Array.isArray(widget_order)) {
      return res.status(400).json({ error: 'widget_order must be an array' });
    }

    await db.query(
      'UPDATE parent SET widget_order = $1 WHERE id = $2',
      [JSON.stringify(widget_order), req.user.id]
    );

    res.json({ message: 'Ordning sparad', widget_order });
  } catch (err) {
    console.error('[ACCOUNT] Save widget-order error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/share-notify ──────────────────────
// Fires when a parent shares the app with someone. Sends an
// email notification to info@mystarday.se with the sharer's details. // pragma: allowlist secret
router.post('/share-notify', requireParent, async (req, res) => {
  try {
    const parentResult = await db.query(
      'SELECT email, name FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const { email: parentEmail, name: parentName } = parentResult.rows[0];
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });
    const body = req.body || {};
    const recipient = typeof body.recipient === 'string' ? body.recipient.trim().slice(0, 200) : '';
    const channel = typeof body.channel === 'string' ? body.channel.trim().slice(0, 40) : '';
    const channelLabels = {
      native_share: 'Telefonens delningsmeny',
      copy: 'Kopierad länk',
      email: 'E-post',
      facebook: 'Facebook',
      whatsapp: 'WhatsApp',
    };
    const channelLabel = channelLabels[channel] || (channel || '—');
    const recipientLine = recipient || '— (ej angivet)';
    const plainBody =
      'Förälder: ' + (parentName || '—') + '\n' +
      'E-post: ' + parentEmail + '\n' +
      'Till vem: ' + recipientLine + '\n' +
      'Kanal: ' + channelLabel + '\n' +
      'Tidpunkt: ' + now;

    // Send notification email to [REDACTED] (fire-and-forget) // pragma: allowlist secret
    const { sendEmail } = require('../../lib/email');
    sendEmail({
      to: '[REDACTED]', // pragma: allowlist secret
      subject: `📤 Delning — ${parentName || parentEmail} tipsade${recipient ? ' ' + recipient : ''}`,
      body: plainBody,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">📤 Ny delning av appen</h2>
          <p><strong>Förälder:</strong> ${parentName || '—'}</p>
          <p><strong>E-post:</strong> ${parentEmail}</p>
          <p><strong>Till vem:</strong> ${recipientLine}</p>
          <p><strong>Kanal:</strong> ${channelLabel}</p>
          <p><strong>Tidpunkt:</strong> ${now}</p>
        </div>`,
    }).catch(err => {
      console.warn('[ACCOUNT] Failed to send share notification:', err.message);
    });

    res.json({ message: 'Tack för att du delade!' });
  } catch (err) {
    console.error('[ACCOUNT] Share notify error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

// ─── GET /api/account/referral ───────────────────────────
// Lazy-create personal referral code for share flows (register capture still flag-gated).
router.get('/referral', requireParent, async (req, res) => {
  try {
    const referralDb = require('../../../db/referral');
    const code = await referralDb.getOrCreateReferralCode(req.user.id);
    const baseUrl = (process.env.APP_URL || 'https://mystarday.se').replace(/\/$/, '');
    res.json({
      code,
      registerUrl: `${baseUrl}/register?ref=${encodeURIComponent(code)}`,
    });
  } catch (err) {
    console.error('[ACCOUNT] Referral code error:', err);
    res.status(500).json({ error: 'Kunde inte hämta värvningskod' });
  }
});

// ─── POST /api/account/delete-immediate ─────────────────
// GDPR: Immediate, permanent hard deletion with password confirmation.
// Deletes the entire family and all associated data in dependency order.
// No deletion is logged (GDPR requirement: data must be fully gone).
router.post('/delete-immediate', requireParent, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Lösenord krävs för att bekräfta radering' });
  }

  const client = await db.getClient();
  try {
    // 1. Verify password before doing anything destructive
    const parentRow = await client.query(
      'SELECT id, email, family_id, password_hash FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentRow.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Konto hittades inte' });
    }

    const { email, family_id, password_hash } = parentRow.rows[0];
    const valid = await comparePassword(password, password_hash);
    if (!valid) {
      client.release();
      return res.status(401).json({ error: 'Fel lösenord. Försök igen.' });
    }

    // 2. Delete all family data in dependency order (no ON DELETE CASCADE in schema)
    await client.query('BEGIN');

    // Ratings (references daily_log_item)
    await client.query(`
      DELETE FROM rating WHERE daily_log_item_id IN (
        SELECT dli.id FROM daily_log_item dli
        JOIN daily_log dl ON dli.daily_log_id = dl.id
        JOIN child c ON dl.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);

    // Daily log items (references daily_log, activity_template)
    await client.query(`
      DELETE FROM daily_log_item WHERE daily_log_id IN (
        SELECT dl.id FROM daily_log dl
        JOIN child c ON dl.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);

    // Daily logs (references child)
    await client.query(`
      DELETE FROM daily_log WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Reward redemptions (references reward, child, parent)
    await client.query(`
      DELETE FROM reward_redemption WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);
    await client.query(`
      DELETE FROM reward_redemption WHERE reward_id IN (
        SELECT id FROM reward WHERE family_id = $1
      )`, [family_id]);

    // Weekly schedule items (references weekly_schedule, activity_template)
    await client.query(`
      DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
        SELECT ws.id FROM weekly_schedule ws
        JOIN child c ON ws.child_id = c.id
        WHERE c.family_id = $1
      )`, [family_id]);

    // Weekly schedules (references child)
    await client.query(`
      DELETE FROM weekly_schedule WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Streaks (references child)
    await client.query(`
      DELETE FROM streak WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Parent notes (references child, parent)
    await client.query(`
      DELETE FROM parent_note WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Notification preferences (references parent)
    await client.query(`
      DELETE FROM notification_preference WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);

    // Parent-child relationships
    await client.query(`
      DELETE FROM parent_child WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);
    await client.query(`
      DELETE FROM parent_child WHERE child_id IN (
        SELECT id FROM child WHERE family_id = $1
      )`, [family_id]);

    // Rewards (references family)
    await client.query(`DELETE FROM reward WHERE family_id = $1`, [family_id]);

    // Activity templates (references family)
    await client.query(`DELETE FROM activity_template WHERE family_id = $1`, [family_id]);

    // Categories (references family)
    await client.query(`DELETE FROM category WHERE family_id = $1`, [family_id]);

    // Family invites (references family)
    await client.query(`DELETE FROM family_invite WHERE family_id = $1`, [family_id]);

    // Email verification tokens (no FK, delete by parent_id)
    await client.query(`
      DELETE FROM email_verification WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);

    // Password reset tokens (no FK, delete by parent_id)
    await client.query(`
      DELETE FROM password_reset WHERE parent_id IN (
        SELECT id FROM parent WHERE family_id = $1
      )`, [family_id]);

    // Children (references family)
    await client.query(`DELETE FROM child WHERE family_id = $1`, [family_id]);

    // Parents (references family)
    await client.query(`DELETE FROM parent WHERE family_id = $1`, [family_id]);

    // Family (root)
    await client.query(`DELETE FROM family WHERE id = $1`, [family_id]);

    await client.query('COMMIT');

    // 3. Clear auth cookie so the client is immediately logged out
    res.clearCookie('token');
    res.json({ message: 'Kontot och all tillhörande data har raderats permanent.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[ACCOUNT] Immediate delete error:', err);
    res.status(500).json({ error: 'Något gick fel vid radering. Försök igen.' });
  } finally {
    client.release();
  }
});

module.exports = router;
