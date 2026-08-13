'use strict';

const {
  STATUS,
  EXIT,
  REPORT_SECTIONS,
  PUBLIC_RUNTIME_SECTIONS,
  NATIVE_STORE_SECTIONS,
  PROFILES,
} = require('./constants.cjs');

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

function votingChecks(section, { includeAdvisory = false } = {}) {
  const checks = section?.checks || [];
  if (includeAdvisory) return checks;
  return checks.filter((c) => !c.advisory);
}

function sectionStatusFromChecks(section, opts) {
  const checks = votingChecks(section, opts);
  if (!checks.length) return sectionStatus(section);
  return worstStatus(checks.map((c) => c.status));
}

function readinessBlock(status, profile) {
  let decision;
  if (status === STATUS.PASS) {
    decision =
      profile === PROFILES.NATIVE_STORE ? 'NATIVE-STORE READY' : 'PUBLIC-RUNTIME GATE READY';
  } else if (status === STATUS.BLOCKER) {
    decision = 'BLOCKED';
  } else {
    decision = profile === PROFILES.NATIVE_STORE ? 'NOT_VERIFIED' : 'NOT VERIFIED';
  }
  return { status, decision };
}

/**
 * Classify overall readiness for a release profile.
 *
 * public-runtime: runtime sections only — native store may be NOT_VERIFIED without blocking GO.
 * native-store: runtime + native sections must pass.
 */
function classifyOverall(report) {
  const profile = report.profile || PROFILES.PUBLIC_RUNTIME;
  const sections = report.sections || {};

  const runtimeStatuses = PUBLIC_RUNTIME_SECTIONS.map((key) => {
    const section = sections[key];
    if (!section) return STATUS.NOT_VERIFIED;
    if (section.optional && section.status !== STATUS.BLOCKER) return STATUS.PASS;
    return sectionStatus(section);
  });
  const runtimeReadinessStatus = worstStatus(runtimeStatuses);

  const nativeStatuses = NATIVE_STORE_SECTIONS.map((key) => {
    const section = sections[key];
    if (!section) return STATUS.NOT_VERIFIED;
    if (profile === PROFILES.PUBLIC_RUNTIME) {
      return sectionStatusFromChecks(section, { includeAdvisory: true });
    }
    return sectionStatus(section);
  });
  const nativeStoreReadinessStatus = worstStatus(nativeStatuses);

  let overallStatus;
  if (profile === PROFILES.NATIVE_STORE) {
    overallStatus = worstStatus([runtimeReadinessStatus, nativeStoreReadinessStatus]);
  } else {
    overallStatus = runtimeReadinessStatus;
  }

  const overall = overallStatus === STATUS.PASS ? 'PASS' : 'BLOCKED';
  const decision =
    overallStatus === STATUS.PASS
      ? profile === PROFILES.NATIVE_STORE
        ? 'NATIVE-STORE READY'
        : 'PUBLIC-RUNTIME GATE READY'
      : overallStatus === STATUS.BLOCKER
        ? 'NOT READY — blockers present'
        : 'NOT READY — unverified required checks';

  let exitCode = EXIT.NOT_VERIFIED;
  if (overallStatus === STATUS.PASS) exitCode = EXIT.GO;
  else if (overallStatus === STATUS.BLOCKER) exitCode = EXIT.BLOCKER;

  const runtimeReadiness = readinessBlock(runtimeReadinessStatus, PROFILES.PUBLIC_RUNTIME);
  const nativeStoreReadiness = readinessBlock(nativeStoreReadinessStatus, PROFILES.NATIVE_STORE);

  return {
    profile,
    overall,
    overallStatus,
    decision,
    exitCode,
    runtimeReadiness,
    nativeStoreReadiness,
  };
}

function collectBlockers(report) {
  const blockers = [];
  for (const [key, section] of Object.entries(report.sections || {})) {
    if (section.status === STATUS.BLOCKER) {
      blockers.push({ section: key, evidence: section.evidence || section.checks });
    }
    for (const check of section.checks || []) {
      if (check.status === STATUS.BLOCKER && !check.advisory) {
        blockers.push({ section: key, check: check.id, evidence: check.evidence });
      }
    }
  }
  return blockers;
}

function collectUnverified(report) {
  const items = [];
  const profile = report.profile || PROFILES.PUBLIC_RUNTIME;
  for (const [key, section] of Object.entries(report.sections || {})) {
    const isNativeSection = NATIVE_STORE_SECTIONS.includes(key);
    for (const check of section.checks || []) {
      if (check.status !== STATUS.NOT_VERIFIED) continue;
      if (profile === PROFILES.PUBLIC_RUNTIME && (check.advisory || isNativeSection)) {
        items.push({ section: key, check: check.id, advisory: true, evidence: check.evidence });
        continue;
      }
      items.push({ section: key, check: check.id, evidence: check.evidence });
    }
    if (section.status === STATUS.NOT_VERIFIED && !isNativeSection) {
      items.push({ section: key, evidence: section.evidence || section.checks });
    }
  }
  return items;
}

function humanSummary(report) {
  const lines = [];
  lines.push('# PRE-PUBLIC RELEASE GATE');
  lines.push(`Profile: ${report.profile}`);
  lines.push(`Base SHA: ${report.baseSha}`);
  lines.push(`Candidate SHA: ${report.candidateSha}`);
  lines.push(`Overall: ${report.overall} (${report.overallStatus})`);
  lines.push(`Runtime readiness: ${report.runtimeReadiness?.status} — ${report.runtimeReadiness?.decision}`);
  lines.push(
    `Native store readiness: ${report.nativeStoreReadiness?.status} — ${report.nativeStoreReadiness?.decision}`
  );
  lines.push(`Widget: ${report.widget}`);
  lines.push(`Decision: ${report.decision}`);
  lines.push(`Exit: ${report.exitCode}`);
  lines.push('');
  for (const [key, section] of Object.entries(report.sections || {})) {
    lines.push(`## ${section.title || key}`);
    lines.push(`status: ${section.status}`);
    if (section.excluded) lines.push('EXCLUDED — PAUSED');
    if (section.summary) lines.push(`evidence: ${section.summary}`);
    for (const check of section.checks || []) {
      const tag = check.advisory ? ' (advisory)' : '';
      lines.push(`- ${check.id}: ${check.status}${tag}`);
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
  sectionStatusFromChecks,
  classifyOverall,
  collectBlockers,
  collectUnverified,
  humanSummary,
};
