'use strict';

/**
 * POST /api/family/activation/defer — durable server-side defer for current activation step (#1023 PR A).
 */

const express = require('express');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { buildCanonicalNextAction } = require('../../lib/activation/canonical-next-action');
const { isActivationFlagEnabled, FLAG_KEYS } = require('../../lib/activation-flags');
const { isDeferrableActivationAction } = require('../../lib/activation/defer-constants');
const { deferActivationStep } = require('../../lib/activation/step-deferrals');

const router = express.Router();

router.post('/activation/defer', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const parentId = req.user.id;
    if (!familyId || !parentId) {
      return res.status(401).json({ error: 'Ej inloggad' });
    }

    const flagOn = await isActivationFlagEnabled(FLAG_KEYS.firstSuccessV1, familyId);
    if (!flagOn) {
      return res.status(404).json({ error: 'Ej tillgängligt' });
    }

    const nextAction = String(req.body?.next_action || '').trim();
    if (!nextAction) {
      return res.status(400).json({ error: 'Ogiltig åtgärd', code: 'INVALID_ACTIVATION_ACTION' });
    }
    if (!isDeferrableActivationAction(nextAction)) {
      return res.status(400).json({ error: 'Ogiltig åtgärd', code: 'INVALID_ACTIVATION_ACTION' });
    }

    const current = await buildCanonicalNextAction(familyId, {
      includeEngineAdapter: true,
      skipDeferral: true,
    });

    if (!current.next_action || current.next_action === 'none') {
      return res.status(409).json({
        error: 'Inget aktiveringssteg att skjuta upp',
        code: 'ACTIVATION_NO_STEP',
      });
    }

    if (current.next_action !== nextAction) {
      return res.status(409).json({
        error: 'activation_step_changed',
        code: 'ACTIVATION_STEP_CHANGED',
        current_next_action: current.next_action,
      });
    }

    const result = await deferActivationStep(familyId, nextAction);
    return res.json({
      ok: true,
      next_action: nextAction,
      deferred_until: result.until,
    });
  } catch (err) {
    if (err.code === 'INVALID_ACTIVATION_ACTION') {
      return res.status(400).json({ error: 'Ogiltig åtgärd', code: 'INVALID_ACTIVATION_ACTION' });
    }
    console.error('[FAMILY] POST /activation/defer error:', err);
    return res.status(500).json({ error: 'Kunde inte spara valet' });
  }
});

module.exports = router;
