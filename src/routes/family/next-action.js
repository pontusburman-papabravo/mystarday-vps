'use strict';

/**
 * GET /api/family/next-action — canonical Hem coach contract (Prompt 1A).
 */

const express = require('express');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { buildCanonicalNextAction } = require('../../lib/activation/canonical-next-action');
const { isActivationFlagEnabled, FLAG_KEYS } = require('../../lib/activation-flags');

const router = express.Router();

router.get('/next-action', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(401).json({ error: 'Ej inloggad' });
    }

    const flagOn = await isActivationFlagEnabled(FLAG_KEYS.firstSuccessV1, familyId);
    if (!flagOn) {
      return res.json({
        enabled: false,
        show_primary_coach: false,
        next_action: null,
        reason: ['flag_off'],
        journey_phase: null,
        blocking_issue: null,
        cta_label: null,
        cta_target: null,
      });
    }

    const payload = await buildCanonicalNextAction(familyId, {
      includeEngineAdapter: true,
      parentId: req.user.id,
    });
    res.json(payload);
  } catch (err) {
    console.error('[FAMILY] GET /next-action error:', err);
    res.status(500).json({ error: 'Kunde inte hämta nästa steg' });
  }
});

module.exports = router;
