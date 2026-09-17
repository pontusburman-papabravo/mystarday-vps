const { sendApiError } = require('../lib/api-user-error');
/**
 * Reminder settings routes
 *
 * GET  /api/reminders        — fetch current family reminder settings
 * PUT  /api/reminders        — create or update reminder settings
 *
 * Note: This stores reminder preferences only. Actual push delivery is
 * not yet implemented (service worker push requires extra setup + iOS
 * limitations). The widget on the dashboard helps parents set a time and
 * manually check — full push will be added in a future update.
 */
const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');

const router = express.Router();
router.use(requireParent);

const VALID_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]); // 0=sun, 6=sat

// ─── GET /api/reminders ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT enabled, time, days FROM reminder_settings WHERE family_id = $1',
      [req.user.familyId]
    );
    if (result.rows.length === 0) {
      // Return sensible defaults — row doesn't exist yet
      return res.json({ enabled: false, time: '07:30', days: [1, 2, 3, 4, 5] });
    }
    const row = result.rows[0];
    res.json({ enabled: row.enabled, time: row.time, days: row.days });
  } catch (err) {
    console.error('[REMINDERS] GET error:', err);
    sendApiError(res, 500, 'REMINDER_FETCH_FAILED');
  }
});

// ─── PUT /api/reminders ───────────────────────────────────
router.put('/', async (req, res) => {
  try {
    let { enabled, time, days } = req.body;

    // Validate time format HH:MM
    if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
      return sendApiError(res, 400, 'INVALID_TIME_HHMM');
    }
    const [hh, mm] = time.split(':').map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return res.status(400).json({ error: 'Ogiltig tid.' });
    }

    // Validate days array
    if (!Array.isArray(days) || days.length === 0 || !days.every(d => VALID_DAYS.has(Number(d)))) {
      return sendApiError(res, 400, 'DAYS_REQUIRED');
    }
    days = [...new Set(days.map(Number))].sort();

    enabled = Boolean(enabled);

    await db.query(
      `INSERT INTO reminder_settings (family_id, enabled, time, days, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (family_id) DO UPDATE
         SET enabled = EXCLUDED.enabled,
             time    = EXCLUDED.time,
             days    = EXCLUDED.days,
             updated_at = NOW()`,
      [req.user.familyId, enabled, time, days]
    );

    res.json({ success: true, enabled, time, days });
  } catch (err) {
    console.error('[REMINDERS] PUT error:', err);
    sendApiError(res, 500, 'REMINDER_SAVE_FAILED');
  }
});

module.exports = router;
