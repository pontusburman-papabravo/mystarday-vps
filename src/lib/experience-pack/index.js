'use strict';

const path = require('path');
const fs = require('fs');

const PACKS_ROOT = path.join(__dirname, '../../../config/experience-packs');
const DEFAULT_PACK_ID = 'child_se';

const packCache = new Map();

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadPack(packId = DEFAULT_PACK_ID) {
  const cached = packCache.get(packId);
  if (cached) return cached;

  const packDir = path.join(PACKS_ROOT, packId);
  const manifestPath = path.join(packDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Experience pack not found: ${packId}`);
  }

  const manifest = readJsonFile(manifestPath);
  const includes = manifest.includes || {};

  const pack = {
    manifest,
    progression: includes.progression
      ? readJsonFile(path.join(packDir, includes.progression))
      : { worlds: [] },
    rewards: includes.rewards
      ? readJsonFile(path.join(packDir, includes.rewards))
      : { rewards: [] },
    copy: includes.copy
      ? readJsonFile(path.join(packDir, includes.copy))
      : { experiences: {} },
    worlds: includes.worlds
      ? readJsonFile(path.join(packDir, includes.worlds))
      : { worlds: [] },
  };

  packCache.set(packId, pack);
  return pack;
}

function clearPackCache() {
  packCache.clear();
}

function resolvePackForChild(_childId, packId = DEFAULT_PACK_ID) {
  return loadPack(packId);
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

module.exports = {
  DEFAULT_PACK_ID,
  loadPack,
  clearPackCache,
  resolvePackForChild,
  getAllProgressionNodes,
  getRewardBySignal,
  getWorldDef,
  interpolateTemplate,
  resolveExperienceCopy,
};
