#!/usr/bin/env node
/**
 * L2 domain gate — run tests for one or more domains with deduplication.
 *
 *   npm run test:domain -- auth-security
 *   npm run test:domain -- auth-security payments-iap
 *   npm run test:domain -- --list
 *   npm run test:domain -- planning-schedule --json
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRoutingConfig, resolveDomainGate } from './lib/test-routing/route.mjs';
import { runDomainGateWithTiming } from './lib/test-routing/run.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { domains: [], json: false, planOnly: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--plan' || a === '--dry-run') out.planOnly = true;
    else if (a === '--list') out.list = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (!a.startsWith('--')) out.domains.push(a);
  }
  return out;
}

function printHelp() {
  console.log(`
test:domain — L2 domain gate

  npm run test:domain -- auth-security
  npm run test:domain -- auth-security payments-iap
  npm run test:domain -- --list
  npm run test:domain -- child-experience --plan

Domains: auth-security, payments-iap, i18n-markets-legal, planning-schedule,
         child-experience, parent-experience, db-migrations, native-platform
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const { overlay } = loadRoutingConfig(ROOT);
  if (args.list) {
    const ids = Object.keys(overlay.domains || {}).sort();
    if (args.json) console.log(JSON.stringify(ids, null, 2));
    else ids.forEach((id) => console.log(id));
    process.exit(0);
  }

  if (!args.domains.length) {
    console.error('Provide at least one domain id. Use --list to see options.');
    process.exit(2);
  }

  let gate;
  try {
    gate = resolveDomainGate(ROOT, args.domains);
  } catch (err) {
    if (err.code === 'UNKNOWN_DOMAIN') {
      console.error(err.message);
      console.error(`Known: ${err.knownDomains.join(', ')}`);
      process.exit(2);
    }
    throw err;
  }

  const summary = {
    domains: gate.domains,
    testCount: gate.tests.length,
    dedupedFrom: gate.dedupedCount,
    perDomainCounts: Object.fromEntries(
      Object.entries(gate.perDomain).map(([k, v]) => [k, v.length]),
    ),
    tests: gate.tests,
  };

  if (args.json && args.planOnly) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  if (!args.json) {
    console.log('L2 DOMAIN GATE');
    console.log(`Domains: ${gate.domains.join(', ')}`);
    console.log(`Tests: ${gate.tests.length} (deduped ${gate.dedupedCount})`);
    for (const [d, n] of Object.entries(summary.perDomainCounts)) {
      console.log(`  ${d}: ${n}`);
    }
  }

  if (args.planOnly) process.exit(0);

  const timingResult = runDomainGateWithTiming(ROOT, gate.perDomain);
  const output = { ...summary, timing: timingResult.timing, wallMs: timingResult.wallMs, ok: timingResult.ok };

  if (args.json) console.log(JSON.stringify(output, null, 2));
  else {
    console.log(`\nTiming (wall-clock per domain):`);
    for (const [d, t] of Object.entries(timingResult.timing)) {
      console.log(`  ${d}: ${t.wallMs}ms (${t.testCount} tests) ${t.ok ? 'PASS' : 'FAIL'}`);
    }
    console.log(`Total: ${timingResult.wallMs}ms — ${timingResult.ok ? 'PASS' : 'FAIL'}`);
  }

  process.exit(timingResult.ok ? 0 : 1);
}

main();
