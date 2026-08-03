#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compareDbSnapshots } from './lib/compare-snapshots.mjs';

function parseArgs(argv) {
  const out = {
    before: null,
    after: null,
    mode: 'strict',
    allowMigrationDrift: true,
    repoRoot: process.env.VPS_APP_PATH || process.cwd(),
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--before') out.before = argv[++i];
    else if (argv[i] === '--after') out.after = argv[++i];
    else if (argv[i] === '--mode') out.mode = argv[++i];
    else if (argv[i] === '--repo-root') out.repoRoot = argv[++i];
    else if (argv[i] === '--strict-migrations') out.allowMigrationDrift = false;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.before || !args.after) {
    console.error(
      'Usage: compare-db-snapshots.mjs --before <file> --after <file> [--mode strict|post-migration|post-deploy-runtime]'
    );
    process.exit(1);
  }
  const before = JSON.parse(fs.readFileSync(args.before, 'utf8'));
  const after = JSON.parse(fs.readFileSync(args.after, 'utf8'));
  const result = compareDbSnapshots(before, after, {
    allowMigrationDrift: args.allowMigrationDrift,
    mode: args.mode,
    repoRoot: path.resolve(args.repoRoot),
  });
  if (!result.ok) {
    console.error(
      JSON.stringify(
        { ok: false, mode: args.mode, drift: result.drift, newMigrationNames: result.newMigrationNames },
        null,
        2
      )
    );
    process.exit(1);
  }
  console.error(`[snapshot-compare] OK mode=${args.mode} — no unexpected drift`);
}

main();
