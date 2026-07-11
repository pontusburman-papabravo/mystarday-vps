'use strict';

const { DEFAULT_PACK, PACK_IDS, resolvePack } = require('../../config/child-pictogram-packs');

function isCanonicalPictogramPack(value) {
  if (value == null || typeof value !== 'string') return false;
  return PACK_IDS.includes(value.trim().toLowerCase());
}

function normalizeCanonicalPictogramPack(value) {
  if (!isCanonicalPictogramPack(value)) return null;
  return value.trim().toLowerCase();
}

module.exports = {
  DEFAULT_PACK,
  PACK_IDS,
  isCanonicalPictogramPack,
  normalizeCanonicalPictogramPack,
  resolvePack,
};
