'use strict';

const path = require('path');
const fs = require('fs');

function loadJsonFallback() {
  try {
    const p = path.join(__dirname, '../../../config/journey-experience-registry.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { version: '2026-06-28-v1', phases: {} };
  }
}

async function loadRegistry({ useDb = false } = {}) {
  if (useDb) {
    try {
      const journeyRegistry = require('../../../db/journey-registry');
      const dbRegistry = await journeyRegistry.getActiveRegistry();
      if (dbRegistry) return dbRegistry;
    } catch (err) {
      console.error('[journey/registry] DB load failed:', err.message);
    }
  }
  return loadJsonFallback();
}

module.exports = { loadRegistry, loadJsonFallback };
