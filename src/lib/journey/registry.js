'use strict';

const path = require('path');
const fs = require('fs');
const { resolveFamilyLocale, usesCanonicalLibrary } = require('../locale');
const EN_TRANSLATIONS = require('../../../config/journey-en-GB-translations');

function loadJsonFallback(locale = 'sv-SE') {
  try {
    const p = path.join(__dirname, '../../../config/journey-experience-registry.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const canonical = resolveFamilyLocale(locale);
    if (!usesCanonicalLibrary(canonical)) {
      return translateRegistryFallback(data, canonical);
    }
    return data;
  } catch {
    return { version: '2026-06-28-v1', phases: {} };
  }
}

function journeyTranslationsFor(locale) {
  const canonical = resolveFamilyLocale(locale);
  if (canonical === 'en-GB') return EN_TRANSLATIONS;
  const file = path.join(__dirname, `../../../config/journey-${canonical}-translations.js`);
  if (fs.existsSync(file)) return require(file);
  return EN_TRANSLATIONS;
}

/** Locale file when present, otherwise the English journey copy. Swedish stays the canonical registry. */
function translateRegistryFallback(svRegistry, locale = 'en-GB') {
  const translations = journeyTranslationsFor(locale);
  const en = JSON.parse(JSON.stringify(svRegistry));
  for (const phase of Object.values(en.phases || {})) {
    for (const [experienceKey, exp] of Object.entries(phase)) {
      const tr = translations[experienceKey];
      if (!tr) continue;
      exp.headline = tr[0];
      exp.body = tr[1] != null ? tr[1] : exp.body;
      exp.cta = tr[2];
    }
  }
  return en;
}

async function loadRegistry({ useDb = false, locale = 'sv-SE' } = {}) {
  const familyLocale = resolveFamilyLocale(locale);
  if (useDb) {
    try {
      const journeyRegistry = require('../../../db/journey-registry');
      const dbRegistry = await journeyRegistry.getActiveRegistry(familyLocale);
      if (dbRegistry) return dbRegistry;
    } catch (err) {
      console.error('[journey/registry] DB load failed:', err.message);
    }
  }
  return loadJsonFallback(familyLocale);
}

module.exports = { loadRegistry, loadJsonFallback };
