import { execFileSync, execSync } from 'node:child_process';

/**
 * @typedef {object} GhDeps
 * @property {(args: string[], opts?: object) => string} execGh
 * @property {(ref: string, filePath: string) => string|null} gitBlobSha
 * @property {() => boolean} isWorkingTreeClean
 * @property {() => string|null} headSha
 */

/** @param {string} root @returns {GhDeps} */
export function createGhDeps(root) {
  return {
    execGh(args, opts = {}) {
      return execFileSync('gh', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...opts,
      }).trim();
    },
    gitBlobSha(ref, filePath) {
      try {
        return execSync(`git rev-parse ${ref}:${filePath}`, { cwd: root, encoding: 'utf8' }).trim();
      } catch {
        return null;
      }
    },
    isWorkingTreeClean() {
      try {
        const out = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
        return out.length === 0;
      } catch {
        return false;
      }
    },
    headSha() {
      try {
        return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
      } catch {
        return null;
      }
    },
  };
}

/**
 * @param {GhDeps} deps
 */
export function probeGh(deps) {
  try {
    deps.execGh(['auth', 'status']);
    return { available: true, authenticated: true };
  } catch (err) {
    const msg = `${err?.message || ''}${err?.stderr || ''}`;
    if (/not found|ENOENT/i.test(msg)) {
      return { available: false, authenticated: false };
    }
    return { available: true, authenticated: false };
  }
}

/**
 * @param {GhDeps} deps
 * @param {{ headSha: string, workflowPath: string }} opts
 */
export function fetchCiRun(deps, { headSha, workflowPath }) {
  const workflowFile = workflowPath.split('/').pop();
  let raw;
  try {
    raw = deps.execGh([
      'run',
      'list',
      '--commit',
      headSha,
      '--workflow',
      workflowFile,
      '--limit',
      '5',
      '--json',
      'databaseId,headSha,conclusion,workflowName,event,url,createdAt,updatedAt,attempt,workflowDatabaseId',
    ]);
  } catch (err) {
    const stderr = err?.stderr ? String(err.stderr) : '';
    if (/not found|ENOENT/i.test(`${err?.message || ''}${stderr}`)) {
      return { error: 'gh_unavailable' };
    }
    return { error: 'gh_run_list_failed', detail: stderr || err?.message };
  }

  let runs;
  try {
    runs = JSON.parse(raw);
  } catch {
    return { error: 'gh_run_list_parse_failed' };
  }

  const completed = runs.filter((r) => r.conclusion);
  if (!completed.length) {
    return { run: null };
  }

  const run = completed[0];
  let jobs = [];
  try {
    const jobsRaw = deps.execGh(['run', 'view', String(run.databaseId), '--json', 'jobs']);
    const parsed = JSON.parse(jobsRaw);
    jobs = (parsed.jobs || []).map((j) => ({
      name: j.name,
      conclusion: j.conclusion,
      status: j.status,
      steps: (j.steps || []).map((s) => ({
        name: s.name,
        conclusion: s.conclusion,
      })),
    }));
  } catch {
    return { error: 'gh_jobs_fetch_failed', run };
  }

  return {
    run: {
      run_id: String(run.databaseId),
      head_sha: run.headSha,
      conclusion: run.conclusion,
      run_attempt: run.attempt,
      workflow_id: run.workflowDatabaseId ? String(run.workflowDatabaseId) : null,
      workflow_path: workflowPath,
      url: run.url,
      created_at: run.createdAt,
      jobs,
    },
  };
}
