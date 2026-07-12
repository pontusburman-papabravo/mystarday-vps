'use strict';

const { DEFAULT_SIZE, SIZE_IDS, resolveCardSize } = require('../../config/child-activity-card-size');

function isCanonicalActivityCardSize(value) {
  if (value == null || typeof value !== 'string') return false;
  return SIZE_IDS.includes(value.trim().toLowerCase());
}

function normalizeCanonicalActivityCardSize(value) {
  if (!isCanonicalActivityCardSize(value)) return null;
  return value.trim().toLowerCase();
}

module.exports = {
  DEFAULT_SIZE,
  SIZE_IDS,
  isCanonicalActivityCardSize,
  normalizeCanonicalActivityCardSize,
  resolveCardSize,
};
