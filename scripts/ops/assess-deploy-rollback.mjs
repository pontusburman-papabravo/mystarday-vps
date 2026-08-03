#!/usr/bin/env node
import { classifyDeployFailure } from './lib/deploy-rollback-policy.mjs';

function parseArgs(argv) {
  const out = {
    phase: 'unknown',
    migrationsApplied: '0',
    migrations: '',
    repoRoot: process.env.VPS_APP_PATH || process.cwd(),
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--phase') out.phase = argv[++i];
    else if (argv[i] === '--migrations-applied') out.migrationsApplied = argv[++i];
    else if (argv[i] === '--new-migrations') out.migrations = argv[++i];
    else if (argv[i] === '--repo-root') out.repoRoot = argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const names = args.migrations
    ? args.migrations.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const result = classifyDeployFailure({
    failedPhase: args.phase,
    migrationsAppliedThisDeploy: args.migrationsApplied === '1',
    newMigrationNames: names,
    repoRoot: args.repoRoot,
  });
  console.log(result.outcome);
  console.error(result.message);
  if (!result.mayRollbackCode) {
    process.exit(2);
  }
}

main();
