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
 * Parse GitHub Actions step name + run commands from workflow YAML.
 * Intentionally minimal — only the fields CI evidence contracts need.
 * @param {string} yamlContent
 * @returns {{ name: string, run: string|null }[]}
 */
export function parseWorkflowSteps(yamlContent) {
  const steps = [];
  const lines = yamlContent.split('\n');
  let current = null;

  for (const line of lines) {
    const nameMatch = line.match(/^\s+-\s+name:\s+(.+)$/);
    if (nameMatch) {
      if (current) steps.push(current);
      current = { name: nameMatch[1].trim(), run: null };
      continue;
    }
    const runMatch = line.match(/^\s+run:\s+(.+)$/);
    if (runMatch && current) {
      current.run = runMatch[1].trim();
    }
  }
  if (current) steps.push(current);
  return steps;
}

/**
 * Verify workflow YAML defines required step commands at the evaluated SHA.
 * @param {string} yamlContent
 * @param {{ job?: string, stepName: string, runIncludes: string }[]} contracts
 */
export function verifyWorkflowStepContracts(yamlContent, contracts) {
  const steps = parseWorkflowSteps(yamlContent);
  for (const contract of contracts) {
    const step = steps.find((s) => s.name === contract.stepName);
    if (!step) {
      return { ok: false, reason: 'workflow_step_missing', step: contract.stepName };
    }
    if (contract.runIncludes && !String(step.run || '').includes(contract.runIncludes)) {
      return {
        ok: false,
        reason: 'workflow_step_run_mismatch',
        step: contract.stepName,
        expectedIncludes: contract.runIncludes,
        actualRun: step.run,
      };
    }
  }
  return { ok: true, steps };
}
