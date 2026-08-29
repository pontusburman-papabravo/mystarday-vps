#!/usr/bin/env node
/**
 * CI test routing — classify PR diff and emit GitHub Actions outputs.
 *
 *   node scripts/ci-test-route.mjs
 *   node scripts/ci-test-route.mjs --json
 *
 * Env:
 *   GITHUB_BASE_SHA / GITHUB_HEAD_SHA — PR diff (preferred)
 *   GITHUB_EVENT_NAME — pull_request vs push
 *   TEST_ROUTING_MANUAL_RISK — optional manual risk raise (R0–R3 or LOW/MEDIUM/HIGH)
 *   TEST_ROUTING_FORCE_FULL_GATE — if true, always require L3 (main push)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeChangedFiles } from './lib/test-routing/route.mjs';
import { collectLocalExecutionTests } from './lib/test-routing/verification-plan.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { json: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--json') out.json = true;
    else if (argv[i] === '--help' || argv[i] === '-h') out.help = true;
  }
  return out;
}

function isMainPush() {
  const event = process.env.GITHUB_EVENT_NAME;
  const ref = process.env.GITHUB_REF;
  return event === 'push' && ref === 'refs/heads/main';
}

function forceFullGate() {
  return process.env.TEST_ROUTING_FORCE_FULL_GATE === 'true' || isMainPush();
}

function writeGitHubOutput(plan) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (!outFile) return;

  const vp = plan.verificationPlan;
  const l1Tests = vp.L1?.tests || [];
  const l2Tests = vp.L2?.tests || [];
  const lines = [
    `automatic_risk=${plan.automaticRisk}`,
    `final_risk=${plan.finalRisk}`,
    `risk_tier=${plan.riskTier}`,
    `l1_required=${vp.L1?.required ? 'true' : 'false'}`,
    `l2_required=${vp.L2?.required ? 'true' : 'false'}`,
    `l3_required=${vp.L3?.required ? 'true' : 'false'}`,
    `independent_review=${vp.independentReview ? 'true' : 'false'}`,
    `rollback_consideration=${vp.rollbackConsideration ? 'true' : 'false'}`,
    `db_invariants=${vp.dbInvariants ? 'true' : 'false'}`,
    `domains=${plan.domains.join(',')}`,
    `l1_tests=${l1Tests.join(' ')}`,
    `l2_tests=${l2Tests.join(' ')}`,
    `l3_command=${vp.L3?.command || 'npm run test:gate'}`,
    `escalation_reason=${plan.escalationReason || ''}`,
    `fail_closed=${vp.failClosed ? 'true' : 'false'}`,
  ];
  fs.appendFileSync(outFile, `${lines.join('\n')}\n`);
}

function writeGitHubSummary(plan) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const vp = plan.verificationPlan;
  const md = [
    '## Test routing classifier',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Changed files | ${plan.changedFiles.length} |`,
    `| Domains | ${plan.domains.join(', ') || '(none)'} |`,
    `| Automatic risk | ${plan.automaticRisk} (${plan.automaticRiskTier}) |`,
    `| Manual risk | ${plan.manualRisk || '(none)'} |`,
    `| Final risk | ${plan.finalRisk} (${plan.riskTier}) |`,
    `| L1 required | ${vp.L1?.required} (${(vp.L1?.tests || []).length} tests) |`,
    `| L2 required | ${vp.L2?.required} (${(vp.L2?.tests || []).length} tests) |`,
    `| L3 required | ${vp.L3?.required} |`,
    `| Independent review | ${vp.independentReview || false} |`,
    `| Rollback consideration | ${vp.rollbackConsideration || false} |`,
    `| DB invariants | ${vp.dbInvariants || false} |`,
    `| Escalation | ${plan.escalationReason || '(none)'} |`,
    '',
    '<details><summary>Changed files</summary>',
    '',
    ...plan.changedFiles.map((f) => `- \`${f}\``),
    '',
    '</details>',
    '',
  ].join('\n');

  fs.appendFileSync(summaryFile, `${md}\n`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('CI test routing classifier — see scripts/ci-test-route.mjs header');
    process.exit(0);
  }

  const baseSha = process.env.GITHUB_BASE_SHA || process.env.TEST_ROUTING_BASE_SHA;
  const headSha = process.env.GITHUB_HEAD_SHA || process.env.TEST_ROUTING_HEAD_SHA || 'HEAD';
  const manualRisk = process.env.TEST_ROUTING_MANUAL_RISK;

  let plan;
  try {
    plan = routeChangedFiles(ROOT, {
      baseSha: baseSha || undefined,
      headSha: baseSha ? headSha : undefined,
      baseRef: baseSha ? undefined : 'origin/main',
      manualRisk,
      staged: !baseSha,
      unstaged: !baseSha,
    });
  } catch (err) {
    console.error('Classifier crashed — fail closed:', err.message);
    process.exit(1);
  }

  if (forceFullGate()) {
    plan.verificationPlan.L3.required = true;
    plan.reason.push('main_push_conservative_full_gate');
    plan.escalationReason = [plan.escalationReason, 'main_push_conservative_full_gate'].filter(Boolean).join('; ');
  }

  const output = {
    ...plan,
    localTests: collectLocalExecutionTests(plan.verificationPlan),
    ci: {
      baseSha: baseSha || null,
      headSha: headSha || null,
      event: process.env.GITHUB_EVENT_NAME || null,
      forceFullGate: forceFullGate(),
    },
  };

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`Classifier: auto=${plan.automaticRisk} final=${plan.finalRisk} L3=${plan.verificationPlan.L3.required}`);
    console.log(`Domains: ${plan.domains.join(', ') || '(none)'}`);
    console.log(`Changed: ${plan.changedFiles.length} files`);
  }

  writeGitHubOutput(plan);
  writeGitHubSummary(plan);

  if (plan.meta?.classifierFailed) {
    process.exit(1);
  }
}

main();
