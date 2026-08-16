'use strict';

/**
 * Offsite backup upload hook — no-op until BACKUP_OFFSITE_ENABLED=1 and target configured.
 * Phase 8 of DR spec; local backup must succeed independently.
 */

/**
 * @param {object} opts
 * @param {string} opts.dumpPath
 * @param {string} opts.metaPath
 * @param {string} opts.checksumPath
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function uploadOffsiteBackupIfConfigured(opts, env = process.env) {
  if (env.BACKUP_OFFSITE_ENABLED !== '1') {
    return { skipped: true, reason: 'offsite_not_enabled' };
  }
  const target = env.BACKUP_OFFSITE_TARGET;
  if (!target) {
    return { skipped: true, reason: 'offsite_target_missing' };
  }
  // Extension point: R2/S3 sync in follow-up PR when credentials + bucket are provisioned.
  return {
    skipped: true,
    reason: 'offsite_upload_not_implemented',
    targetConfigured: true,
  };
}
