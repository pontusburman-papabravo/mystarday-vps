'use strict';

/**
 * FEAT-1 — Boendeschema API (flag: custody_schedule_beta).
 * Mounted at /api/family/custody
 */

const express = require('express');
const db = require('../../lib/db');
const { requireNotPedagogOnly } = require('../../middleware/authz');
const { isActivationFlagEnabled, FLAG_KEYS } = require('../../lib/activation-flags');
const custodyDb = require('../../../db/custody');
const { buildCustodyContextResponse } = require('../../lib/custody-context-api');
const { migrateChildScheduleToCustody } = require('../../lib/custody-schedule-migrate');
const {
  PATTERN_CUSTOM,
  isMondayAnchor,
  validateCustomConfiguration,
} = require('../../lib/custody-custom-config');
const analytics = require('../../../db/analytics');

const router = express.Router();

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

async function requireCustodyFeature(req, res, next) {
  try {
    const enabled = await isActivationFlagEnabled(FLAG_KEYS.custodySchedule, req.user.familyId);
    if (!enabled) {
      return res.status(404).json({ error: 'Funktionen är inte tillgänglig' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function verifyChildInFamily(childId, familyId) {
  const result = await db.query(
    'SELECT id FROM child WHERE id = $1 AND family_id = $2',
    [childId, familyId]
  );
  return result.rows[0] || null;
}

function homesById(homes) {
  const map = {};
  for (const h of homes) map[h.id] = h;
  return map;
}

// GET /api/family/custody
router.get('/', requireNotPedagogOnly, requireCustodyFeature, async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const config = await custodyDb.getFamilyConfig(familyId);
    const parents = await db.query(
      `SELECT id, name, email FROM parent WHERE family_id = $1 AND is_admin = false ORDER BY created_at ASC`,
      [familyId]
    );
    res.json({
      featureEnabled: true,
      homes: config.homes,
      parentHomes: config.parentHomes,
      patterns: config.patterns,
      parents: parents.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/family/custody/context?childId=&date=
router.get('/context', requireNotPedagogOnly, requireCustodyFeature, async (req, res, next) => {
  try {
    const { childId, date } = req.query;
    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'childId krävs' });
    }
    const child = await verifyChildInFamily(childId, req.user.familyId);
    if (!child) return res.status(404).json({ error: 'Barn hittades inte' });

    const dateStr = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().slice(0, 10);

    const payload = await buildCustodyContextResponse({
      childId,
      familyId: req.user.familyId,
      parentId: req.user.id,
      dateStr,
    });

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// PUT /api/family/custody/homes
router.put('/homes', requireNotPedagogOnly, requireCustodyFeature, async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const { homes } = req.body || {};
    if (!Array.isArray(homes) || homes.length < 1 || homes.length > 4) {
      return res.status(400).json({ error: 'homes måste vara en array (1–4 hem)' });
    }

    const saved = [];
    for (let i = 0; i < homes.length; i++) {
      const h = homes[i];
      const label = String(h.label || '').trim().slice(0, 64);
      const color = HEX_COLOR.test(h.color || '') ? h.color : '#4F46E5';
      if (!label) return res.status(400).json({ error: 'Varje hem behöver en etikett' });

      const row = await custodyDb.upsertHome({
        id: h.id || null,
        family_id: familyId,
        label,
        color,
        sort_order: i,
      });
      saved.push(row);
    }

    analytics.track(familyId, 'custody_home_selected', { count: saved.length });
    res.json({ homes: saved });
  } catch (err) {
    next(err);
  }
});

// PUT /api/family/custody/parent-homes
router.put('/parent-homes', requireNotPedagogOnly, requireCustodyFeature, async (req, res, next) => {
  try {
    const familyId = req.user.familyId;
    const { mappings } = req.body || {};
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings krävs' });
    }

    for (const m of mappings) {
      const parentCheck = await db.query(
        'SELECT id FROM parent WHERE id = $1 AND family_id = $2',
        [m.parentId, familyId]
      );
      if (!parentCheck.rows[0]) continue;
      if (m.custodyHomeId) {
        const home = await custodyDb.getHomeInFamily(m.custodyHomeId, familyId);
        if (!home) return res.status(400).json({ error: 'Ogiltigt hem' });
      }
      await custodyDb.setParentHome(m.parentId, m.custodyHomeId || null);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/family/custody/pattern/:childId
router.put('/pattern/:childId', requireNotPedagogOnly, requireCustodyFeature, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const familyId = req.user.familyId;
    const { childId } = req.params;
    const child = await verifyChildInFamily(childId, familyId);
    if (!child) return res.status(404).json({ error: 'Barn hittades inte' });

    const {
      anchor_date: anchorDate,
      week_a_home_id: weekAHomeId,
      week_b_home_id: weekBHomeId,
      pattern_type: patternType,
      default_home_id: defaultHomeId,
      configuration: bodyConfiguration,
      enabled,
      clone_week_b: cloneWeekB,
      pack_luggage_reminder: packLuggage,
    } = req.body || {};

    if (enabled === false) {
      await custodyDb.deletePattern(childId, client);
      return res.json({ ok: true, pattern: null });
    }

    if (!anchorDate) {
      return res.status(400).json({ error: 'anchor_date krävs' });
    }

    const familyHomes = await custodyDb.listHomes(familyId, client);
    const validHomeIds = new Set(familyHomes.map((h) => h.id));

    let resolvedType;
    let configuration;
    let resolvedWeekA;
    let resolvedWeekB;

    if (patternType === PATTERN_CUSTOM) {
      if (!isMondayAnchor(anchorDate)) {
        return res.status(400).json({ error: 'anchor_date måste vara en måndag' });
      }
      const customCheck = validateCustomConfiguration(bodyConfiguration, validHomeIds);
      if (!customCheck.ok) {
        return res.status(400).json({ error: customCheck.error });
      }
      resolvedType = PATTERN_CUSTOM;
      configuration = { cycle_weeks: customCheck.cycleWeeks };
      resolvedWeekA = customCheck.distinctHomeIds[0];
      resolvedWeekB = customCheck.distinctHomeIds[1];
    } else {
      if (!weekAHomeId || !weekBHomeId) {
        return res.status(400).json({ error: 'anchor_date och två hem krävs' });
      }
      if (weekAHomeId === weekBHomeId) {
        return res.status(400).json({ error: 'De två hemmen måste vara olika' });
      }

      const homeA = await custodyDb.getHomeInFamily(weekAHomeId, familyId, client);
      const homeB = await custodyDb.getHomeInFamily(weekBHomeId, familyId, client);
      if (!homeA || !homeB) {
        return res.status(400).json({ error: 'Ogiltiga hem' });
      }

      resolvedType = patternType === 'alternate_weekends'
        ? 'alternate_weekends'
        : 'alternate_weeks';
      resolvedWeekA = weekAHomeId;
      resolvedWeekB = weekBHomeId;

      if (resolvedType === 'alternate_weekends') {
        if (!defaultHomeId) {
          return res.status(400).json({ error: 'default_home_id krävs för varannan helg' });
        }
        const defaultHome = await custodyDb.getHomeInFamily(defaultHomeId, familyId, client);
        if (!defaultHome) {
          return res.status(400).json({ error: 'Ogiltigt bashem för vardagar' });
        }
        configuration = {
          default_home: defaultHomeId,
          weekend_home_a: weekAHomeId,
          weekend_home_b: weekBHomeId,
          weekend_start: 'friday',
        };
      } else {
        configuration = custodyDb.buildAlternateWeeksConfiguration(weekAHomeId, weekBHomeId);
      }
    }

    await client.query('BEGIN');

    const existingPattern = await custodyDb.getPattern(childId, client);

    const pattern = await custodyDb.upsertPattern({
      child_id: childId,
      anchor_date: anchorDate,
      interval_weeks: 2,
      week_a_home_id: resolvedWeekA,
      week_b_home_id: resolvedWeekB,
      pattern_type: resolvedType,
      configuration,
    }, client);

    if (typeof packLuggage === 'boolean') {
      await client.query(
        'UPDATE custody_pattern SET pack_luggage_reminder = $2 WHERE child_id = $1',
        [childId, packLuggage]
      );
    }

    if (cloneWeekB !== false) {
      await migrateChildScheduleToCustody(client, childId, resolvedWeekA, resolvedWeekB);
    }

    await client.query('COMMIT');

    const analyticsMeta = {
      child_id: childId,
      pattern_type: resolvedType,
      anchor_date: anchorDate,
      ...(resolvedType === PATTERN_CUSTOM
        ? { cycle_length: configuration.cycle_weeks.length }
        : {}),
    };
    if (!existingPattern) {
      analytics.track(familyId, 'custody_schedule_created', analyticsMeta);
    }
    analytics.track(familyId, 'custody_schedule_updated', analyticsMeta);

    res.json({ pattern });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/family/custody/setup — quick start with 2 default homes
router.post('/setup', requireNotPedagogOnly, requireCustodyFeature, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const familyId = req.user.familyId;
    const existing = await custodyDb.listHomes(familyId, client);
    if (existing.length >= 2) {
      return res.json({ homes: existing, alreadySetup: true });
    }

    await client.query('BEGIN');

    const parents = await client.query(
      `SELECT id, name FROM parent WHERE family_id = $1 AND is_admin = false ORDER BY created_at ASC LIMIT 2`,
      [familyId]
    );

    const home1 = await custodyDb.upsertHome({
      family_id: familyId,
      label: 'Hem 1',
      color: '#4F46E5',
      sort_order: 0,
    }, client);
    const home2 = await custodyDb.upsertHome({
      family_id: familyId,
      label: 'Hem 2',
      color: '#22C55E',
      sort_order: 1,
    }, client);

    if (parents.rows[0]) {
      await custodyDb.setParentHome(parents.rows[0].id, home1.id, client);
    }
    if (parents.rows[1]) {
      await custodyDb.setParentHome(parents.rows[1].id, home2.id, client);
    }

    await client.query('COMMIT');

    res.json({
      homes: [home1, home2],
      parentHomes: parents.rows.map((p, i) => ({
        parent_id: p.id,
        custody_home_id: i === 0 ? home1.id : home2?.id,
      })).filter((m) => m.custody_home_id),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
