#!/usr/bin/env node
import fs from 'node:fs';
import { runPreDeployBackupGate } from './lib/backup-gate-core.mjs';
import { captureDbIntegritySnapshot } from './lib/db-integrity-snapshot-core.mjs';

function parseArgs(argv) {
  const out = {
    deploySha: process.env.DEPLOY_SHA || null,
    snapshotIn: null,
    metadataOut: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--deploy-sha') out.deploySha = argv[++i];
    else if (argv[i] === '--snapshot-in') out.snapshotIn = argv[++i];
    else if (argv[i] === '--metadata-out') out.metadataOut = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  let snapshot = null;
  if (args.snapshotIn) {
    snapshot = JSON.parse(fs.readFileSync(args.snapshotIn, 'utf8'));
  } else {
    snapshot = await captureDbIntegritySnapshot(process.env.DATABASE_URL, {
      label: 'pre-deploy',
      deploySha: args.deploySha,
    });
  }

  const result = await runPreDeployBackupGate({
    deploySha: args.deploySha,
    snapshot,
  });

  if (result.skipped) {
    console.error(`[backup-gate] skipped: ${result.reason}`);
    process.exit(0);
  }

  if (args.metadataOut) {
    fs.copyFileSync(result.metaPath, args.metadataOut);
  }

  console.error(`[backup-gate] OK dump=${result.dumpPath} sha256=${result.metadata.backup_file_sha256}`);
  console.error(`[backup-gate] pending_migrations=${result.pendingMigrations.length}`);
}

main().catch((err) => {
  console.error(`[backup-gate] FAILED: ${err.message}`);
  process.exit(1);
});
