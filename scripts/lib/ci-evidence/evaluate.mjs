export const EVIDENCE_STATUS = {
  REUSE_ALLOWED: 'REUSE_ALLOWED',
  REUSE_FORBIDDEN: 'REUSE_FORBIDDEN',
  NOT_VERIFIED: 'NOT_VERIFIED',
};

/**
 * Pure CI evidence trust evaluation. Never upgrades unknown to pass.
 *
 * @param {object} input
 * @param {string} input.headSha
 * @param {boolean} input.workingTreeClean
 * @param {string} input.workflowPath
 * @param {string[]} input.requiredJobs
 * @param {string} input.workflowBlobSha
 * @param {string} input.testManifestSha256
 * @param {boolean} [input.ghAvailable=true]
 * @param {boolean} [input.ghAuthenticated=true]
 * @param {object|null} [input.run]
 * @param {string} [input.runWorkflowBlobSha]
 * @param {string} [input.runTestManifestSha256]
 * @param {string} [input.source='gh-cli']
 * @returns {object}
 */
export function evaluateCiEvidence(input) {
  const base = {
    head_sha: input.headSha || null,
    workflow_path: input.workflowPath,
    workflow_id: input.run?.workflow_id ?? null,
    run_id: input.run?.run_id ?? null,
    run_attempt: input.run?.run_attempt ?? null,
    conclusion: input.run?.conclusion ?? null,
    required_jobs: input.requiredJobs || [],
    workflow_blob_sha: input.workflowBlobSha || null,
    test_manifest_sha256: input.testManifestSha256 || null,
    source: input.source || 'gh-cli',
  };

  function result(status, reason, extra = {}) {
    return {
      status,
      ...base,
      ...extra,
      ...(reason ? { reason } : {}),
    };
  }

  if (!input.headSha) {
    return result(EVIDENCE_STATUS.NOT_VERIFIED, 'head_sha_missing');
  }

  if (input.ghAvailable === false) {
    return result(EVIDENCE_STATUS.NOT_VERIFIED, 'gh_unavailable');
  }

  if (input.ghAuthenticated === false) {
    return result(EVIDENCE_STATUS.NOT_VERIFIED, 'gh_not_authenticated');
  }

  if (!input.workingTreeClean) {
    return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'dirty_working_tree');
  }

  if (!input.run) {
    return result(EVIDENCE_STATUS.NOT_VERIFIED, 'no_ci_run');
  }

  const runHead = input.run.head_sha || input.run.headSha;
  if (runHead !== input.headSha) {
    return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'sha_mismatch', {
      run_head_sha: runHead,
    });
  }

  const runWorkflowPath = input.run.workflow_path || input.workflowPath;
  if (runWorkflowPath && runWorkflowPath !== input.workflowPath) {
    return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'workflow_path_mismatch', {
      run_workflow_path: runWorkflowPath,
    });
  }

  const conclusion = input.run.conclusion;
  if (!conclusion) {
    return result(EVIDENCE_STATUS.NOT_VERIFIED, 'run_conclusion_missing');
  }

  if (conclusion === 'cancelled') {
    return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'run_cancelled');
  }

  if (conclusion !== 'success') {
    return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'run_not_success', { conclusion });
  }

  const requiredJobs = input.requiredJobs || [];
  const jobResults = input.run.jobs || [];
  for (const jobName of requiredJobs) {
    const job = jobResults.find((j) => j.name === jobName);
    if (!job) {
      return result(EVIDENCE_STATUS.NOT_VERIFIED, 'required_job_missing', { job: jobName });
    }
    if (job.conclusion === 'skipped' && job.required !== false) {
      return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'required_job_skipped', { job: jobName });
    }
    if (job.conclusion !== 'success') {
      return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'required_job_not_success', {
        job: jobName,
        job_conclusion: job.conclusion,
      });
    }
  }

  const runWorkflowBlobSha = input.runWorkflowBlobSha ?? input.run.workflow_blob_sha;
  if (runWorkflowBlobSha && input.workflowBlobSha && runWorkflowBlobSha !== input.workflowBlobSha) {
    return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'workflow_mismatch', {
      run_workflow_blob_sha: runWorkflowBlobSha,
    });
  }

  const runManifestSha = input.runTestManifestSha256 ?? input.run.test_manifest_sha256;
  if (runManifestSha && input.testManifestSha256 && runManifestSha !== input.testManifestSha256) {
    return result(EVIDENCE_STATUS.REUSE_FORBIDDEN, 'test_manifest_mismatch', {
      run_test_manifest_sha256: runManifestSha,
    });
  }

  return result(EVIDENCE_STATUS.REUSE_ALLOWED, null, {
    required_jobs: jobResults
      .filter((j) => requiredJobs.includes(j.name))
      .map((j) => ({ name: j.name, conclusion: j.conclusion })),
  });
}
