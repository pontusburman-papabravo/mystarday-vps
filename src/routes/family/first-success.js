'use strict';

/**
 * GET /api/family/first-success
 * Thin adapter: facts → Engine.evaluate → serialize → JSON.
 * No business logic. No copy. No transformations beyond JSON dates.
 */

const express = require('express');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { collectFamilyFacts } = require('../../core-engine/1-facts/collector');
const { ProductEngine } = require('../../core-engine');
const { serializeEngineOutput } = require('../../core-engine/serialize');
const { isEngineApiEnabled } = require('../../lib/first-success-engine-flag');
const { queueEngineTrace } = require('../../lib/engine-trace-queue');

const router = express.Router();

const DEFAULT_POLICY_SET = 'v2_first_success_control';

router.get('/first-success', requireNotPedagogOnly, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    if (!familyId) {
      return res.status(401).json({ error: 'Ej inloggad' });
    }

    if (!(await isEngineApiEnabled(familyId))) {
      return res.status(503).json({
        error: 'engine_disabled',
        legacyEndpoint: '/api/family/readiness',
      });
    }

    const facts = await collectFamilyFacts(familyId);
    const output = ProductEngine.evaluate(facts, {
      activePolicySet: DEFAULT_POLICY_SET,
      currentDeviceTime: new Date(),
    });

    queueEngineTrace(familyId, output);

    res.json(serializeEngineOutput(output));
  } catch (err) {
    console.error('[FIRST_SUCCESS] GET /first-success error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
