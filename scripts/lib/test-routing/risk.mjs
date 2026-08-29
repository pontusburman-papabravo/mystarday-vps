import { matchAnyGlob } from './config.mjs';

/**
 * Suggest risk class from changed paths. Never auto-downgrades explicitMinRisk.
 * @param {string[]} changedFiles
 * @param {object} globalCore
 * @param {string[]} domains
 * @param {string} [explicitMinRisk]
 * @returns {{ riskClass: string, reasons: string[] }}
 */
export function classifyRisk(changedFiles, globalCore, domains, explicitMinRisk) {
  const reasons = [];
  let risk = 'R1';

  const allR0 = changedFiles.length > 0 && changedFiles.every((f) =>
    matchAnyGlob(f, globalCore.r0PathGlobs || []),
  );
  if (allR0) {
    risk = 'R0';
    reasons.push('all_changed_files_match_R0_path_globs');
  }

  const r3Hit = changedFiles.filter((f) => matchAnyGlob(f, globalCore.r3PathGlobs || []));
  if (r3Hit.length) {
    risk = maxRisk(risk, 'R3');
    reasons.push(`r3_paths:${r3Hit.join(',')}`);
  }

  if (domains.length >= (globalCore.r2MinDomains || 2)) {
    risk = maxRisk(risk, 'R2');
    reasons.push(`multi_domain:${domains.join('+')}`);
  }

  if (explicitMinRisk) {
    const before = risk;
    risk = maxRisk(risk, explicitMinRisk);
    if (risk !== before) reasons.push(`explicit_min_risk:${explicitMinRisk}`);
  }

  // Unknown unmapped non-docs → broaden to R2 safe default
  return { riskClass: risk, reasons };
}

const RANK = { R0: 0, R1: 1, R2: 2, R3: 3 };

/**
 * @param {string} a
 * @param {string} b
 */
function maxRisk(a, b) {
  return (RANK[b] ?? 0) > (RANK[a] ?? 0) ? b : a;
}

/**
 * Map risk class to recommended test level.
 * @param {string} riskClass
 * @param {object} globalCore
 */
export function riskToRecommendedLevel(riskClass, globalCore) {
  const spec = globalCore.riskClasses?.[riskClass];
  const levels = spec?.defaultVerification || ['L1'];
  if (levels.includes('RELEASE_REVIEW')) return 'L3';
  if (levels.includes('L3')) return 'L3';
  if (levels.includes('L2')) return 'L2';
  return 'L1';
}

/**
 * @param {string} riskClass
 * @param {object} globalCore
 */
export function riskHints(riskClass, globalCore) {
  const spec = globalCore.riskClasses?.[riskClass];
  return {
    riskClass,
    label: spec?.label || riskClass,
    defaultVerification: spec?.defaultVerification || [],
  };
}
