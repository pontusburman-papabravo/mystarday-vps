'use strict';

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { recordActivationMilestone } = require('../lib/activation-p0');
const activationDb = require('../../db/family-activation-state');

const router = express.Router();

const SOURCES = new Set([
  'first_schedule_handoff',
  'home_handoff',
  'child_login',
  'trusted_device',
]);

const PLATFORMS = new Set(['web', 'pwa', 'ios', 'android']);

function pickSource(raw) {
  const source = typeof raw === 'string' ? raw : '';
  return SOURCES.has(source) ? source : 'child_login';
}

function pickPlatform(raw) {
  const platform = typeof raw === 'string' ? raw : '';
  return PLATFORMS.has(platform) ? platform : 'web';
}

/**
 * POST /api/me/child-access-completed
 * Records child_access only after the authenticated child Today view is established.
 * PIN login and navigation start must not call this.
 */
router.post('/child-access-completed', requireChild, async (req, res) => {
  try {
    if (!req.body || req.body.today_established !== true) {
      return res.status(400).json({
        error: 'today_not_established',
        code: 'TODAY_NOT_ESTABLISHED',
      });
    }

    const familyId = req.user.familyId;
    const childId = req.user.id;
    const before = await activationDb.getByFamilyId(familyId);
    const schemaSavedAt = before && before.schema_saved_at ? new Date(before.schema_saved_at) : null;
    const secondsSinceSchedule = schemaSavedAt && !Number.isNaN(schemaSavedAt.getTime())
      ? Math.max(0, Math.round((Date.now() - schemaSavedAt.getTime()) / 1000))
      : null;

    const source = pickSource(req.body.source);
    const platform = pickPlatform(req.body.platform);
    const result = await recordActivationMilestone(familyId, 'child_access', {
      metadata: {
        child_id: childId,
        source,
        platform,
        has_schedule: Boolean(schemaSavedAt),
        seconds_since_first_schedule_saved: secondsSinceSchedule,
      },
    });

    return res.json({
      ok: true,
      newlyRecorded: result.newlyRecorded,
      meta_milestones: result.newlyRecorded
        ? { child_access_completed: true, flow: 'child_today' }
        : {},
    });
  } catch (err) {
    console.error('[CHILD-ACCESS] today established failed:', err.message);
    return res.status(500).json({ error: 'child_access_failed', code: 'CHILD_ACCESS_FAILED' });
  }
});

module.exports = router;
