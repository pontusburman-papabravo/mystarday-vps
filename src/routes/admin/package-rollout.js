/**
 * Admin: package rollout mode (§9.10.2).
 */

const express = require('express');
const { z } = require('zod');
const appConfig = require('../../../db/app-config');
const db = require('../../lib/db');
const { validate } = require('../../middleware/validate');
const { VALID_ROLLOUT_MODES, getRolloutFlags, normalizeRolloutMode } = require('../../lib/package-access');

const router = express.Router();

const RolloutBodySchema = z.object({
  mode: z.enum(VALID_ROLLOUT_MODES),
});

router.get('/rollout', async (req, res, next) => {
  try {
    const entry = await appConfig.getEntry('PACKAGES_ROLLOUT_MODE');
    const mode = normalizeRolloutMode(entry?.value);
    res.json({
      rollout_mode: mode,
      ...getRolloutFlags(mode),
      preview_enabled: mode !== 'off',
      interest_cta_enabled: mode === 'interest',
      updated_at: entry?.updated_at ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/rollout', validate(RolloutBodySchema), async (req, res, next) => {
  try {
    const { mode } = req.body;
    const previous = await appConfig.get('PACKAGES_ROLLOUT_MODE');

    const row = await appConfig.set('PACKAGES_ROLLOUT_MODE', mode, {
      description: 'Paket rollout: off | interest | purchase (§9.8)',
      updatedBy: req.user.id,
    });

    if (mode === 'purchase') {
      await appConfig.set('PACKAGES_SHOW_PRICES', 'true', {
        description: 'Visa priser i UI (endast purchase)',
        updatedBy: req.user.id,
      });
    } else {
      await appConfig.set('PACKAGES_SHOW_PRICES', 'false', {
        description: 'Visa priser i UI',
        updatedBy: req.user.id,
      });
    }

    await db.query(
      `INSERT INTO admin_audit_log (admin_id, action, metadata)
       VALUES ($1, 'rollout_mode_changed', $2)`,
      [
        req.user.id,
        JSON.stringify({ from: normalizeRolloutMode(previous) || 'off', to: mode }),
      ]
    ).catch((auditErr) => {
      console.error('[ADMIN] rollout audit log failed:', auditErr.message);
    });

    res.json({
      rollout_mode: mode,
      ...getRolloutFlags(mode),
      updated_at: row?.updated_at ?? null,
      message: `Rollout-läge uppdaterat till ${mode}`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
