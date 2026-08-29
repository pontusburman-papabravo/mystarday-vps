'use strict';

/**
 * Market-aware helpers for release-compliance scanners.
 * Closed-market surfaces are NOT_APPLICABLE — they must not block a release
 * for markets that are already live (e.g. SE) when UK is still gated off.
 */

const path = require('node:path');
const { createRequire } = require('node:module');
const { compileRegexList } = require('./load-config.cjs');

function loadMarketGateDefaults(repoRoot) {
  try {
    const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
    const marketRegion = requireFromRepo(path.join(repoRoot, 'src/lib/market-region.js'));
    return marketRegion.GATE_DEFAULTS || {};
  } catch {
    return null;
  }
}

/**
 * Returns closed-market surface rules where the gate is currently false.
 * Each rule: { gateKey, pathPatterns: RegExp[] }
 */
function getClosedMarketSurfaces(repoRoot, config) {
  const gates = loadMarketGateDefaults(repoRoot);
  if (!gates) return [];

  const surfaces = config.closedMarketSurfaces || [];
  const out = [];
  for (const surface of surfaces) {
    if (gates[surface.gateKey] !== false) continue;
    out.push({
      gateKey: surface.gateKey,
      pathPatterns: compileRegexList(surface.pathPatterns || []),
    });
  }
  return out;
}

function matchClosedMarketSurface(filePath, closedSurfaces) {
  for (const surface of closedSurfaces) {
    for (const re of surface.pathPatterns) {
      if (re.test(filePath)) {
        return { closed: true, gateKey: surface.gateKey, reason: `market closed (${surface.gateKey}=false)` };
      }
    }
  }
  return { closed: false };
}

module.exports = { loadMarketGateDefaults, getClosedMarketSurfaces, matchClosedMarketSurface };
