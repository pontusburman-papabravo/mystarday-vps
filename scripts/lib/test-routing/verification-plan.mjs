import { dedupeTests } from './route.mjs';
import { riskHints } from './risk.mjs';

/**
 * Build cumulative verification plan from risk class and routing context.
 * @param {object} params
 */
export function buildVerificationPlan(params) {
  const {
    riskClass,
    globalCore,
    entry,
    domainList,
    domainTestIndex,
    domainL1Index,
    hasUnsafeUnknown,
    classifierFailed,
  } = params;

  if (classifierFailed) {
    return failClosedPlan(entry, 'classifier_failure', globalCore);
  }

  const spec = globalCore.riskClasses?.[riskClass] || {};
  const defaultLevels = new Set(spec.defaultVerification || ['L1']);
  const hints = riskHints(riskClass, globalCore);

  const l1Tests = [...(globalCore.l1SmokeTests || [])];
  for (const d of domainList) {
    const explicit = domainL1Index?.[d] || [];
    if (explicit.length) {
      l1Tests.push(...explicit);
    }
  }

  const l2Tests = [];
  for (const d of domainList) {
    l2Tests.push(...(domainTestIndex[d] || []));
  }

  const l1Required = defaultLevels.has('L1');
  const l2Required = defaultLevels.has('L2');
  let l3Required = defaultLevels.has('L3') || hasUnsafeUnknown;
  const releaseReview = defaultLevels.has('RELEASE_REVIEW');

  const dedupedL1 = dedupeTests(l1Required ? l1Tests : (globalCore.l1SmokeTests || []));
  const dedupedL2 = dedupeTests(l2Tests);

  let l2NotResolved = false;
  if (l2Required && dedupedL2.length === 0) {
    l2NotResolved = true;
  }

  let l1NotResolved = false;
  if (l1Required && dedupedL1.length === 0) {
    l1NotResolved = true;
  }

  const isHigh = riskClass === 'R3';
  if (isHigh && l1Required && l1NotResolved) {
    return failClosedPlan(entry, 'high_missing_l1', globalCore);
  }
  if (isHigh && l2Required && l2NotResolved) {
    return failClosedPlan(entry, 'high_missing_l2', globalCore);
  }

  if (l2NotResolved && l2Required) {
    l3Required = true;
  }

  const plan = {
    L1: {
      required: l1Required,
      tests: dedupedL1,
      ...(l1NotResolved ? { l1NotResolved: true } : {}),
    },
    L2: {
      required: l2Required,
      domains: [...domainList],
      tests: dedupedL2,
      ...(l2NotResolved ? { l2NotResolved: true } : {}),
    },
    L3: {
      required: l3Required,
      command: entry.l3Command,
    },
    releaseReview,
    independentReview: hints.independentReview,
    rollbackConsideration: hints.rollbackConsideration,
    dbInvariants: hints.dbInvariants,
  };

  return plan;
}

/**
 * Fail-closed plan: escalate to full L3 gate.
 * @param {object} entry
 * @param {string} reason
 */
function failClosedPlan(entry, reason, globalCore = {}) {
  const smoke = globalCore.l1SmokeTests || [];
  return {
    L1: { required: true, tests: [...smoke], l1NotResolved: smoke.length === 0, failClosed: true },
    L2: { required: true, domains: [], tests: [], l2NotResolved: true, failClosed: true },
    L3: { required: true, command: entry.l3Command, failClosed: true },
    releaseReview: true,
    independentReview: true,
    rollbackConsideration: true,
    dbInvariants: true,
    failClosed: true,
    failClosedReason: reason,
  };
}

/**
 * Tests to run locally before L3 (deduplicated L1 + L2 when required).
 * @param {object} verificationPlan
 */
export function collectLocalExecutionTests(verificationPlan) {
  const tests = [];
  if (verificationPlan.L1?.required) {
    tests.push(...(verificationPlan.L1.tests || []));
  }
  if (verificationPlan.L2?.required) {
    tests.push(...(verificationPlan.L2.tests || []));
  }
  return dedupeTests(tests);
}

/**
 * Determine exit code and status after local execution.
 * @param {object} verificationPlan
 * @param {{ ok: boolean }} runResult
 */
export function resolveExecutionOutcome(verificationPlan, runResult) {
  if (runResult && runResult.ok === false) {
    return {
      status: 'LOCAL_FAIL',
      exitCode: 1,
      l3Required: false,
      releaseReviewRequired: false,
    };
  }

  const l3Required = Boolean(verificationPlan.L3?.required);
  const releaseReviewRequired = Boolean(verificationPlan.releaseReview);

  if (l3Required || releaseReviewRequired) {
    return {
      status: l3Required ? 'L3_REQUIRED' : 'RELEASE_REVIEW_REQUIRED',
      exitCode: 2,
      l3Required,
      releaseReviewRequired,
      l3Command: verificationPlan.L3?.command,
    };
  }

  return {
    status: 'LOCAL_PASS',
    exitCode: 0,
    l3Required: false,
    releaseReviewRequired: false,
  };
}

/**
 * Highest display level for backward compatibility.
 * @param {object} verificationPlan
 */
export function verificationPlanToRecommendedLevel(verificationPlan) {
  if (verificationPlan.L3?.required) return 'L3';
  if (verificationPlan.L2?.required) return 'L2';
  if (verificationPlan.L1?.required) return 'L1';
  return 'L1';
}
