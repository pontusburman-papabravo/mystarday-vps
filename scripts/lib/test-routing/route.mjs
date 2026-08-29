import {
  buildDomainTestIndex,
  classifyUnknownFile,
  loadRoutingConfig,
  mapFileToDomains,
} from './config.mjs';
import { collectChangedFiles } from './changed-files.mjs';
import {
  classifyRisk,
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
  const { entry, globalCore, overlay } = loadRoutingConfig(root, options.configPath);
  const domains = overlay.domains || {};
  const changedFiles = collectChangedFiles(root, {
    baseRef: options.baseRef ?? entry.defaultBaseRef,
    staged: options.staged,
    unstaged: options.unstaged,
    files: options.files,
  });

  const domainTestIndex = buildDomainTestIndex(root, domains);
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
  const { riskClass, reasons: riskReasons } = classifyRisk(
    changedFiles,
    globalCore,
    domainList,
    options.minRisk,
  );
  reasons.push(...riskReasons);

  const hasUnsafeUnknown = unknownFiles.some((f) => {
    const b = classifyUnknownFile(f, globalCore.unknownPolicy);
    return b === 'critical' || b === 'shared_core' || b === 'unmapped';
  });
  if (hasUnsafeUnknown) {
    reasons.push(`unknown_fail_safe→${globalCore.unknownPolicy.unknownCriticalRecommendLevel || 'L3'}`);
  }

  const verificationPlan = buildVerificationPlan({
    riskClass,
    globalCore,
    entry,
    domainList,
    domainTestIndex,
    hasUnsafeUnknown,
  });

  if (verificationPlan.L2.l2NotResolved) {
    reasons.push('L2_NOT_RESOLVED');
  }

  const recommendedLevel = verificationPlanToRecommendedLevel(verificationPlan);
  const tests = collectLocalExecutionTests(verificationPlan);

  return {
    changedFiles,
    riskClass,
    riskHints: [riskHints(riskClass, globalCore)],
    domains: domainList,
    recommendedLevel,
    verificationPlan,
    tests,
    reason: reasons,
    meta: {
      unknownFiles,
      riskClass,
      l3Command: entry.l3Command,
      lintCommand: entry.lintCommand,
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

  const index = buildDomainTestIndex(root, domains);
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
