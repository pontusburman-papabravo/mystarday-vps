'use strict';

const express = require('express');
const {
  getRolloutStatus,
  enableWaveUpTo,
  advanceOneWave,
  runHealthChecks,
} = require('../../lib/journey/rollout');

const router = express.Router();

router.get('/journey-rollout/status', async (req, res) => {
  try {
    const [status, health] = await Promise.all([
      getRolloutStatus(),
      runHealthChecks(),
    ]);
    res.json({ ...status, health });
  } catch (err) {
    console.error('[ADMIN] journey-rollout status error:', err);
    res.status(500).json({ error: 'Kunde inte hämta rollout-status' });
  }
});

router.post('/journey-rollout/advance', async (req, res) => {
  try {
    const minHours = parseInt(req.body?.min_observation_hours ?? '0', 10) || 0;
    const result = await advanceOneWave({
      updatedBy: req.user.id,
      minObservationHours: minHours,
    });
    if (!result.ok) {
      const status = result.error === 'observation_period' ? 409 : 400;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('[ADMIN] journey-rollout advance error:', err);
    res.status(500).json({ error: 'Kunde inte aktivera nästa wave' });
  }
});

router.post('/journey-rollout/enable', async (req, res) => {
  try {
    const wave = parseInt(req.body?.wave, 10);
    if (!Number.isFinite(wave) || wave < 1 || wave > 5) {
      return res.status(400).json({ error: 'wave måste vara 1–5' });
    }
    const status = await enableWaveUpTo(wave, { updatedBy: req.user.id });
    res.json({ ok: true, enabled_wave: wave, status });
  } catch (err) {
    console.error('[ADMIN] journey-rollout enable error:', err);
    res.status(500).json({ error: 'Kunde inte aktivera wave' });
  }
});

module.exports = router;
