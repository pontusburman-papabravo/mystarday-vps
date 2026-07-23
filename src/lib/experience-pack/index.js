'use strict';

const path = require('path');
const fs = require('fs');

function getPacksRoot() {
  return process.env.EXPERIENCE_PACKS_ROOT
    || path.join(__dirname, '../../../config/experience-packs');
}
const db = require('../db');
const { experiencePackIdForLocale, resolveFamilyLocale } = require('../locale');

const DEFAULT_PACK_ID = 'child_se';

const packCache = new Map();

function readPackJsonFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Experience pack file missing (${label}): ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Experience pack JSON invalid (${label}): ${filePath} — ${err.message}`);
    }
    throw err;
  }
}

function loadPack(packId = DEFAULT_PACK_ID) {
  const cached = packCache.get(packId);
  if (cached) return cached;

  const packDir = path.join(getPacksRoot(), packId);
  const manifestPath = path.join(packDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Experience pack not found: ${packId} (expected ${manifestPath})`);
  }

  const manifest = readPackJsonFile(manifestPath, `${packId}/manifest.json`);
  if (manifest.pack_id && manifest.pack_id !== packId) {
    throw new Error(
      `Experience pack id mismatch: directory "${packId}" but manifest.pack_id is "${manifest.pack_id}"`
    );
  }

  const includes = manifest.includes || {};

  const pack = {
    manifest,
    progression: includes.progression
      ? readPackJsonFile(path.join(packDir, includes.progression), `${packId}/${includes.progression}`)
      : { worlds: [] },
    rewards: includes.rewards
      ? readPackJsonFile(path.join(packDir, includes.rewards), `${packId}/${includes.rewards}`)
      : { rewards: [] },
    copy: includes.copy
      ? readPackJsonFile(path.join(packDir, includes.copy), `${packId}/${includes.copy}`)
      : { experiences: {} },
    worlds: includes.worlds
      ? readPackJsonFile(path.join(packDir, includes.worlds), `${packId}/${includes.worlds}`)
      : { worlds: [] },
    livingObjects: includes.living_objects
      ? readPackJsonFile(path.join(packDir, includes.living_objects), `${packId}/${includes.living_objects}`)
      : { worlds: [] },
    exhibits: includes.exhibits
      ? readPackJsonFile(path.join(packDir, includes.exhibits), `${packId}/${includes.exhibits}`)
      : { worlds: [] },
    scenes: includes.scenes
      ? readPackJsonFile(path.join(packDir, includes.scenes), `${packId}/${includes.scenes}`)
      : { version: '0.0.0', scenes: [] },
  };

  packCache.set(packId, pack);
  return pack;
}

function clearPackCache() {
  packCache.clear();
}

function resolvePackForChild(_childId, packId) {
  const id = packId || DEFAULT_PACK_ID;
  return loadPack(id);
}

/**
 * Resolve experience pack from family locale.
 * @param {string|null|undefined} familyLocale
 * @returns {object}
 */
function resolvePackForFamily(familyLocale) {
  const packId = experiencePackIdForLocale(resolveFamilyLocale(familyLocale));
  return loadPack(packId);
}

/**
 * Resolve experience pack id from child row (family.preferred_locale).
 * @param {string|null|undefined} childId
 * @param {import('pg').PoolClient|{query: Function}|null} [client]
 * @returns {Promise<string>}
 */
async function resolvePackIdForChild(childId, client) {
  if (!childId) return DEFAULT_PACK_ID;
  const q = client && typeof client.query === 'function' ? client : db;
  try {
    const result = await q.query(
      `SELECT f.preferred_locale
       FROM child c
       JOIN family f ON f.id = c.family_id
       WHERE c.id = $1`,
      [childId]
    );
    const familyLocale = result.rows[0]?.preferred_locale;
    return experiencePackIdForLocale(resolveFamilyLocale(familyLocale));
  } catch (err) {
    console.warn('[experience-pack] resolvePackIdForChild failed, defaulting sv:', err.message);
    return DEFAULT_PACK_ID;
  }
}

function getAllProgressionNodes(pack) {
  const nodes = [];
  for (const world of pack.progression.worlds || []) {
    for (const node of world.nodes || []) {
      nodes.push({ ...node, world_slug: world.world_slug });
    }
  }
  return nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
}

function getRewardBySignal(pack, signal) {
  return (pack.rewards.rewards || []).find((r) => r.trigger_signal === signal) || null;
}

function getWorldDef(pack, worldSlug) {
  return (pack.worlds.worlds || []).find((w) => w.world_slug === worldSlug) || null;
}

function getLivingWorldDef(pack, worldSlug) {
  return (pack.livingObjects.worlds || []).find((w) => w.world_slug === worldSlug) || null;
}

function getLivingArchetype(pack, worldSlug, archetypeId) {
  const world = getLivingWorldDef(pack, worldSlug);
  if (!world) return null;
  return (world.archetypes || []).find((a) => a.archetype_id === archetypeId) || null;
}

function getExhibitWorldDef(pack, worldSlug) {
  return (pack.exhibits.worlds || []).find((w) => w.world_slug === worldSlug) || null;
}

/** Pack-defined exhibit slots; content resolved server-side when BL-012 ships. */
function buildExhibitViews(pack, worldSlug) {
  const worldDef = getExhibitWorldDef(pack, worldSlug);
  if (!worldDef) return [];
  return (worldDef.slots || []).map((slot) => ({
    slot_id: slot.slot_id,
    slot_type: slot.slot_type,
    label_sv: slot.label_sv || null,
    visual_token: slot.visual_token || null,
    content: null,
  }));
}

function interpolateTemplate(template, vars = {}) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function resolveExperienceCopy(pack, experienceKey, vars = {}) {
  const exp = pack.copy.experiences?.[experienceKey];
  if (!exp) return null;

  return {
    tone: exp.tone,
    headline: exp.headline
      || interpolateTemplate(exp.headline_template, vars),
    body: exp.body
      || interpolateTemplate(exp.body_template, vars),
    message: exp.message,
    world_hint: exp.world_hint,
    cta: exp.cta,
  };
}

function getSceneDef(pack, sceneId) {
  return (pack.scenes.scenes || []).find((s) => s.scene_id === sceneId) || null;
}

module.exports = {
  DEFAULT_PACK_ID,
  loadPack,
  clearPackCache,
  resolvePackForChild,
  resolvePackForFamily,
  resolvePackIdForChild,
  experiencePackIdForLocale,
  getAllProgressionNodes,
  getRewardBySignal,
  getWorldDef,
  getLivingWorldDef,
  getLivingArchetype,
  getExhibitWorldDef,
  buildExhibitViews,
  interpolateTemplate,
  resolveExperienceCopy,
  getSceneDef,
};
