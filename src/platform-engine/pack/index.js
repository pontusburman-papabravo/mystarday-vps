'use strict';

const { validateExperiencePack } = require('./validate');
const { PlatformEngineError } = require('../errors');

const PACK_STATES = Object.freeze({
  UNLOADED: 'unloaded',
  VALIDATING: 'validating',
  ACTIVE: 'active',
});

/**
 * ADR-001 Experience Pack loader — presentation + pacing config, no core fork.
 */
class ExperiencePackLoader {
  constructor() {
    this._state = PACK_STATES.UNLOADED;
    this._packId = null;
    /** @type {object|null} */
    this._manifest = null;
  }

  get state() {
    return this._state;
  }

  /**
   * @param {string} packId
   * @param {object} manifest
   * @param {{ progressionMaps?: Record<string, object> }} [options]
   */
  load(packId, manifest, options = {}) {
    this._state = PACK_STATES.VALIDATING;
    validateExperiencePack(manifest, options);
    if (manifest.pack_id !== packId) {
      throw new PlatformEngineError(
        `pack_id mismatch: expected ${packId}, manifest has ${manifest.pack_id}`,
        'PACK_ID_MISMATCH'
      );
    }
    this._packId = packId;
    this._manifest = Object.freeze(JSON.parse(JSON.stringify(manifest)));
    this._state = PACK_STATES.ACTIVE;
    return this.getActive();
  }

  unload() {
    this._packId = null;
    this._manifest = null;
    this._state = PACK_STATES.UNLOADED;
  }

  getActive() {
    if (this._state !== PACK_STATES.ACTIVE || !this._manifest) {
      throw new PlatformEngineError('No active experience pack', 'PACK_NOT_LOADED');
    }
    return this._manifest;
  }

  /**
   * Dot-path lookup into pacing config (pack-driven thresholds).
   * @param {string} key e.g. progression.routine_home.welcome_mat
   */
  getConfig(key) {
    const manifest = this.getActive();
    const pacing = manifest.pacing ?? {};
    return getByPath(pacing, key);
  }

  /**
   * @param {string} table
   * @param {string} key
   */
  getCopy(table, key) {
    const manifest = this.getActive();
    const tables = manifest.copy_tables ?? {};
    const bucket = tables[table];
    if (!bucket || typeof bucket !== 'object') return undefined;
    return bucket[key];
  }

  validate(options = {}) {
    if (!this._manifest) {
      throw new PlatformEngineError('No pack to validate', 'PACK_NOT_LOADED');
    }
    validateExperiencePack(this._manifest, options);
    return true;
  }
}

/**
 * @param {object} root
 * @param {string} path
 */
function getByPath(root, path) {
  if (!path) return undefined;
  const parts = path.split('.');
  let cur = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

module.exports = {
  ExperiencePackLoader,
  PACK_STATES,
  getByPath,
};
