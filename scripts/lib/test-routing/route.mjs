import {
  buildDomainTestIndex,
  classifyUnknownFile,
  loadRoutingConfig,
  mapFileToDomains,
} from './config.mjs';
import { collectChangedFiles } from './changed-files.mjs';
import {
  classifyRisk,
  resolveFinalRisk,
  riskClassToTier,
  riskHints,
  riskToRecommendedLevel,
} from './risk.mjs';
import {
  buildVerificationPlan,
  collectLocalExecutionTests,
  verificationPlanToRecommendedLevel,
} from './verification-plan.mjs';

/**
 * Route changed files to domains, tests, and verification level.
 * @param {string} root
 * @param {object} [options]
 */
export function routeChangedFiles(root, options = {}) {
  let entry;
  let globalCore;
  let overlay;

  try {
    ({ entry, globalCore, overlay } = loadRoutingConfig(root, options.configPath));
  } catch (err) {
    return buildClassifierFailureResult(root, options, err);
  }

  const domains = overlay.domains || {};
  let changedFiles;

  try {
    changedFiles = collectChangedFiles(root, {
      baseRef: options.baseRef ?? entry.defaultBaseRef,
      baseSha: options.baseSha,
      headSha: options.headSha,
      staged: options.staged,
      unstaged: options.unstaged,
      files: options.files,
    });
  } catch (err) {
    return buildClassifierFailureResult(root, options, err);
  }

  const { index: domainTestIndex, l1Index: domainL1Index } = buildDomainTestIndex(root, domains);
  const domainSet = new Set();
  const reasons = [];
  const unknownFiles = [];

  for (const file of changedFiles) {
    const matched = mapFileToDomains(file, domains);
    if (matched.length) {
      matched.forEach((d) => domainSet.add(d));
      reasons.push(`known:${file}→${matched.join('+')}`);
    } else {
      unknownFiles.push(file);
      const bucket = classifyUnknownFile(file, globalCore.unknownPolicy);
      reasons.push(`unknown:${file}→${bucket}`);
      if (bucket === 'non_critical') {
        reasons.push(`safe_broaden:${file}`);
      }
    }
  }

  const domainList = [...domainSet].sort();
  const hasUnsafeUnknown = unknownFiles.some((f) => {
    const b = classifyUnknownFile(f, globalCore.unknownPolicy);
    return b === 'critical' || b === 'shared_core' || b === 'unmapped';
  });

  if (hasUnsafeUnknown) {
    reasons.push(`unknown_fail_safe→${globalCore.unknownPolicy.unknownCriticalRecommendLevel || 'L3'}`);
  }

  const minRisk = options.minRisk ?? options.manualRisk;
  const { riskClass: automaticRisk, reasons: riskReasons } = classifyRisk(
    changedFiles,
    globalCore,
    domainList,
    undefined,
    { hasUnsafeUnknown },
  );
  reasons.push(...riskReasons);

  const { finalRisk, manualApplied, manualRejected } = resolveFinalRisk(
    automaticRisk,
    minRisk,
    globalCore,
  );
  if (manualApplied) reasons.push(`manual_risk_raise:${minRisk}→${finalRisk}`);
  if (manualRejected) reasons.push(`manual_risk_rejected_lower_than_auto:${minRisk}<${automaticRisk}`);

  const verificationPlan = buildVerificationPlan({
    riskClass: finalRisk,
    globalCore,
    entry,
    domainList,
    domainTestIndex,
    domainL1Index,
    hasUnsafeUnknown,
    classifierFailed: false,
  });

  if (verificationPlan.L2.l2NotResolved) {
    reasons.push('L2_NOT_RESOLVED');
  }
  if (verificationPlan.L1.l1NotResolved) {
    reasons.push('L1_NOT_RESOLVED');
  }
  if (verificationPlan.failClosed) {
    reasons.push(`FAIL_CLOSED:${verificationPlan.failClosedReason}`);
  }

  const recommendedLevel = verificationPlanToRecommendedLevel(verificationPlan);
  const tests = collectLocalExecutionTests(verificationPlan);

  return {
    changedFiles,
    automaticRisk,
    riskClass: finalRisk,
    finalRisk,
    riskTier: riskClassToTier(finalRisk),
    automaticRiskTier: riskClassToTier(automaticRisk),
    manualRisk: minRisk || null,
    manualApplied,
    manualRejected,
    riskHints: [riskHints(finalRisk, globalCore)],
    domains: domainList,
    recommendedLevel,
    verificationPlan,
    tests,
    reason: reasons,
    escalationReason: buildEscalationReason({
      hasUnsafeUnknown,
      verificationPlan,
      manualApplied,
      automaticRisk,
      finalRisk,
    }),
    meta: {
      unknownFiles,
      automaticRisk,
      finalRisk,
      riskClass: finalRisk,
      l3Command: entry.l3Command,
      lintCommand: entry.lintCommand,
    },
  };
}

/**
 * @param {object} params
 */
function buildEscalationReason(params) {
  const parts = [];
  if (params.hasUnsafeUnknown) parts.push('unknown_path_fail_safe');
  if (params.verificationPlan.failClosed) {
    parts.push(params.verificationPlan.failClosedReason);
  }
  if (params.verificationPlan.L2?.l2NotResolved) parts.push('l2_not_resolved');
  if (params.manualApplied) parts.push('manual_risk_raise');
  if (params.finalRisk !== params.automaticRisk) {
    parts.push(`auto:${params.automaticRisk}→final:${params.finalRisk}`);
  }
  return parts.length ? parts.join('; ') : null;
}

/**
 * @param {string} root
 * @param {object} options
 * @param {Error} err
 */
function buildClassifierFailureResult(root, options, err) {
  let entry = { l3Command: 'npm run test:gate', lintCommand: 'npm run lint:public' };
  try {
    ({ entry } = loadRoutingConfig(root, options.configPath));
  } catch {
    // use defaults
  }

  const verificationPlan = buildVerificationPlan({
    riskClass: 'R3',
    globalCore: { riskClasses: { R3: { defaultVerification: ['L1', 'L2', 'L3', 'RELEASE_REVIEW'], independentReview: true, rollbackConsideration: true, dbInvariants: true } } },
    entry,
    domainList: [],
    domainTestIndex: {},
    domainL1Index: {},
    hasUnsafeUnknown: true,
    classifierFailed: true,
  });

  return {
    changedFiles: options.files || [],
    automaticRisk: 'R3',
    riskClass: 'R3',
    finalRisk: 'R3',
    riskTier: 'HIGH',
    automaticRiskTier: 'HIGH',
    manualRisk: null,
    manualApplied: false,
    manualRejected: false,
    riskHints: [],
    domains: [],
    recommendedLevel: 'L3',
    verificationPlan,
    tests: [],
    reason: [`classifier_failure:${err.message}`],
    escalationReason: `classifier_failure:${err.message}`,
    meta: {
      unknownFiles: [],
      automaticRisk: 'R3',
      finalRisk: 'R3',
      l3Command: entry.l3Command,
      lintCommand: entry.lintCommand,
      classifierFailed: true,
    },
  };
}

/**
 * Resolve tests for one or more domains with deduplication.
 * @param {string} root
 * @param {string[]} domainIds
 * @param {object} [options]
 */
export function resolveDomainGate(root, domainIds, options = {}) {
  const { overlay } = loadRoutingConfig(root, options.configPath);
  const domains = overlay.domains || {};
  const unknown = domainIds.filter((d) => !domains[d]);
  if (unknown.length) {
    const err = new Error(`Unknown domain(s): ${unknown.join(', ')}`);
    err.code = 'UNKNOWN_DOMAIN';
    err.knownDomains = Object.keys(domains).sort();
    throw err;
  }

  const { index } = buildDomainTestIndex(root, domains);
  const perDomain = {};
  const all = [];
  for (const id of domainIds) {
    perDomain[id] = index[id] || [];
    all.push(...perDomain[id]);
  }
  const tests = dedupeTests(all);
  return { domains: domainIds, perDomain, tests, dedupedCount: all.length - tests.length };
}

/**
 * @param {string[]} tests
 */
export function dedupeTests(tests) {
  return [...new Set(tests)].sort();
}

export { loadRoutingConfig, buildDomainTestIndex };
