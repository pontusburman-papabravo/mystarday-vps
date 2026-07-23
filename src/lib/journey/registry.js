'use strict';

const path = require('path');
const fs = require('fs');
const { experiencePackIdForLocale, resolveFamilyLocale } = require('../locale');

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

/** Minimal en-GB fallback when DB registry empty — key experiences only. */
function translateRegistryFallback(svRegistry) {
  const en = JSON.parse(JSON.stringify(svRegistry));
  const map = {
    'Låt barnet testa sin rutin': 'Let your child try their routine',
    'Första stjärnan är klar!': 'First star done!',
    'God morgon': 'Good morning',
  };
  for (const phase of Object.values(en.phases || {})) {
    for (const exp of Object.values(phase)) {
      if (map[exp.headline]) exp.headline = map[exp.headline];
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
