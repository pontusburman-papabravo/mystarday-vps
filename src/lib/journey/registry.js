'use strict';

const path = require('path');
const fs = require('fs');
const { experiencePackIdForLocale, resolveFamilyLocale } = require('../locale');
const EN_TRANSLATIONS = require('../../../config/journey-en-GB-translations');

function loadJsonFallback(locale = 'sv-SE') {
  try {
    const p = path.join(__dirname, '../../../config/journey-experience-registry.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (resolveFamilyLocale(locale) === 'en-GB') {
      return translateRegistryFallback(data);
    }
    return data;
  } catch {
    return { version: '2026-06-28-v1', phases: {} };
  }
}

/** Full en-GB fallback when DB registry empty — mirrors config/journey-en-GB-translations.js (migrations 0003+0004). */
function translateRegistryFallback(svRegistry) {
  const en = JSON.parse(JSON.stringify(svRegistry));
  for (const phase of Object.values(en.phases || {})) {
    for (const [experienceKey, exp] of Object.entries(phase)) {
      const tr = EN_TRANSLATIONS[experienceKey];
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
