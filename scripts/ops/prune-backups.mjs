#!/usr/bin/env node
import { executeBackupPrune, planBackupPrune } from './lib/backup-prune-core.mjs';

function parseArgs(argv) {
  const out = { dryRun: true, backupDir: process.env.APP_DB_BACKUP_DIR };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--apply') out.dryRun = false;
    else if (argv[i] === '--backup-dir') out.backupDir = argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.backupDir) throw new Error('APP_DB_BACKUP_DIR_MISSING');

  const plan = planBackupPrune(args.backupDir, { dryRun: args.dryRun });
  console.error(`[prune-backups] dry_run=${args.dryRun ? '1' : '0'}`);
  console.error(`[prune-backups] would_delete=${plan.toDelete.length} would_keep=${plan.toKeep.length}`);

  for (const p of plan.toDelete) {
    console.log(`WOULD_DELETE: ${p}`);
  }
  for (const p of plan.toKeep) {
    console.log(`WOULD_KEEP: ${p}`);
  }

  if (!args.dryRun) {
    const result = executeBackupPrune(args.backupDir, { dryRun: false });
    console.error(`[prune-backups] deleted=${result.deleted.length}`);
  }
}

main();
