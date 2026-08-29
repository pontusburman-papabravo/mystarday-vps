import { execSync } from 'node:child_process';

/**
 * Load workflow file content at an exact git ref.
 * @param {string} root
 * @param {string} ref
 * @param {string} workflowPath
 */
export function loadWorkflowAtRef(root, ref, workflowPath) {
  return execSync(`git show ${ref}:${workflowPath}`, { cwd: root, encoding: 'utf8' });
}

/**
 * Parse GitHub Actions jobs → steps (name + run) from workflow YAML.
 * Deterministic line parser — only the structure CI evidence contracts need.
 * @param {string} yamlContent
 * @returns {Record<string, { steps: { name: string, run: string|null }[] }>}
 */
export function parseWorkflowJobs(yamlContent) {
  const jobs = {};
  const lines = yamlContent.split('\n');
  let currentJob = null;
  let inSteps = false;
  let stepsIndent = 0;
  let currentStep = null;

  const flushStep = () => {
    if (!currentJob || !currentStep) return;
    jobs[currentJob].steps.push(currentStep);
    currentStep = null;
  };

  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      flushStep();
      currentJob = null;
      inSteps = false;
      continue;
    }

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch) {
      flushStep();
      currentJob = jobMatch[1];
      jobs[currentJob] = jobs[currentJob] || { steps: [] };
      inSteps = false;
      continue;
    }

    if (currentJob && /^\s+steps:\s*$/.test(line)) {
      flushStep();
      inSteps = true;
      stepsIndent = (line.match(/^(\s+)/) || ['', ''])[1].length;
      continue;
    }

    if (!inSteps || !currentJob) continue;

    const indent = (line.match(/^(\s*)/) || ['', ''])[1].length;
    if (line.trim() && indent <= stepsIndent && !/^\s+-\s+name:/.test(line)) {
      flushStep();
      inSteps = false;
      continue;
    }

    const nameMatch = line.match(/^\s+-\s+name:\s+(.+)$/);
    if (nameMatch) {
      flushStep();
      currentStep = { name: nameMatch[1].trim(), run: null };
      continue;
    }

    const runMatch = line.match(/^\s+run:\s+(.+)$/);
    if (runMatch && currentStep) {
      currentStep.run = runMatch[1].trim();
    }
  }

  flushStep();
  return jobs;
}

/**
 * @deprecated Use parseWorkflowJobs — kept for tests migrating off flat step lists.
 */
export function parseWorkflowSteps(yamlContent) {
  const jobs = parseWorkflowJobs(yamlContent);
  const firstJob = Object.values(jobs)[0];
  return firstJob?.steps || [];
}

/**
 * Verify workflow YAML defines required step commands inside the named job.
 * @param {string} yamlContent
 * @param {{ job?: string, stepName: string, runIncludes: string }[]} contracts
 */
export function verifyWorkflowStepContracts(yamlContent, contracts) {
  const jobs = parseWorkflowJobs(yamlContent);
  for (const contract of contracts) {
    const jobName = contract.job || 'test';
    const job = jobs[jobName];
    if (!job) {
      return { ok: false, reason: 'workflow_job_missing', job: jobName };
    }
    const step = job.steps.find((s) => s.name === contract.stepName);
    if (!step) {
      return { ok: false, reason: 'workflow_step_missing', step: contract.stepName, job: jobName };
    }
    if (contract.runIncludes && !String(step.run || '').includes(contract.runIncludes)) {
      return {
        ok: false,
        reason: 'workflow_step_run_mismatch',
        step: contract.stepName,
        job: jobName,
        expectedIncludes: contract.runIncludes,
        actualRun: step.run,
      };
    }
  }
  return { ok: true, jobs };
}
