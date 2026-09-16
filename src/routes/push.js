/**
 * Push subscription routes — Web Push API + native (iOS/Android) token registration.
 * Owns: subscribing/unsubscribing parent devices, serving VAPID public key,
 *       reading/writing parent push preferences.
 * Does NOT own: sending notifications (see src/lib/push-notifications.js).
 *
 * GET  /api/push/vapid-public-key  — serve VAPID public key to frontend
 * POST /api/push/subscribe         — save or update a web push subscription
 * POST /api/push/unsubscribe       — remove a web push subscription
 * POST /api/push/register-native   — register an iOS/Android push token
 * POST /api/push/unregister-native — remove a native push token
 * GET  /api/push/preferences       — get push_preferences + admin_push_enabled
 * PUT  /api/push/preferences       — update push_preferences (and admin_push_enabled if admin)
 */
const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { vapidPublicKey } = require('../lib/push-notifications');
const { validate } = require('../middleware/validate');
const { PushSubscribeSchema, PushPreferencesSchema } = require('../lib/schemas');
const pushSubscriptions = require('../../db/push-subscriptions');
const { sendApiError } = require('../lib/api-user-error');

const router = express.Router();

// ─── GET /api/push/vapid-public-key ──────────────────────
// No auth required — key is public by design.
router.get('/vapid-public-key', (req, res) => {
  if (!vapidPublicKey) {
    return sendApiError(res, 503, 'PUSH_NOT_CONFIGURED');
  }
  res.json({ publicKey: vapidPublicKey });
});

// ─── POST /api/push/subscribe ─────────────────────────────
router.post('/subscribe', requireParent, requireFeature('push_notiser'), validate(PushSubscribeSchema), async (req, res) => {
  try {
    const { subscription } = req.body;

    if (
      !subscription ||
      typeof subscription !== 'object' ||
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return sendApiError(res, 400, 'PUSH_INVALID_SUBSCRIPTION');
    }

    const parentId = req.user.id;

    // Upsert: insert or update on endpoint conflict.
    // endpoint is UNIQUE — same browser/device always sends same endpoint.
    await db.query(
      `INSERT INTO push_subscriptions (parent_id, endpoint, subscription_json, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (endpoint) DO UPDATE
         SET parent_id = EXCLUDED.parent_id,
             subscription_json = EXCLUDED.subscription_json,
             updated_at = NOW()`,
      [parentId, subscription.endpoint, JSON.stringify(subscription)]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[PUSH] Subscribe error:', err);
    sendApiError(res, 500, 'PUSH_SAVE_FAILED');
  }
});

// ─── POST /api/push/register-native ────────────────────────
router.post('/unsubscribe', requireParent, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      return sendApiError(res, 400, 'PUSH_ENDPOINT_REQUIRED');
    }

    const parentId = req.user.id;

    // Only delete the subscription if it belongs to this parent.
    await db.query(
      'DELETE FROM push_subscriptions WHERE parent_id = $1 AND endpoint = $2',
      [parentId, endpoint]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[PUSH] Unsubscribe error:', err);
    sendApiError(res, 500, 'PUSH_UNSUBSCRIBE_FAILED');
  }
});

// ─── POST /api/push/register-native ────────────────────────
// Register an APNs (iOS) or FCM (Android) device token for the authenticated parent.
router.post('/register-native', requireParent, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token || typeof token !== 'string' || token.length < 10) {
      return sendApiError(res, 400, 'PUSH_INVALID_TOKEN');
    }
    if (!['ios', 'android'].includes(platform)) {
      return sendApiError(res, 400, 'PUSH_INVALID_PLATFORM');
    }

    await pushSubscriptions.upsertNativeSubscription(req.user.id, token, platform);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[PUSH] register-native error:', err);
    sendApiError(res, 500, 'PUSH_TOKEN_SAVE_FAILED');
  }
});

// ─── POST /api/push/unregister-native ─────────────────────
router.post('/unregister-native', requireParent, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token || !['ios', 'android'].includes(platform)) {
      return sendApiError(res, 400, 'PUSH_TOKEN_REQUIRED');
    }

    await pushSubscriptions.deleteNativeSubscription(req.user.id, token, platform);
    res.json({ success: true });
  } catch (err) {
    console.error('[PUSH] unregister-native error:', err);
    sendApiError(res, 500, 'PUSH_TOKEN_DELETE_FAILED');
  }
});

// ─── GET /api/push/preferences ───────────────────────────
router.get('/preferences', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT push_preferences, admin_push_enabled FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return sendApiError(res, 404, 'PUSH_PARENT_NOT_FOUND');
    res.json({
      push_preferences: result.rows[0].push_preferences || {},
      admin_push_enabled: result.rows[0].admin_push_enabled || false,
    });
  } catch (err) {
    console.error('[PUSH] Get preferences error:', err);
    sendApiError(res, 500, 'PUSH_PREFS_LOAD_FAILED');
  }
});

// ─── PUT /api/push/preferences ────────────────────────────
router.put('/preferences', requireParent, validate(PushPreferencesSchema), async (req, res) => {
  try {
    const { enabled, per_child, admin_alerts,
            schedule_reminder, inactivity_nudge, star_milestone, backfill_reminder,
            reminder_lead_minutes, quiet_start, quiet_end } = req.body;

    const existingResult = await db.query(
      'SELECT push_preferences, admin_push_enabled FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (!existingResult.rows[0]) return sendApiError(res, 404, 'PUSH_PARENT_NOT_FOUND');

    const existing = existingResult.rows[0].push_preferences || {};
    const prefs = { ...existing };

    if (typeof enabled === 'boolean') prefs.enabled = enabled;
    if (per_child && typeof per_child === 'object') prefs.per_child = per_child;

    // Notification type toggles
    if (typeof schedule_reminder === 'boolean') prefs.schedule_reminder = schedule_reminder;
    if (typeof inactivity_nudge === 'boolean') prefs.inactivity_nudge = inactivity_nudge;
    if (typeof star_milestone === 'boolean') prefs.star_milestone = star_milestone;
    if (typeof backfill_reminder === 'boolean') prefs.backfill_reminder = backfill_reminder;

    // Scheduling
    if (typeof reminder_lead_minutes === 'number') prefs.reminder_lead_minutes = reminder_lead_minutes;
    if (typeof quiet_start === 'number') prefs.quiet_start = quiet_start;
    if (typeof quiet_end === 'number') prefs.quiet_end = quiet_end;

    if (typeof admin_alerts === 'boolean' && req.user.isAdmin) {
      await db.query(
        'UPDATE parent SET push_preferences = $1, admin_push_enabled = $2 WHERE id = $3',
        [JSON.stringify(prefs), admin_alerts, req.user.id]
      );
    } else {
      await db.query(
        'UPDATE parent SET push_preferences = $1 WHERE id = $2',
        [JSON.stringify(prefs), req.user.id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[PUSH] Update preferences error:', err);
    sendApiError(res, 500, 'PUSH_PREFS_SAVE_FAILED');
  }
});

module.exports = router;
