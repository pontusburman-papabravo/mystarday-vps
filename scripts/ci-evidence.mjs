import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateCiEvidence, EVIDENCE_STATUS } from './lib/ci-evidence/evaluate.mjs';
import { loadTestManifest } from './lib/ci-evidence/manifest.mjs';
import { createGhDeps, fetchCiRun, probeGh } from './lib/ci-evidence/gh-fetch.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadConfig() {
  const configPath = path.join(ROOT, 'config/ci-evidence.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

/**
 * Collect CI evidence for exact-SHA reuse decisions.
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {string} [options.headSha]
 * @param {import('./lib/ci-evidence/gh-fetch.mjs').GhDeps} [options.deps]
 * @param {object} [options.config]
 * @param {boolean} [options.skipGhFetch]
 * @param {object|null} [options.mockRun]
 */
export function collectCiEvidence(options = {}) {
  const root = options.root || ROOT;
  const config = options.config || loadConfig();
  const deps = options.deps || createGhDeps(root);
  const headSha = options.headSha || deps.headSha();
  const workingTreeClean = deps.isWorkingTreeClean();
  const workflowPath = config.workflowPath;
  const requiredJobs = config.requiredJobs || ['test'];
  const manifest = loadTestManifest(root);
  const workflowBlobSha = deps.gitBlobSha(headSha, workflowPath);

  const ghProbe = options.skipGhFetch
    ? { available: true, authenticated: true }
    : probeGh(deps);

  if (!ghProbe.available) {
    return evaluateCiEvidence({
      headSha,
      workingTreeClean,
      workflowPath,
      requiredJobs,
      workflowBlobSha,
      testManifestSha256: manifest.sha256,
      ghAvailable: false,
      source: config.source,
    });
  }

  if (!ghProbe.authenticated) {
    return evaluateCiEvidence({
      headSha,
      workingTreeClean,
      workflowPath,
      requiredJobs,
      workflowBlobSha,
      testManifestSha256: manifest.sha256,
      ghAuthenticated: false,
      source: config.source,
    });
  }

  let run = options.mockRun ?? null;
  if (!options.skipGhFetch && !options.mockRun) {
    const fetched = fetchCiRun(deps, { headSha, workflowPath });
    if (fetched.error) {
      return evaluateCiEvidence({
        headSha,
        workingTreeClean,
        workflowPath,
        requiredJobs,
        workflowBlobSha,
        testManifestSha256: manifest.sha256,
        run: null,
        ghAvailable: fetched.error !== 'gh_unavailable',
        source: config.source,
      });
    }
    run = fetched.run;
  }

  const runWorkflowBlobSha = run ? deps.gitBlobSha(run.head_sha, workflowPath) : null;

  return evaluateCiEvidence({
    headSha,
    workingTreeClean,
    workflowPath,
    requiredJobs,
    workflowBlobSha,
    testManifestSha256: manifest.sha256,
    runWorkflowBlobSha: runWorkflowBlobSha || workflowBlobSha,
    runTestManifestSha256: manifest.sha256,
    run,
    ghAvailable: true,
    ghAuthenticated: true,
    source: config.source,
  });
}

function parseArgs(argv) {
  const out = { json: false, jsonOut: null, help: false, sha: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--json-out') out.jsonOut = argv[++i];
    else if (a === '--sha') out.sha = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
ci:evidence — exact-SHA CI evidence for release preflight reuse

  npm run ci:evidence
  npm run ci:evidence -- --json
  npm run ci:evidence -- --sha <commit> --json-out artifacts/ci-evidence.json

Statuses:
  REUSE_ALLOWED     — verified CI success on exact SHA; test manifest + workflow match
  REUSE_FORBIDDEN   — trust violation (dirty tree, SHA mismatch, failed job, etc.)
  NOT_VERIFIED      — cannot verify (gh unavailable, no run, missing job data)

CODE EVIDENCE FRESHNESS != EXTERNAL STATE FRESHNESS
Exact-SHA code evidence has no calendar max-age.
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const evidence = collectCiEvidence({ headSha: args.sha || undefined });
  const payload = JSON.stringify(evidence, null, 2);

  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(ROOT, args.jsonOut)), { recursive: true });
    fs.writeFileSync(path.resolve(ROOT, args.jsonOut), `${payload}\n`);
  }

  if (args.json) {
    process.stdout.write(`${payload}\n`);
  } else {
    const label =
      evidence.status === EVIDENCE_STATUS.REUSE_ALLOWED
        ? 'CI EVIDENCE: REUSE_ALLOWED'
        : evidence.status === EVIDENCE_STATUS.REUSE_FORBIDDEN
          ? 'CI EVIDENCE: REUSE_FORBIDDEN'
          : 'CI EVIDENCE: NOT_VERIFIED';
    process.stdout.write(`${label}\n`);
    if (evidence.reason) process.stdout.write(`reason: ${evidence.reason}\n`);
    if (evidence.run_id) process.stdout.write(`run_id: ${evidence.run_id}\n`);
    process.stdout.write(`head_sha: ${evidence.head_sha}\n`);
    if (evidence.status !== EVIDENCE_STATUS.REUSE_ALLOWED) {
      process.stdout.write('LOCAL TESTING REQUIRED\n');
    }
    process.stdout.write(`\n---JSON---\n${payload}\n`);
  }

  process.exit(0);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
