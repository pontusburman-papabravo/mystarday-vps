#!/usr/bin/env node
import fs from 'node:fs';
import { compareDbSnapshots } from './lib/compare-snapshots.mjs';

function parseArgs(argv) {
  const out = { before: null, after: null, allowMigrationDrift: true };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--before') out.before = argv[++i];
    else if (argv[i] === '--after') out.after = argv[++i];
    else if (argv[i] === '--strict-migrations') out.allowMigrationDrift = false;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.before || !args.after) {
    console.error('Usage: compare-db-snapshots.mjs --before <file> --after <file>');
    process.exit(1);
  }
  const before = JSON.parse(fs.readFileSync(args.before, 'utf8'));
  const after = JSON.parse(fs.readFileSync(args.after, 'utf8'));
  const result = compareDbSnapshots(before, after, {
    allowMigrationDrift: args.allowMigrationDrift,
  });
  if (!result.ok) {
    console.error(JSON.stringify({ ok: false, drift: result.drift }, null, 2));
    process.exit(1);
  }
  console.error('[snapshot-compare] OK — no unexpected drift');
}

main();
