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

Output: JSON plan by default with --json, else human summary.
Unknown critical/shared paths never map to "no test needed".
`);
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
    console.log('L1 CHANGED-FILES ROUTER');
    console.log(`Changed: ${plan.changedFiles.length} file(s)`);
    console.log(`Domains: ${plan.domains.join(', ') || '(none)'}`);
    console.log(`Risk: ${plan.meta.riskClass} → ${plan.recommendedLevel}`);
    console.log(`Tests: ${plan.tests.length} file(s)`);
    if (plan.recommendedLevel === 'L3') {
      console.log(`L3: run ${plan.meta.l3Command}`);
    }
    for (const r of plan.reason.slice(0, 12)) console.log(`  · ${r}`);
    if (plan.reason.length > 12) console.log(`  · … +${plan.reason.length - 12} more`);
  }

  if (!args.execute) {
    process.exit(0);
  }

  if (plan.recommendedLevel === 'L3') {
    console.error(`Execute skipped: recommendedLevel=L3 — run ${plan.meta.l3Command}`);
    process.exit(2);
  }

  const started = Date.now();
  const result = runTests(ROOT, plan.tests);
  const payload = { ...plan, execution: { ...result, wallMs: Date.now() - started } };
  if (args.json) console.log(JSON.stringify(payload.execution, null, 2));
  else {
    console.log(`\nExecution: ${result.ok ? 'PASS' : 'FAIL'} (${payload.execution.wallMs}ms)`);
  }
  process.exit(result.ok ? 0 : 1);
}

main();
