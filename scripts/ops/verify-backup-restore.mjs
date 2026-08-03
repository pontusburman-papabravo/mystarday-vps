#!/usr/bin/env node
/**
 * Restore rehearsal to a disposable database only — never production.
 *
 * Lifecycle (required, no autodetect):
 *   --database-lifecycle external  target already created by caller (VPS sudo helper)
 *   --database-lifecycle managed   create via DATABASE_ADMIN_URL only (CI/disposable)
 */
import { parseVerifyBackupRestoreArgs, runVerifyBackupRestore } from './lib/verify-backup-restore-core.mjs';

async function main() {
  const args = parseVerifyBackupRestoreArgs(process.argv);
  const result = await runVerifyBackupRestore(args, process.env);
  console.error(`[restore-rehearsal] OK database=${result.targetDb} lifecycle=${result.lifecycle}`);
}

main().catch((err) => {
  console.error(`[restore-rehearsal] FAILED: ${err.message}`);
  process.exit(1);
});
