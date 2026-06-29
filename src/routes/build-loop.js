'use strict';

/**
 * Child build loop + garage customization.
 * Mounted at /api/me/build
 */

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { z } = require('zod');
const buildDb = require('../../db/child-build-project');
const {
  WHEEL_OPTIONS,
  COLOR_OPTIONS,
  DECAL_OPTIONS,
  normalizeCustomization,
} = require('../lib/build-catalog');
const { filterMvpCatalog } = require('../lib/build-adventures');
const { enrichProject, unlockedWorldsFromProjects } = require('../lib/build-progress');
const {
  isPlayWorldSlug,
  publicWorldConfig,
  normalizePlayCustomization,
  applyPlayAction,
  PLAY_WORLD_SLUGS,
  playHrefForSlug,
} = require('../lib/build-world-play');
const universeDb = require('../../db/child-universe');
const universeEngine = require('../lib/universe-engine');

const router = express.Router();
router.use(requireChild);

const CustomizeSchema = z.object({
  color_id: z.enum(COLOR_OPTIONS.map((c) => c.id)).optional(),
  wheels: z.enum(WHEEL_OPTIONS.map((w) => w.id)).optional(),
  decal: z.enum(DECAL_OPTIONS.map((d) => d.id)).optional(),
});

const ActionSchema = z.object({
  action: z.enum(['wash', 'polish', 'honk', 'tune', 'race']),
});

const StartSchema = z.object({
  catalog_slug: z.string().min(2).max(32),
});

router.get('/', async (req, res) => {
  try {
    const childId = req.user.id;
    const [catalogRows, projects] = await Promise.all([
      buildDb.getCatalog(),
      buildDb.getProjectsForChild(childId),
    ]);
    const catalog = filterMvpCatalog(catalogRows);
    const activeRaw = await buildDb.getActiveProject(childId);
    const active_project = enrichProject(activeRaw);
    const garageProject = projects.find((p) => p.status === 'completed' && p.garage_unlocked) || null;
    const world_map = unlockedWorldsFromProjects(projects).map(function (w) {
      return {
        ...w,
        href: playHrefForSlug(w.slug),
        active: !!(activeRaw && activeRaw.catalog_slug === w.slug),
      };
    });
    res.json({ catalog, projects, active_project, garage_project: garageProject, world_map });
  } catch (err) {
    console.error('[BUILD] GET / error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/start', validate(StartSchema), async (req, res) => {
  try {
    const childId = req.user.id;
    const result = await buildDb.startProject(childId, req.body.catalog_slug);
    if (result.error === 'not_found') {
      return res.status(404).json({ error: 'Äventyret finns inte.' });
    }
    res.status(201).json({
      message: 'Äventyr startat! Gör aktiviteter för att samla delar 🧩',
      project: result.project,
    });
  } catch (err) {
    console.error('[BUILD] POST /start error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.get('/garage', async (req, res) => {
  try {
    const childId = req.user.id;
    let project = await buildDb.getCompletedGarageProject(childId);
    if (!project) {
      project = await buildDb.ensureDemoCompletedCar(childId);
    }
    if (!project) {
      return res.status(404).json({ error: 'Inget garage ännu — bygg klart ditt projekt först!' });
    }

    await syncGarageToUniverse(childId, project);

    res.json({
      project,
      options: {
        colors: COLOR_OPTIONS,
        wheels: WHEEL_OPTIONS,
        decals: DECAL_OPTIONS,
      },
      actions: [
        { id: 'wash', label: 'Tvätta', icon: '🫧' },
        { id: 'polish', label: 'Polera', icon: '✨' },
        { id: 'tune', label: 'Mecka motor', icon: '🔧' },
        { id: 'honk', label: 'Tuta', icon: '📣' },
        { id: 'race', label: 'Kör ett varv', icon: '🏁' },
      ],
    });
  } catch (err) {
    console.error('[BUILD] GET /garage error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.patch('/garage', validate(CustomizeSchema), async (req, res) => {
  try {
    const childId = req.user.id;
    const project = await buildDb.getCompletedGarageProject(childId);
    if (!project) {
      return res.status(404).json({ error: 'Garaget är inte öppet ännu.' });
    }
    const customization = await buildDb.updateCustomization(project.id, childId, req.body);
    if (!customization) {
      return res.status(404).json({ error: 'Projekt hittades inte.' });
    }
    res.json({
      message: 'Sparat!',
      customization: normalizeCustomization(customization),
    });
  } catch (err) {
    console.error('[BUILD] PATCH /garage error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/garage/action', validate(ActionSchema), async (req, res) => {
  try {
    const childId = req.user.id;
    const project = await buildDb.getCompletedGarageProject(childId);
    if (!project) {
      return res.status(404).json({ error: 'Garaget är inte öppet ännu.' });
    }

    const c = { ...project.customization };
    let message = '';
    let copy_key = 'garage_action';

    switch (req.body.action) {
      case 'wash':
        c.cleanliness = 100;
        message = 'Så fin och ren! 🫧';
        copy_key = 'garage_wash';
        break;
      case 'polish':
        c.cleanliness = Math.min(100, (c.cleanliness || 0) + 15);
        message = 'Wow, den glänser! ✨';
        copy_key = 'garage_polish';
        break;
      case 'tune':
        c.tune_level = Math.min(5, (c.tune_level || 0) + 1);
        message = c.tune_level >= 5 ? 'Motorn är maxad! 🔧' : 'Bra meckat — motorn surrar! 🔧';
        copy_key = 'garage_tune';
        break;
      case 'honk':
        message = 'BRUM BRUM! 📣';
        copy_key = 'garage_honk';
        break;
      case 'race':
        message = 'Vroom runt garaget! 🏁';
        copy_key = 'garage_race';
        break;
      default:
        return res.status(400).json({ error: 'Okänd åtgärd' });
    }

    const customization = await buildDb.updateCustomization(project.id, childId, c);
    res.json({
      action: req.body.action,
      message,
      copy_key,
      customization: normalizeCustomization(customization),
    });
  } catch (err) {
    console.error('[BUILD] POST /garage/action error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

async function syncGarageToUniverse(childId, project) {
  try {
    const child = await universeDb.getChildRow(childId);
    if (!child) return;
    const house = child.house_config || {};
    const objects = Array.isArray(house.world_objects) ? [...house.world_objects] : [];
    const entry = {
      type: 'garage_vehicle',
      project_id: project.id,
      catalog_slug: project.catalog_slug,
      customization: project.customization,
    };
    const idx = objects.findIndex((o) => o.type === 'garage_vehicle' && o.catalog_slug === project.catalog_slug);
    if (idx >= 0) objects[idx] = entry;
    else objects.push(entry);
    await universeDb.updateHouseConfig(childId, {
      unlocked_rooms: [...new Set([...(house.unlocked_rooms || []), 'garage'])],
      world_objects: objects,
    });
    const stats = await universeDb.getChildStats(childId);
    await universeEngine.syncUnlocks(childId, stats);
  } catch (err) {
    console.error('[BUILD] universe sync failed:', err.message);
  }
}

function playPatchSchema(slug) {
  const cfg = publicWorldConfig(slug);
  if (!cfg || !cfg.pickers.length) return z.object({}).passthrough();
  const shape = {};
  cfg.pickers.forEach(function (p) {
    const ids = p.options.map((o) => o.id);
    shape[p.key] = z.enum(ids);
  });
  return z.object(shape).passthrough();
}

function playActionSchema(slug) {
  const cfg = publicWorldConfig(slug);
  const ids = (cfg && cfg.actions) ? cfg.actions.map((a) => a.id) : [];
  if (!ids.length) return z.object({ action: z.string() });
  return z.object({ action: z.enum(ids) });
}

router.get('/play/:catalogSlug', async (req, res) => {
  try {
    const slug = req.params.catalogSlug;
    if (!isPlayWorldSlug(slug)) {
      return res.status(404).json({ error: 'Lek-världen finns inte.' });
    }
    const childId = req.user.id;
    let project = await buildDb.getCompletedWorldProject(childId, slug);
    const preview = req.query.preview === '1';
    if (!project && preview) {
      project = await buildDb.ensureDemoCompletedWorld(childId, slug);
    }
    if (!project) {
      return res.status(404).json({ error: 'Bygg klart äventyret först — 75 delar! 🧩' });
    }
    const world = publicWorldConfig(slug);
    res.json({
      project,
      world,
      customization: normalizePlayCustomization(slug, project.customization),
    });
  } catch (err) {
    console.error('[BUILD] GET /play/:slug error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.patch('/play/:catalogSlug', async (req, res) => {
  try {
    const slug = req.params.catalogSlug;
    if (!isPlayWorldSlug(slug)) {
      return res.status(404).json({ error: 'Lek-världen finns inte.' });
    }
    const schema = playPatchSchema(slug);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ogiltigt val.' });
    }
    const childId = req.user.id;
    const project = await buildDb.getCompletedWorldProject(childId, slug);
    if (!project) {
      return res.status(404).json({ error: 'Lek-världen är inte öppen ännu.' });
    }
    const merged = normalizePlayCustomization(slug, {
      ...project.customization,
      ...parsed.data,
    });
    await buildDb.updateCustomization(project.id, childId, merged);
    res.json({ message: 'Sparat!', customization: merged });
  } catch (err) {
    console.error('[BUILD] PATCH /play/:slug error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

router.post('/play/:catalogSlug/action', async (req, res) => {
  try {
    const slug = req.params.catalogSlug;
    if (!isPlayWorldSlug(slug)) {
      return res.status(404).json({ error: 'Lek-världen finns inte.' });
    }
    const schema = playActionSchema(slug);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Okänd åtgärd' });
    }
    const childId = req.user.id;
    const project = await buildDb.getCompletedWorldProject(childId, slug);
    if (!project) {
      return res.status(404).json({ error: 'Lek-världen är inte öppen ännu.' });
    }
    const base = normalizePlayCustomization(slug, project.customization);
    const result = applyPlayAction(slug, base, parsed.data.action);
    const customization = await buildDb.updateCustomization(
      project.id,
      childId,
      result.customization
    );
    res.json({
      action: parsed.data.action,
      message: result.message,
      customization,
    });
  } catch (err) {
    console.error('[BUILD] POST /play/:slug/action error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;
