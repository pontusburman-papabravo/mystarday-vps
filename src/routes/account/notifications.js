'use strict';

const { sendApiError } = require('../../lib/api-user-error');
const { t } = require('../../lib/i18n');
const { DEFAULT_LOCALE, parseAcceptLanguage } = require('../../lib/locale');

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { UpdateNotificationPrefsSchema, ReorderSchema } = require('../../lib/schemas');
const { optOutByToken } = require('../../lib/notification-email-opt-out');
const { renderUnsubscribePage, renderUnsubscribeErrorPage } = require('../../lib/newsletter-unsubscribe-pages');
const config = require('../../lib/config');

const router = express.Router();

const OPT_OUT_LABELS = {
  weekly_summary: {
    title: 'Veckosammanfattning avstängd',
    heading: 'Du får inte längre veckosammanfattning',
    messageKey: 'settings.unsubscribe.weekly',
    alreadyHeading: 'Du är redan avstängd',
    alreadyMessage: 'Veckosammanfattning är redan avstängd för din e-post.',
  },
  reward_redemption: {
    title: 'Belöningsaviseringar avstängda',
    heading: 'Du får inte längre belöningsmejl',
    messageKey: 'settings.unsubscribe.reward',
    alreadyHeading: 'Du är redan avstängd',
    alreadyMessage: 'Belöningsaviseringar är redan avstängda för din e-post.',
  },
  all_email: {
    title: 'E-postaviseringar avstängda',
    heading: `Du får inte längre mejl från ${config.email.fromName}`,
    messageKey: 'settings.unsubscribe.all',
    alreadyHeading: 'Du är redan avstängd',
    alreadyMessage: 'E-postaviseringar är redan avstängda.',
  },
};

async function handleOptOut(req, res) {
  const token = req.query.token || req.body?.token;
  const channel = req.query.channel || req.body?.channel || 'weekly_summary';
  const labels = OPT_OUT_LABELS[channel] || OPT_OUT_LABELS.weekly_summary;

  if (!token || typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token)) {
    return res.status(400).send(renderUnsubscribeErrorPage(
      t(DEFAULT_LOCALE, 'settings.unsubscribe.invalidTitle'),
      t(DEFAULT_LOCALE, 'settings.unsubscribe.invalidBody')
    ));
  }

  try {
    const result = await optOutByToken(token, channel);

    if (!result.ok && result.reason === 'unknown_token') {
      return res.status(400).send(renderUnsubscribeErrorPage(
        t(DEFAULT_LOCALE, 'settings.unsubscribe.invalidTitle'),
        t(DEFAULT_LOCALE, 'settings.unsubscribe.invalidBody')
      ));
    }

    const lang = parseAcceptLanguage(req.headers['accept-language']) || DEFAULT_LOCALE;
    if (result.alreadyOptedOut) {
      return res.send(renderUnsubscribePage({
        title: labels.title,
        heading: labels.alreadyHeading,
        message: labels.alreadyMessage,
      }));
    }

    if (!result.ok) {
      return res.status(400).send(renderUnsubscribeErrorPage(
        t(lang, 'settings.unsubscribe.invalidTitle'),
        t(lang, 'settings.unsubscribe.invalidBody')
      ));
    }

    res.send(renderUnsubscribePage({
      title: labels.title,
      heading: labels.heading,
      message: t(lang, labels.messageKey),
    }));
  } catch (err) {
    console.error('[ACCOUNT] Notification opt-out error:', err);
    res.status(500).send(renderUnsubscribeErrorPage(
      t(DEFAULT_LOCALE, 'settings.unsubscribe.errorTitle'),
      t(DEFAULT_LOCALE, 'settings.unsubscribe.errorBody')
    ));
  }
}

// ─── GET/POST /api/account/notifications/opt-out ──────────
// One-click opt-out via token — no login required (RFC 8058).
router.get('/notifications/opt-out', handleOptOut);
router.post('/notifications/opt-out', handleOptOut);

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
        return sendApiError(res, 400, 'NO_SETTINGS_TO_UPDATE');
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
      code: 'SETTINGS_UPDATED',
      notifications: prefs.rows[0],
    });
  } catch (err) {
    console.error('[ACCOUNT] Notifications error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
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
      return sendApiError(res, 404, 'USER_NOT_FOUND');
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
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;
