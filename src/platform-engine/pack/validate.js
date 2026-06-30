'use strict';

const { ManifestValidationError } = require('../errors');

const AUDIENCE_BANDS = new Set(['child', 'teen', 'young_adult', 'adult', 'support']);
const NUMERIC_THRESHOLD = /(?::|\b)(\d+)\b/;

/**
 * @param {object} manifest
 * @param {{ progressionMaps?: Record<string, object> }} [options]
 */
function validateExperiencePack(manifest, options = {}) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    throw new ManifestValidationError('Manifest must be an object', [{ path: '', message: 'invalid root' }]);
  }

  for (const field of ['pack_id', 'audience_band', 'locale', 'worlds']) {
    if (manifest[field] == null || manifest[field] === '') {
      errors.push({ path: field, message: 'required' });
    }
  }

  if (manifest.audience_band && !AUDIENCE_BANDS.has(manifest.audience_band)) {
    errors.push({ path: 'audience_band', message: 'invalid enum' });
  }

  if (manifest.worlds && !Array.isArray(manifest.worlds)) {
    errors.push({ path: 'worlds', message: 'must be array' });
  }

  if (manifest.pacing != null && typeof manifest.pacing !== 'object') {
    errors.push({ path: 'pacing', message: 'must be object' });
  }

  const maps = options.progressionMaps ?? {};
  for (const [worldSlug, map] of Object.entries(maps)) {
    validateProgressionMap(map, worldSlug, errors);
  }

  if (errors.length > 0) {
    throw new ManifestValidationError('Experience pack validation failed', errors);
  }
}

/**
 * @param {object} map
 * @param {string} worldSlug
 * @param {Array<{ path: string, message: string }>} errors
 */
function validateProgressionMap(map, worldSlug, errors) {
  if (!map || typeof map !== 'object') {
    errors.push({ path: `progressionMaps.${worldSlug}`, message: 'must be object' });
    return;
  }

  if (map.world_slug && map.world_slug !== worldSlug) {
    errors.push({
      path: `progressionMaps.${worldSlug}.world_slug`,
      message: `expected ${worldSlug}, got ${map.world_slug}`,
    });
  }

  if (!Array.isArray(map.nodes) || map.nodes.length === 0) {
    errors.push({ path: `progressionMaps.${worldSlug}.nodes`, message: 'minItems 1' });
    return;
  }

  const seenIds = new Set();
  for (let i = 0; i < map.nodes.length; i += 1) {
    const node = map.nodes[i];
    const base = `progressionMaps.${worldSlug}.nodes[${i}]`;

    for (const req of ['node_id', 'order', 'node_type', 'emotional_beat', 'unlock_signal']) {
      if (node[req] == null || node[req] === '') {
        errors.push({ path: `${base}.${req}`, message: 'required' });
      }
    }

    if (node.node_id) {
      if (!/^[a-z0-9_]+$/.test(node.node_id)) {
        errors.push({ path: `${base}.node_id`, message: 'invalid pattern' });
      }
      if (seenIds.has(node.node_id)) {
        errors.push({ path: `${base}.node_id`, message: 'duplicate' });
      }
      seenIds.add(node.node_id);
    }

    if (node.unlock_signal && NUMERIC_THRESHOLD.test(String(node.unlock_signal)) && !node.pack_config_key) {
      errors.push({
        path: `${base}.pack_config_key`,
        message: 'numeric threshold in unlock_signal requires pack_config_key (ADR-004)',
      });
    }
  }
}

module.exports = {
  validateExperiencePack,
  validateProgressionMap,
  AUDIENCE_BANDS,
};
