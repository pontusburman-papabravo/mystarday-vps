#!/usr/bin/env node
/**
 * L1 changed-files test router.
 *
 *   npm run test:changed
 *   npm run test:changed -- --execute
 *   npm run test:changed -- --base origin/main --files src/routes/auth/login.js
 *   npm run test:changed -- --min-risk R3 --json
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeChangedFiles } from './lib/test-routing/route.mjs';
import { collectLocalExecutionTests, resolveExecutionOutcome } from './lib/test-routing/verification-plan.mjs';
import { runTests } from './lib/test-routing/run.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = {
    execute: false,
    json: false,
    base: undefined,
    files: [],
    minRisk: undefined,
    staged: true,
    unstaged: true,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute' || a === '--run') out.execute = true;
    else if (a === '--json') out.json = true;
    else if (a === '--base') out.base = argv[++i];
    else if (a === '--files') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) out.files.push(argv[++i]);
    } else if (a === '--min-risk') out.minRisk = argv[++i];
    else if (a === '--no-staged') out.staged = false;
    else if (a === '--no-unstaged') out.unstaged = false;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
test:changed — L1 changed-files router (config/test-routing.json)

  npm run test:changed
  npm run test:changed -- --execute
  npm run test:changed -- --base origin/main
  npm run test:changed -- --files path/a.js path/b.js
  npm run test:changed -- --min-risk R3 --json

Cumulative verification plan (L1+L2+L3+releaseReview) — not a single level.
Execute runs local L1/L2; exit 1=local fail, 2=L3/release still required, 0=all local done.
`);
}

function summarizePlan(plan) {
  const vp = plan.verificationPlan;
  console.log('L1 CHANGED-FILES ROUTER');
  console.log(`Changed: ${plan.changedFiles.length} file(s)`);
  console.log(`Domains: ${plan.domains.join(', ') || '(none)'}`);
  console.log(`Automatic risk: ${plan.automaticRisk} (${plan.automaticRiskTier || plan.automaticRisk})`);
  if (plan.manualRisk) console.log(`Manual risk: ${plan.manualRisk} (applied=${plan.manualApplied})`);
  console.log(`Final risk: ${plan.riskClass} → ${plan.recommendedLevel} (display)`);
  console.log('Verification plan:');
  console.log(`  L1 required=${vp.L1.required} tests=${vp.L1.tests.length}`);
  console.log(`  L2 required=${vp.L2.required} domains=${vp.L2.domains.join(',') || '(none)'} tests=${vp.L2.tests.length}${vp.L2.l2NotResolved ? ' L2_NOT_RESOLVED' : ''}`);
  console.log(`  L3 required=${vp.L3.required} command=${vp.L3.command}`);
  console.log(`  releaseReview=${vp.releaseReview}`);
  if (vp.independentReview) console.log(`  independentReview=true`);
  if (vp.rollbackConsideration) console.log(`  rollbackConsideration=true`);
  if (vp.dbInvariants) console.log(`  dbInvariants=true`);
  for (const r of plan.reason.slice(0, 12)) console.log(`  · ${r}`);
  if (plan.reason.length > 12) console.log(`  · … +${plan.reason.length - 12} more`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const plan = routeChangedFiles(ROOT, {
    baseRef: args.base,
    files: args.files.length ? args.files : undefined,
    minRisk: args.minRisk,
    staged: args.staged,
    unstaged: args.unstaged,
  });

  if (args.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    summarizePlan(plan);
  }

  if (!args.execute) {
    process.exit(0);
  }

  const localTests = collectLocalExecutionTests(plan.verificationPlan);
  const started = Date.now();
  let runResult = { ok: true, skipped: true, tests: [] };

  if (localTests.length) {
    runResult = runTests(ROOT, localTests);
  } else if (plan.verificationPlan.L1.required || plan.verificationPlan.L2.required) {
    runResult = { ok: true, skipped: false, tests: [], reason: 'no_local_tests_resolved' };
  }

  const outcome = resolveExecutionOutcome(plan.verificationPlan, runResult);
  const execution = {
    ...runResult,
    wallMs: Date.now() - started,
    localTests,
    outcome: outcome.status,
    l3Required: outcome.l3Required,
    releaseReviewRequired: outcome.releaseReviewRequired,
    l3Command: outcome.l3Command,
  };

  if (args.json) {
    console.log(JSON.stringify({ execution }, null, 2));
  } else {
    if (outcome.status === 'LOCAL_FAIL') {
      console.log(`\nExecution: LOCAL_FAIL (${execution.wallMs}ms)`);
    } else if (outcome.status === 'L3_REQUIRED') {
      console.log(`\nExecution: LOCAL_PASS (${execution.wallMs}ms) — L3_REQUIRED: run ${outcome.l3Command}`);
    } else if (outcome.status === 'RELEASE_REVIEW_REQUIRED') {
      console.log(`\nExecution: LOCAL_PASS (${execution.wallMs}ms) — RELEASE_REVIEW_REQUIRED`);
    } else {
      console.log(`\nExecution: LOCAL_PASS (${execution.wallMs}ms)`);
    }
  }

  process.exit(outcome.exitCode);
}

main();
