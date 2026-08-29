import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectCiEvidence } from './ci-evidence.mjs';
import { EVIDENCE_STATUS } from './lib/ci-evidence/evaluate.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const FINAL = {
  READY: 'READY',
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  BLOCKED: 'BLOCKED',
};

function parseArgs(argv) {
  const out = {
    full: false,
    profile: 'public-runtime',
    json: false,
    jsonOut: path.join(ROOT, 'artifacts/release-preflight.json'),
    help: false,
    gateAJsonOut: path.join(ROOT, 'artifacts/pre-public-release-gate.json'),
    complianceJsonOut: path.join(ROOT, 'artifacts/release-compliance-gate.json'),
    ciEvidenceOut: path.join(ROOT, 'artifacts/ci-evidence.json'),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full') out.full = true;
    else if (a === '--json') out.json = true;
    else if (a === '--json-out') out.jsonOut = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--profile=')) out.profile = a.slice('--profile='.length);
    else if (a === '--profile') out.profile = argv[++i];
  }
  return out;
}

function printHelp() {
  console.log(`
release:preflight — unified release preflight (Gate A + B/C)

  npm run release:preflight
  npm run release:preflight -- --full
  npm run release:preflight -- --profile=native-store
  npm run release:preflight -- --json

Standard mode reuses verified CI evidence on exact SHA when trust checks pass.
--full ignores CI reuse and runs the complete Gate A test:gate locally.

Exit: 0 READY or MANUAL_REVIEW_REQUIRED · 1 BLOCKED
`);
}

function gitHeadSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function runNodeScript(relPath, args = []) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.join(ROOT, relPath), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    exitCode: result.status ?? 1,
    durationMs: Date.now() - started,
    stdout: `${result.stdout || ''}`,
    stderr: `${result.stderr || ''}`,
  };
}

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function classifyGateA(gateA) {
  if (!gateA) return { status: 'NOT_VERIFIED', label: 'NOT_VERIFIED' };
  if (gateA.overallStatus === 'BLOCKER' || gateA.exitCode === 1) {
    return { status: 'BLOCKER', label: 'BLOCKER' };
  }
  if (gateA.overallStatus === 'NOT_VERIFIED' || gateA.exitCode === 2) {
    return { status: 'NOT_VERIFIED', label: 'NOT_VERIFIED' };
  }
  return { status: 'PASS', label: 'PASS' };
}

function classifyCompliance(compliance) {
  if (!compliance) return { status: 'NOT_VERIFIED', label: 'NOT_VERIFIED' };
  if (compliance.exitCode === 2) return { status: 'NOT_VERIFIED', label: 'NOT_VERIFIED' };
  if (compliance.exitCode === 1 || compliance.overallStatus === 'FAIL') {
    return { status: 'BLOCKER', label: 'FAIL' };
  }
  const hasReview =
    compliance.manualReviewRequired === true ||
    (compliance.reviewItems && compliance.reviewItems.length > 0) ||
    compliance.overallStatus === 'REVIEW';
  if (hasReview) return { status: 'REVIEW', label: 'MANUAL_REVIEW_REQUIRED' };
  return { status: 'PASS', label: 'PASS' };
}

function buildFinalStatus(codeStatus, releaseSpecificStatus, storePolicyStatus) {
  if ([codeStatus, releaseSpecificStatus, storePolicyStatus].includes('BLOCKER')) {
    return FINAL.BLOCKED;
  }
  if (storePolicyStatus === 'REVIEW') {
    return FINAL.MANUAL_REVIEW_REQUIRED;
  }
  if ([codeStatus, releaseSpecificStatus, storePolicyStatus].includes('NOT_VERIFIED')) {
    return FINAL.BLOCKED;
  }
  return FINAL.READY;
}

export function buildPreflightReport({
  headSha,
  fullMode,
  ciEvidence,
  gateA,
  compliance,
  timings,
  skippedChecks = [],
}) {
  const codeReuse = ciEvidence?.status === EVIDENCE_STATUS.REUSE_ALLOWED && !fullMode;
  const gateAClass = classifyGateA(gateA);
  const complianceClass = classifyCompliance(compliance);

  const codeStatus = gateAClass.status === 'BLOCKER' ? 'BLOCKER' : codeReuse || gateAClass.status === 'PASS' ? 'PASS' : gateAClass.status;
  const releaseSpecificStatus =
    gateAClass.status === 'BLOCKER' ? 'BLOCKER' : gateAClass.status === 'NOT_VERIFIED' ? 'NOT_VERIFIED' : 'PASS';

  const report = {
    schema: 'stjarndag.release_preflight.v1',
    generatedAt: new Date().toISOString(),
    headSha,
    mode: fullMode ? 'full' : 'standard',
    ciEvidence: ciEvidence || null,
    ciEvidenceReused: codeReuse,
    skippedChecks,
    timings,
    sections: {
      code: {
        status: codeStatus,
        ciEvidenceReused: codeReuse,
        runId: ciEvidence?.run_id || null,
        testGateVerifiedOnExactSha: codeReuse || gateAClass.status === 'PASS',
      },
      releaseSpecific: {
        status: releaseSpecificStatus,
        profile: gateA?.profile || null,
      },
      storePolicy: {
        status: complianceClass.status === 'REVIEW' ? 'MANUAL_REVIEW_REQUIRED' : complianceClass.label,
        exitCode: compliance?.exitCode ?? null,
      },
      appleManual: { status: 'not_implemented_in_this_phase' },
      googleManual: { status: 'not_implemented_in_this_phase' },
    },
    gateA,
    compliance,
    final: null,
  };

  report.final = buildFinalStatus(codeStatus, releaseSpecificStatus, complianceClass.status);
  return report;
}

export function formatHumanReport(report) {
  const lines = ['RELEASE PREFLIGHT', '', `SHA`, report.headSha || '(unknown)', ''];
  const code = report.sections.code;
  lines.push('CODE', code.status === 'PASS' ? 'PASS' : code.status);
  if (report.ciEvidenceReused) {
    lines.push('CI evidence reused');
    if (code.runId) lines.push(`run_id: ${code.runId}`);
    lines.push('test:gate: verified on exact SHA');
  } else if (report.ciEvidence?.status === EVIDENCE_STATUS.NOT_VERIFIED) {
    lines.push('CI EVIDENCE: NOT_VERIFIED');
    lines.push('LOCAL TESTING REQUIRED');
  } else if (report.mode === 'full') {
    lines.push('full mode — CI reuse ignored');
  }
  if (report.skippedChecks?.length) {
    lines.push(`skipped duplicate checks: ${report.skippedChecks.join(', ')}`);
  }
  lines.push('');
  lines.push('RELEASE-SPECIFIC', report.sections.releaseSpecific.status);
  lines.push('');
  lines.push('STORE POLICY', report.sections.storePolicy.status);
  lines.push('');
  lines.push('APPLE MANUAL', 'not implemented in this phase');
  lines.push('');
  lines.push('GOOGLE MANUAL', 'not implemented in this phase');
  lines.push('');
  lines.push('FINAL', report.final);
  if (report.timings?.totalMs != null) {
    lines.push('');
    lines.push(`wall-time: ${(report.timings.totalMs / 1000).toFixed(1)}s`);
  }
  return lines.join('\n');
}

export async function runReleasePreflight(options = {}) {
  const args = options.args || parseArgs(process.argv);
  const started = Date.now();
  const headSha = options.headSha || gitHeadSha();
  const timings = { phases: {} };

  let ciEvidence = null;
  let skippedChecks = [];

  if (!options.full && !args.full) {
    const t0 = Date.now();
    ciEvidence = options.ciEvidence || collectCiEvidence({ headSha });
    timings.phases.ciEvidenceMs = Date.now() - t0;
    fs.mkdirSync(path.dirname(args.ciEvidenceOut), { recursive: true });
    fs.writeFileSync(args.ciEvidenceOut, `${JSON.stringify(ciEvidence, null, 2)}\n`);
  }

  const gateAArgs = ['--profile', args.profile, '--json-out', args.gateAJsonOut];
  if (ciEvidence?.status === EVIDENCE_STATUS.REUSE_ALLOWED && !args.full && !options.full) {
    gateAArgs.push('--ci-evidence-file', args.ciEvidenceOut);
    skippedChecks = ['check:credentials', 'test:gate:unit', 'test:gate:db', 'EXTRA_UNIT', 'EXTRA_DB'];
  }

  const t1 = Date.now();
  const gateARun = options.gateARun || runNodeScript('scripts/pre-public-release-gate.mjs', gateAArgs);
  timings.phases.gateAMs = Date.now() - t1;

  const t2 = Date.now();
  const complianceRun =
    options.complianceRun ||
    runNodeScript('scripts/release-compliance-gate.mjs', ['--json-out', args.complianceJsonOut]);
  timings.phases.complianceMs = Date.now() - t2;

  timings.totalMs = Date.now() - started;

  const gateA = options.gateA || loadJsonIfExists(args.gateAJsonOut);
  const compliance = options.compliance || loadJsonIfExists(args.complianceJsonOut);

  const report = buildPreflightReport({
    headSha,
    fullMode: args.full || options.full,
    ciEvidence,
    gateA,
    compliance,
    timings,
    skippedChecks,
  });

  report.process = {
    gateAExitCode: gateARun.exitCode,
    complianceExitCode: complianceRun.exitCode,
  };

  return { report, gateARun, complianceRun, args };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const { report } = await runReleasePreflight({ args });
  const payload = JSON.stringify(report, null, 2);

  fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
  fs.writeFileSync(args.jsonOut, `${payload}\n`);

  if (args.json) {
    process.stdout.write(`${payload}\n`);
  } else {
    process.stdout.write(`${formatHumanReport(report)}\n\n---JSON---\n${payload}\n`);
    process.stdout.write(`\nJSON written to ${args.jsonOut}\n`);
  }

  const exitCode = report.final === FINAL.BLOCKED ? 1 : 0;
  process.exit(exitCode);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('[release-preflight] fatal:', err.message);
    process.exit(1);
  });
}
