/**
 * Consent API routes
 * GET  /api/consent        — fetch current parent's consent choices
 * POST /api/consent        — save/update consent choices
 */
const express = require('express');
const { requireParent } = require('../middleware/auth');
const { sendApiError } = require('../lib/api-user-error');
const db = require('../lib/db');

const router = express.Router();

const VALID_VALUES = ['granted', 'denied', 'pending'];
const CONSENT_FIELDS = ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization', 'email_communication'];

// GET /api/consent — returns existing consent or null if none saved
router.get('/', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT analytics_storage, ad_storage, ad_user_data, ad_personalization, email_communication, updated_at
       FROM user_consent WHERE parent_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ consent: null });
    }
    return res.json({ consent: result.rows[0] });
  } catch (err) {
    console.error('[CONSENT] GET error:', err);
    return res.status(500).json({ error: 'GENERIC_SERVER_ERROR' });
  }
});

// POST /api/consent — upsert consent record
router.post('/', requireParent, async (req, res) => {
  try {
    const { analytics_storage, ad_storage, ad_user_data, ad_personalization, email_communication } = req.body;

    // Validate — all fields must be present and valid
    const incoming = { analytics_storage, ad_storage, ad_user_data, ad_personalization, email_communication };
    for (const field of CONSENT_FIELDS) {
      const val = incoming[field];
      if (!VALID_VALUES.includes(val)) {
        return sendApiError(res, 400, 'VALIDATION_INVALID_VALUES', { details: { field, value: val } });
      }
    }

    const result = await db.query(
      `INSERT INTO user_consent
         (parent_id, analytics_storage, ad_storage, ad_user_data, ad_personalization, email_communication, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (parent_id) DO UPDATE SET
         analytics_storage   = EXCLUDED.analytics_storage,
         ad_storage          = EXCLUDED.ad_storage,
         ad_user_data        = EXCLUDED.ad_user_data,
         ad_personalization  = EXCLUDED.ad_personalization,
         email_communication = EXCLUDED.email_communication,
         updated_at          = NOW()
       RETURNING analytics_storage, ad_storage, ad_user_data, ad_personalization, email_communication, updated_at`,
      [req.user.id, analytics_storage, ad_storage, ad_user_data, ad_personalization, email_communication]
    );

    return res.json({ consent: result.rows[0] });
  } catch (err) {
    console.error('[CONSENT] POST error:', err);
    return res.status(500).json({ error: 'GENERIC_SERVER_ERROR' });
  }
});

module.exports = router;
