/**
 * Post-npm-ci deploy database safety sequence (testable).
 * @typedef {{ snapshot: () => Promise<boolean>, backupGate: () => Promise<boolean>, migrate: () => Promise<boolean>, restart: () => Promise<boolean>, health: () => Promise<boolean>, postSnapshotCompare: () => Promise<boolean> }} DeployPhaseHandlers
 */

/**
 * @param {DeployPhaseHandlers} handlers
 * @returns {Promise<{ ok: boolean, executed: string[], failed?: string }>}
 */
export async function runDeployDatabasePhases(handlers) {
  const executed = [];

  if (!(await handlers.snapshot())) {
    return { ok: false, executed, failed: 'pre_snapshot' };
  }
  executed.push('pre_snapshot');

  if (!(await handlers.backupGate())) {
    return { ok: false, executed, failed: 'backup_gate' };
  }
  executed.push('backup_gate');

  if (!(await handlers.migrate())) {
    return { ok: false, executed, failed: 'migrate' };
  }
  executed.push('migrate');

  if (!(await handlers.restart())) {
    return { ok: false, executed, failed: 'restart' };
  }
  executed.push('restart');

  if (!(await handlers.health())) {
    return { ok: false, executed, failed: 'health' };
  }
  executed.push('health');

  if (!(await handlers.postSnapshotCompare())) {
    return { ok: false, executed, failed: 'post_snapshot_compare' };
  }
  executed.push('post_snapshot_compare');

  return { ok: true, executed };
}
