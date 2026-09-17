'use strict';

const { sendApiError } = require('../lib/api-user-error');

/**
 * Transition support — child-scoped config (Extra stöd / teacch).
 * GET /api/me/transition-support
 */

const express = require('express');
const db = require('../lib/db');
const { requireChild } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const { normalizeLeadMinutes } = require('../lib/transition-support');

const router = express.Router();
router.use(requireChild);
router.use(requireFeature('transition_support'));

/**
 * GET /api/me/transition-support
 * Returns lead-time configuration for the logged-in child.
 */
router.get('/', async (req, res) => {
  try {
    const childId = req.user.id;
    const result = await db.query(
      'SELECT transition_lead_minutes FROM child WHERE id = $1',
      [childId]
    );
    if (result.rows.length === 0) {
      return sendApiError(res, 404, 'CHILD_NOT_FOUND');
    }
    const leadMinutes = normalizeLeadMinutes(result.rows[0].transition_lead_minutes);
    res.json({ lead_minutes: leadMinutes });
  } catch (err) {
    console.error('[TRANSITION-SUPPORT] GET error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;
