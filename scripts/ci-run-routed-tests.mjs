#!/usr/bin/env node
/**
 * Run routed L1 or L2 tests in CI (after ci-test-route.mjs classification).
 *
 *   node scripts/ci-run-routed-tests.mjs --level L1
 *   node scripts/ci-run-routed-tests.mjs --level L2
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeChangedFiles } from './lib/test-routing/route.mjs';
import { runTests } from './lib/test-routing/run.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { level: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--level') out.level = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') out.help = true;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.level) {
    console.log('Usage: node scripts/ci-run-routed-tests.mjs --level L1|L2');
    process.exit(args.help ? 0 : 2);
  }

  const baseSha = process.env.GITHUB_BASE_SHA || process.env.TEST_ROUTING_BASE_SHA;
  const headSha = process.env.GITHUB_HEAD_SHA || process.env.TEST_ROUTING_HEAD_SHA || 'HEAD';

  const plan = routeChangedFiles(ROOT, {
    baseSha: baseSha || undefined,
    headSha: baseSha ? headSha : undefined,
    baseRef: baseSha ? undefined : 'origin/main',
    manualRisk: process.env.TEST_ROUTING_MANUAL_RISK,
    staged: !baseSha,
    unstaged: !baseSha,
  });

  const vp = plan.verificationPlan;
  let tests = [];
  if (args.level === 'L1' && vp.L1?.required) tests = vp.L1.tests || [];
  if (args.level === 'L2' && vp.L2?.required) tests = vp.L2.tests || [];

  if (!tests.length) {
    console.log(`No ${args.level} tests to run`);
    process.exit(0);
  }

  const result = runTests(ROOT, tests);
  process.exit(result.ok ? 0 : 1);
}

main();
