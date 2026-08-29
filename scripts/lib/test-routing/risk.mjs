import { matchAnyGlob } from './config.mjs';

const RANK = { R0: 0, R1: 1, R2: 2, R3: 3 };

/**
 * @param {string} a
 * @param {string} b
 */
function maxRisk(a, b) {
  return (RANK[b] ?? 0) > (RANK[a] ?? 0) ? b : a;
}

/**
 * Normalize risk input (R0–R3 or LOW/MEDIUM/HIGH aliases).
 * @param {string} risk
 * @param {object} [globalCore]
 */
export function normalizeRiskClass(risk, globalCore = {}) {
  if (!risk) return null;
  const upper = String(risk).toUpperCase();
  if (RANK[upper] !== undefined) return upper;
  const semantics = globalCore.riskSemantics || {
    LOW: 'R0',
    MEDIUM: 'R1',
    HIGH: 'R3',
  };
  const mapped = semantics[upper];
  return mapped && RANK[mapped] !== undefined ? mapped : null;
}

/**
 * Suggest risk class from changed paths. Never auto-downgrades explicitMinRisk.
 * @param {string[]} changedFiles
 * @param {object} globalCore
 * @param {string[]} domains
 * @param {string} [explicitMinRisk]
 * @param {object} [unknownContext]
 * @returns {{ riskClass: string, automaticRisk: string, reasons: string[] }}
 */
export function classifyRisk(changedFiles, globalCore, domains, explicitMinRisk, unknownContext = {}) {
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

  const policy = globalCore.unknownPolicy || {};
  if (unknownContext.hasUnsafeUnknown) {
    const unknownRisk = policy.unknownUnmappedRiskClass
      || policy.unknownSharedCoreRiskClass
      || policy.unknownCriticalRiskClass
      || 'R3';
    risk = maxRisk(risk, unknownRisk);
    reasons.push(`unknown_fail_safe→${unknownRisk}`);
  }

  const automaticRisk = risk;

  if (explicitMinRisk) {
    const normalized = normalizeRiskClass(explicitMinRisk, globalCore);
    if (normalized) {
      const before = risk;
      risk = maxRisk(risk, normalized);
      if (risk !== before) reasons.push(`explicit_min_risk:${normalized}`);
    }
  }

  return { riskClass: risk, automaticRisk, reasons };
}

/**
 * Resolve final risk — manual may raise, never lower automatic.
 * @param {string} automaticRisk
 * @param {string} [manualRisk]
 * @param {object} [globalCore]
 * @returns {{ finalRisk: string, manualApplied: boolean, manualRejected: boolean }}
 */
export function resolveFinalRisk(automaticRisk, manualRisk, globalCore = {}) {
  const normalizedManual = normalizeRiskClass(manualRisk, globalCore);
  if (!normalizedManual) {
    return { finalRisk: automaticRisk, manualApplied: false, manualRejected: false };
  }
  const finalRisk = maxRisk(automaticRisk, normalizedManual);
  return {
    finalRisk,
    manualApplied: finalRisk !== automaticRisk,
    manualRejected: RANK[normalizedManual] < RANK[automaticRisk],
  };
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
    independentReview: Boolean(spec?.independentReview),
    rollbackConsideration: Boolean(spec?.rollbackConsideration),
    dbInvariants: Boolean(spec?.dbInvariants),
  };
}

/**
 * Human-readable risk tier (LOW/MEDIUM/HIGH) for summaries.
 * @param {string} riskClass
 */
export function riskClassToTier(riskClass) {
  if (riskClass === 'R0') return 'LOW';
  if (riskClass === 'R3') return 'HIGH';
  if (riskClass === 'R2') return 'MEDIUM';
  return 'MEDIUM';
}
