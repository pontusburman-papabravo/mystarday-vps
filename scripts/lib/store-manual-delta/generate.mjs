import fs from 'node:fs';
import path from 'node:path';
import { matchAnyGlob, matchGlob } from '../test-routing/config.mjs';

/**
 * @param {string} root
 * @param {object} options
 */
export function generateStoreManualDelta(root, options = {}) {
  const configPath = path.join(root, 'config/store-manual-delta.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const changedPaths = (options.changedPaths || []).map((p) => p.replace(/\\/g, '/'));
  const profile = options.profile || 'both';
  const platforms = profile === 'both' ? ['apple', 'google'] : [profile];

  const gateA = loadJsonIfExists(root, options.gateAPath || 'artifacts/pre-public-release-gate.json');
  const gateBC = loadJsonIfExists(root, options.gateBCPath || 'artifacts/release-compliance-gate.json');

  const hasNativeChange = changedPaths.some((p) =>
    matchAnyGlob(p, config.nativePathGlobs || []),
  );
  const nativeRelease = options.nativeRelease === true || hasNativeChange;

  const selected = [];
  const reasons = [];

  for (const item of config.items) {
    if (!platforms.includes(item.platform)) continue;
    const { include, why } = shouldIncludeItem(item, changedPaths, { nativeRelease, gateA, gateBC });
    if (include) {
      selected.push(item);
      reasons.push({ id: item.id, why });
    }
  }

  const unknownPaths = changedPaths.filter((p) => !isCoveredByAnyItem(p, config.items));
  const needsManualReview = unknownPaths.length > 0 || selected.some((i) => i.triggers?.alwaysManual);

  const byPlatform = {};
  for (const p of platforms) {
    const items = selected.filter((i) => i.platform === p);
    byPlatform[p] = items.length
      ? items.map((i) => ({ id: i.id, label: i.label, section: i.section }))
      : null;
  }

  return {
    profile,
    changedPaths,
    nativeRelease,
    platforms: byPlatform,
    actionCount: selected.length,
    items: selected.map((i) => ({ id: i.id, platform: i.platform, label: i.label, section: i.section })),
    reasons,
    unknownPaths,
    status: needsManualReview || unknownPaths.length ? 'MANUAL_REVIEW_REQUIRED' : 'DELTA_READY',
    checklistSource: config.checklistSource,
    gateAStatus: gateA?.decision || gateA?.overallStatus || 'NOT_VERIFIED',
    gateBCStatus: gateBC?.policyGate || gateBC?.overallStatus || 'NOT_VERIFIED',
  };
}

/**
 * @param {object} item
 * @param {string[]} changedPaths
 * @param {object} ctx
 */
function shouldIncludeItem(item, changedPaths, ctx) {
  const t = item.triggers || {};
  if (t.alwaysOnNativeRelease && ctx.nativeRelease) {
    return { include: true, why: 'native_release' };
  }
  if (!changedPaths.length && !ctx.nativeRelease) {
    return { include: false, why: 'no_changes' };
  }
  if (t.paths?.length) {
    const hit = changedPaths.filter((p) => t.paths.some((g) => matchGlob(p, g)));
    if (hit.length) return { include: true, why: `paths:${hit.join(',')}` };
  }
  if (t.alwaysManual && changedPaths.length) {
    return { include: true, why: 'always_manual_with_changes' };
  }
  return { include: false, why: 'no_trigger' };
}

/**
 * @param {string} p
 * @param {object[]} items
 */
function isCoveredByAnyItem(p, items) {
  return items.some((item) => (item.triggers?.paths || []).some((g) => matchGlob(p, g)));
}

/**
 * @param {string} root
 * @param {string} rel
 */
function loadJsonIfExists(root, rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Human-readable report for terminal output.
 * @param {object} delta
 */
export function formatStoreManualDelta(delta) {
  const lines = ['STORE MANUAL DELTA (L6)', ''];
  for (const [platform, items] of Object.entries(delta.platforms)) {
    const title = platform.toUpperCase();
    if (!items?.length) {
      lines.push(`${title}`, 'NOT_APPLICABLE', '');
      continue;
    }
    lines.push(`${title} — ${items.length} MANUAL ACTION(S)`, '');
    for (const item of items) {
      lines.push(`[ ] ${item.label}`);
    }
    lines.push('');
  }
  if (delta.unknownPaths?.length) {
    lines.push('UNKNOWN PATHS — MANUAL REVIEW REQUIRED');
    for (const p of delta.unknownPaths) lines.push(`  · ${p}`);
    lines.push('');
  }
  lines.push(`Status: ${delta.status}`);
  lines.push(`Source: ${delta.checklistSource}`);
  return lines.join('\n');
}
