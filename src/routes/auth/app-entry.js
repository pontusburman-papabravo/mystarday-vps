'use strict';

const express = require('express');
const { optionalAuth } = require('../../middleware/auth');
const { buildAppEntryInput } = require('../../lib/build-app-entry-input');
const { resolveAppEntry } = require('../../lib/app-entry-resolve');
const { toPublicEntryDecision } = require('../../lib/app-entry-decision-public');
const { isFamilyDeviceEntryEnabled } = require('../../lib/family-device-entry-flags');
const { isFamilyDeviceDailyUxEnabled } = require('../../lib/family-device-daily-ux-flags');

const router = express.Router();

router.get('/app-entry', optionalAuth, async (req, res, next) => {
  try {
    const input = await buildAppEntryInput(req, res, {
      intentChildId: req.query?.intent_child_id || req.query?.child_id,
    });
    const familyId = input.familyId;
    const orchestratorActive = await isFamilyDeviceEntryEnabled(familyId);
    const dailyUxActive = orchestratorActive && (await isFamilyDeviceDailyUxEnabled(familyId));

    const resolved = resolveAppEntry(input);
    const decision = toPublicEntryDecision(resolved, { dailyUxActive });

    return res.json({
      orchestratorActive,
      dailyUxActive,
      decision,
      allowedChildren: orchestratorActive
        ? input.allowedChildren.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }))
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
