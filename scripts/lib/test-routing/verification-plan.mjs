import { dedupeTests } from './route.mjs';

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
    hasUnsafeUnknown,
  } = params;

  const spec = globalCore.riskClasses?.[riskClass] || {};
  const defaultLevels = new Set(spec.defaultVerification || ['L1']);

  const l1Tests = [...(globalCore.l1SmokeTests || [])];
  for (const d of domainList) {
    l1Tests.push(...(domainTestIndex[d] || []).slice(0, 3));
  }

  const l2Tests = [];
  for (const d of domainList) {
    l2Tests.push(...(domainTestIndex[d] || []));
  }

  const l1Required = defaultLevels.has('L1');
  const l2Required = defaultLevels.has('L2');
  const l3Required = defaultLevels.has('L3') || hasUnsafeUnknown;
  const releaseReview = defaultLevels.has('RELEASE_REVIEW');

  let l2NotResolved = false;
  if (l2Required && dedupeTests(l2Tests).length === 0) {
    l2NotResolved = true;
  }

  const plan = {
    L1: {
      required: l1Required,
      tests: dedupeTests(l1Required ? l1Tests : (globalCore.l1SmokeTests || [])),
    },
    L2: {
      required: l2Required,
      domains: [...domainList],
      tests: dedupeTests(l2Tests),
      ...(l2NotResolved ? { l2NotResolved: true } : {}),
    },
    L3: {
      required: l3Required,
      command: entry.l3Command,
    },
    releaseReview,
  };

  if (l2NotResolved && l2Required) {
    plan.L3.required = true;
  }

  return plan;
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
