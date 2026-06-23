// Admin: subscription settings, add-ons, and payment toggle.
// Does NOT own auth/authz — delegated from parent admin.js.

const express = require('express');
const appSettings = require('../../../db/app-settings');
const addons = require('../../../db/subscription-addons');
const appConfig = require('../../../db/app-config');
const { normalizeRolloutMode, getRolloutFlags } = require('../../lib/package-access');

const router = express.Router();

function buildRolloutPayload(entry) {
  const rollout_mode = normalizeRolloutMode(
    entry?.value ?? process.env.PACKAGES_ROLLOUT_MODE ?? 'off'
  );
  return {
    rollout_mode,
    rollout: {
      rollout_mode,
      ...getRolloutFlags(rollout_mode),
      preview_enabled: rollout_mode !== 'off',
      interest_cta_enabled: rollout_mode === 'interest',
      updated_at: entry?.updated_at ?? null,
    },
  };
}

// GET /api/admin/subscription-settings
router.get('/', async (req, res, next) => {
  try {
    const [
      payment_enabled,
      basic_price_sek,
      basic_trial_days,
      addonsResult,
      founder_family_limit,
      rolloutEntry,
    ] = await Promise.all([
      appSettings.getPaymentEnabled().catch((err) => {
        console.error('[admin:subscription] payment_enabled read error:', err.message);
        return false;
      }),
      appSettings.getBasicPrice().catch((err) => {
        console.error('[admin:subscription] basic_price read error:', err.message);
        return 59;
      }),
      appSettings.getBasicTrialDays().catch((err) => {
        console.error('[admin:subscription] trial_days read error:', err.message);
        return 14;
      }),
      addons.getAllAddons().catch((err) => {
        console.error('[admin:subscription] addons read error:', err.message);
        return { rows: [] };
      }),
      appSettings.getFounderFamilyLimit().catch((err) => {
        console.error('[admin:subscription] founder_limit read error:', err.message);
        return 200;
      }),
      appConfig.getEntry('PACKAGES_ROLLOUT_MODE').catch((err) => {
        console.error('[admin:subscription] rollout read error:', err.message);
        return null;
      }),
    ]);
    res.json({
      payment_enabled,
      basic_price_sek,
      basic_trial_days,
      founder_family_limit,
      addons: addonsResult.rows,
      ...buildRolloutPayload(rolloutEntry),
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/subscription-settings
// Body: { basic_price_sek?, basic_trial_days?, founder_family_limit? }
router.patch('/', async (req, res, next) => {
  try {
    const { basic_price_sek, basic_trial_days, founder_family_limit } = req.body;
    const updates = [];
    if (basic_price_sek !== undefined) {
      const n = parseInt(basic_price_sek, 10);
      if (isNaN(n) || n < 0) return res.status(400).json({ error: 'basic_price_sek must be a non-negative integer' });
      await appSettings.setBasicPrice(n);
      updates.push('basic_price_sek');
    }
    if (basic_trial_days !== undefined) {
      const n = parseInt(basic_trial_days, 10);
      if (isNaN(n) || n < 0) return res.status(400).json({ error: 'basic_trial_days must be a non-negative integer' });
      await appSettings.setBasicTrialDays(n);
      updates.push('basic_trial_days');
    }
    if (founder_family_limit !== undefined) {
      const n = parseInt(founder_family_limit, 10);
      if (isNaN(n) || n < 1) return res.status(400).json({ error: 'founder_family_limit must be at least 1' });
      await appSettings.setFounderFamilyLimit(n);
      updates.push('founder_family_limit');
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });
    const [price, trial, limit] = await Promise.all([
      appSettings.getBasicPrice(),
      appSettings.getBasicTrialDays(),
      appSettings.getFounderFamilyLimit(),
    ]);
    res.json({ message: 'Updated: ' + updates.join(', '), basic_price_sek: price, basic_trial_days: trial, founder_family_limit: limit });
  } catch (err) { next(err); }
});

// PATCH /api/admin/payment-enabled — IAP master switch (when App Store IAP is live)
router.patch('/payment-enabled', async (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' });
    await appSettings.setPaymentEnabled(enabled);
    res.json({ payment_enabled: enabled });
  } catch (err) { next(err); }
});

// POST /api/admin/addons
// Body: { name, description?, price_sek, stripe_price_id?, is_active? }
router.post('/addons', async (req, res, next) => {
  try {
    const { name, description, price_sek, stripe_price_id, is_active } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const n = parseInt(price_sek, 10);
    if (isNaN(n) || n < 0) return res.status(400).json({ error: 'price_sek must be a non-negative integer' });
    const addon = await addons.createAddon({ name: name.trim(), description, price_sek: n, stripe_price_id, is_active });
    res.status(201).json(addon);
  } catch (err) { next(err); }
});

// PATCH /api/admin/addons/:id
router.patch('/addons/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, description, price_sek, stripe_price_id, is_active } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      updates.name = name.trim();
    }
    if (price_sek !== undefined) {
      const n = parseInt(price_sek, 10);
      if (isNaN(n) || n < 0) return res.status(400).json({ error: 'price_sek must be a non-negative integer' });
      updates.price_sek = n;
    }
    if (description !== undefined) updates.description = description;
    if (stripe_price_id !== undefined) updates.stripe_price_id = stripe_price_id;
    if (is_active !== undefined) updates.is_active = !!is_active;
    const updated = await addons.updateAddon(id, updates);
    if (!updated) return res.status(404).json({ error: 'Add-on not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/admin/addons/:id
router.delete('/addons/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const deleted = await addons.deleteAddon(id);
    if (!deleted) return res.status(404).json({ error: 'Add-on not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;