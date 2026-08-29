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
  const riskPathHints = [];
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
      if (bucket === 'critical' || bucket === 'shared_core' || bucket === 'unmapped') {
        riskPathHints.push(file);
      }
      if (bucket === 'non_critical') {
        // safe broaden — attach smoke only, no skip
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

  let recommendedLevel = riskToRecommendedLevel(riskClass, globalCore);

  // Unknown critical/shared/unmapped → never below L3 recommendation when any such file exists
  const hasUnsafeUnknown = unknownFiles.some((f) => {
    const b = classifyUnknownFile(f, globalCore.unknownPolicy);
    return b === 'critical' || b === 'shared_core' || b === 'unmapped';
  });
  if (hasUnsafeUnknown) {
    const floor = globalCore.unknownPolicy.unknownCriticalRecommendLevel || 'L3';
    recommendedLevel = maxLevel(recommendedLevel, floor);
    reasons.push(`unknown_fail_safe→${floor}`);
  }

  /** @type {string[]} */
  let tests = [];
  if (recommendedLevel === 'L1') {
    tests = [...(globalCore.l1SmokeTests || [])];
    for (const d of domainList) {
      // L1: cap per-domain to first 3 tests for speed
      tests.push(...(domainTestIndex[d] || []).slice(0, 3));
    }
  } else if (recommendedLevel === 'L2') {
    for (const d of domainList) {
      tests.push(...(domainTestIndex[d] || []));
    }
    if (!tests.length) {
      tests = [...(globalCore.l1SmokeTests || [])];
      reasons.push('L2_fallback_to_smoke_no_domain_tests');
    }
  } else {
    reasons.push(`L3_use:${entry.l3Command}`);
    tests = [];
  }

  tests = dedupeTests(tests);

  if (hasUnsafeUnknown && recommendedLevel !== 'L3') {
    reasons.push('NOTE:unsafe_unknown_present_consider_L3');
  }

  return {
    changedFiles,
    riskHints: [riskHints(riskClass, globalCore)],
    domains: domainList,
    recommendedLevel,
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

const LEVEL_RANK = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, L6: 6 };

/**
 * @param {string} a
 * @param {string} b
 */
function maxLevel(a, b) {
  return (LEVEL_RANK[b] || 0) > (LEVEL_RANK[a] || 0) ? b : a;
}

export { loadRoutingConfig, buildDomainTestIndex };
