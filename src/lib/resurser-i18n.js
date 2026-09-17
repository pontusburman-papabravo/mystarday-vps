'use strict';

const fs = require('fs');
const path = require('path');

const BUNDLE_DIR = path.join(__dirname, '../../config/i18n');
const BUNDLES = {
  'sv-SE': 'resurser-sv-SE.json',
  'en-GB': 'resurser-en-GB.json',
};

const cache = new Map();

function loadResurserI18n(locale) {
  const key = BUNDLES[locale] ? locale : 'sv-SE';
  if (cache.has(key)) return cache.get(key);
  const file = path.join(BUNDLE_DIR, BUNDLES[key]);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  cache.set(key, data);
  return data;
}

function pictogramLabel(key, locale) {
  const t = loadResurserI18n(locale);
  if (t.pictogramLabels && t.pictogramLabels[key]) return t.pictogramLabels[key];
  const { getPictogram } = require('../../config/pictogram-library');
  const pic = getPictogram(key);
  return pic ? pic.label : key;
}

function pdfCopy(assetId, locale) {
  const t = loadResurserI18n(locale);
  return (t.pdf && t.pdf[assetId]) || {};
}

module.exports = {
  loadResurserI18n,
  pictogramLabel,
  pdfCopy,
};
