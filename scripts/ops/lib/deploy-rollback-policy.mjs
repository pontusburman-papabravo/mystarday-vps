/**
 * Deploy failure outcomes — never claim full rollback when DB schema moved forward.
 */
import { migrationsAreBackwardCompatible } from './migration-snapshot-manifest.mjs';

export const DEPLOY_OUTCOME = {
  DEPLOY_PASS: 'DEPLOY_PASS',
  SAFE_CODE_ROLLBACK: 'SAFE_CODE_ROLLBACK',
  FORWARD_FIX_REQUIRED: 'FORWARD_FIX_REQUIRED',
  BLOCKED_BEFORE_MIGRATION: 'BLOCKED_BEFORE_MIGRATION',
};

/**
 * @param {{
 *   failedPhase: string,
 *   migrationsAppliedThisDeploy: boolean,
 *   newMigrationNames?: string[],
 *   repoRoot?: string,
 * }} ctx
 */
export function classifyDeployFailure(ctx) {
  const phase = ctx.failedPhase || 'unknown';
  const beforeMigrate = [
    'pre_snapshot',
    'backup_gate',
    'database_url',
    'checkout',
    'npm_ci',
  ].includes(phase);

  if (beforeMigrate || !ctx.migrationsAppliedThisDeploy) {
    return {
      outcome: DEPLOY_OUTCOME.BLOCKED_BEFORE_MIGRATION,
      mayRollbackCode: true,
      message: 'Failure before irreversible migration — safe to restore previous code revision.',
    };
  }

  const names = ctx.newMigrationNames || [];
  const backwardOk = migrationsAreBackwardCompatible(names, ctx.repoRoot);

  if (!backwardOk) {
    return {
      outcome: DEPLOY_OUTCOME.FORWARD_FIX_REQUIRED,
      mayRollbackCode: false,
      message:
        'Migration(s) applied without a backward-compatible contract — do not roll back code alone. Forward-fix required.',
    };
  }

  const runtimePhases = new Set(['restart', 'health', 'release_identity', 'post_deploy_runtime', 'post_snapshot']);
  if (runtimePhases.has(phase)) {
    return {
      outcome: DEPLOY_OUTCOME.SAFE_CODE_ROLLBACK,
      mayRollbackCode: true,
      message:
        'Backward-compatible migration(s) applied; runtime/post-deploy check failed — code rollback may restore previous revision (DB remains migrated).',
    };
  }

  return {
    outcome: DEPLOY_OUTCOME.FORWARD_FIX_REQUIRED,
    mayRollbackCode: false,
    message:
      'Unexpected drift or failure after migrate — treat as forward-fix; do not assume code-only rollback is safe.',
  };
}

/**
 * Conservative policy used by vps-deploy-revision.sh after migrate failures.
 * @param {boolean} migrationsAppliedThisDeploy
 * @param {string[]} newMigrationNames
 * @param {string} [repoRoot]
 */
export function shouldAttemptCodeRollback(migrationsAppliedThisDeploy, newMigrationNames, repoRoot, failedPhase) {
  if (!migrationsAppliedThisDeploy) return true;
  const assessment = classifyDeployFailure({
    failedPhase: failedPhase || 'unknown',
    migrationsAppliedThisDeploy: true,
    newMigrationNames,
    repoRoot,
  });
  return assessment.mayRollbackCode;
}
