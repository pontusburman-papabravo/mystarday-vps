'use strict';

const { STATUS, EXIT, REPORT_SECTIONS } = require('./constants.cjs');

function worstStatus(statuses) {
  if (statuses.includes(STATUS.BLOCKER)) return STATUS.BLOCKER;
  if (statuses.includes(STATUS.NOT_VERIFIED)) return STATUS.NOT_VERIFIED;
  if (statuses.every((s) => s === STATUS.EXCLUDED || s === STATUS.PASS)) {
    if (statuses.some((s) => s === STATUS.PASS) || statuses.length === 0) return STATUS.PASS;
  }
  return STATUS.NOT_VERIFIED;
}

function sectionStatus(section) {
  if (!section) return STATUS.NOT_VERIFIED;
  if (section.status) return section.status;
  const checks = section.checks || [];
  return worstStatus(checks.map((c) => c.status));
}

/**
 * GO requires every non-excluded section to be PASS.
 * Widget is EXCLUDED and does not vote except via flags.kill_switches/flags (widget OFF).
 */
function classifyOverall(report) {
  const voting = [];
  for (const key of REPORT_SECTIONS) {
    const section = report.sections[key];
    if (!section) {
      voting.push(STATUS.NOT_VERIFIED);
      continue;
    }
    if (section.status === STATUS.EXCLUDED) continue;
    if (section.optional && section.status !== STATUS.BLOCKER) continue;
    voting.push(sectionStatus(section));
  }

  const overallStatus = worstStatus(voting);
  const overall = overallStatus === STATUS.PASS ? 'PASS' : 'BLOCKED';
  const decision =
    overallStatus === STATUS.PASS
      ? 'READY FOR PUBLIC ROLLOUT'
      : overallStatus === STATUS.BLOCKER
        ? 'NOT READY — blockers present'
        : 'NOT READY — unverified required checks';

  let exitCode = EXIT.NOT_VERIFIED;
  if (overallStatus === STATUS.PASS) exitCode = EXIT.GO;
  else if (overallStatus === STATUS.BLOCKER) exitCode = EXIT.BLOCKER;

  return { overall, overallStatus, decision, exitCode };
}

function collectBlockers(report) {
  const blockers = [];
  for (const [key, section] of Object.entries(report.sections || {})) {
    if (section.status === STATUS.BLOCKER) {
      blockers.push({ section: key, evidence: section.evidence || section.checks });
    }
    for (const check of section.checks || []) {
      if (check.status === STATUS.BLOCKER) {
        blockers.push({ section: key, check: check.id, evidence: check.evidence });
      }
    }
  }
  return blockers;
}

function collectUnverified(report) {
  const items = [];
  for (const [key, section] of Object.entries(report.sections || {})) {
    if (section.status === STATUS.NOT_VERIFIED) {
      items.push({ section: key, evidence: section.evidence || section.checks });
    }
    for (const check of section.checks || []) {
      if (check.status === STATUS.NOT_VERIFIED) {
        items.push({ section: key, check: check.id, evidence: check.evidence });
      }
    }
  }
  return items;
}

function humanSummary(report) {
  const lines = [];
  lines.push('# PRE-PUBLIC RELEASE GATE');
  lines.push(`Base SHA: ${report.baseSha}`);
  lines.push(`Candidate SHA: ${report.candidateSha}`);
  lines.push(`Overall: ${report.overall} (${report.overallStatus})`);
  lines.push(`Decision: ${report.decision}`);
  lines.push(`Exit: ${report.exitCode}`);
  lines.push('');
  for (const [key, section] of Object.entries(report.sections || {})) {
    lines.push(`## ${section.title || key}`);
    lines.push(`status: ${section.status}`);
    if (section.excluded) lines.push('EXCLUDED — PAUSED');
    if (section.summary) lines.push(`evidence: ${section.summary}`);
    for (const check of section.checks || []) {
      lines.push(`- ${check.id}: ${check.status}`);
    }
    lines.push('');
  }
  if (report.remainingManualWork?.length) {
    lines.push('## Remaining manual work');
    for (const item of report.remainingManualWork) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push(`## Exact command`);
  lines.push(report.exactCommand);
  return lines.join('\n');
}

module.exports = {
  worstStatus,
  sectionStatus,
  classifyOverall,
  collectBlockers,
  collectUnverified,
  humanSummary,
};
