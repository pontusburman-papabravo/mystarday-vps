'use strict';

const { STATUS, EXIT, STORE, DISPOSITION, worstStatus } = require('./constants.cjs');

/** Severity + store attribution for a FAIL/MANUAL_REVIEW_REQUIRED in a given section. Used for DEL 11 findings. */
const SECTION_META = Object.freeze({
  A_pre_release_language_scan: { severity: 'P0', store: STORE.BOTH, category: 'Beta/pre-release labeling' },
  B_legal_url_eula_checks: { severity: 'P0', store: STORE.BOTH, category: 'Legal URL / EULA' },
  C_placeholder_review_unsafe_copy_scan: { severity: 'P0', store: STORE.BOTH, category: 'Placeholder / review-unsafe copy' },
  D_language_market_consistency: { severity: 'P1', store: STORE.BOTH, category: 'Market/language consistency' },
  E_auth_review_access: { severity: 'P0', store: STORE.BOTH, category: 'Auth / review access' },
  F_account_deletion: { severity: 'P0', store: STORE.BOTH, category: 'Account deletion' },
  G_iap_subscription_checks: { severity: 'P1', store: STORE.BOTH, category: 'IAP / subscriptions' },
  H_tracking_privacy: { severity: 'P1', store: STORE.APPLE, category: 'Tracking / privacy' },
  I_version_build_cache: { severity: 'P1', store: STORE.BOTH, category: 'Version / build / cache' },
  C_submission_metadata_review_package: { severity: 'P1', store: STORE.BOTH, category: 'Submission metadata / review package' },
});

function collectFindings(sections) {
  const findings = [];
  for (const section of sections) {
    const meta = SECTION_META[section.id] || { severity: 'P2', store: STORE.BOTH, category: section.title };
    for (const check of section.evidence?.checks || []) {
      if (check.status === STATUS.FAIL || check.status === STATUS.MANUAL_REVIEW_REQUIRED) {
        findings.push({
          severity: check.status === STATUS.FAIL ? meta.severity : 'INFO',
          store: meta.store,
          category: meta.category,
          section: section.id,
          check: check.id,
          status: check.status,
          evidence: check.evidence,
        });
      }
    }
    // Scan hit-lists (A/C): only BLOCKER disposition counts as P0 FAIL.
    const scanHits = [
      ...(section.evidence?.consumerHits || []),
      ...(section.evidence?.reviewHits || []),
    ];
    for (const hit of scanHits) {
      const isBlocker = hit.disposition === DISPOSITION.BLOCKER || (!hit.disposition && hit.classification === 'A_CONSUMER_UI');
      const isReview = hit.disposition === DISPOSITION.REVIEW;
      if (!isBlocker && !isReview) continue;
      const location = hit.jsonPointer ? `${hit.filePath}${hit.jsonPointer}` : `${hit.filePath}:${hit.line}`;
      findings.push({
        severity: isBlocker ? meta.severity : 'INFO',
        store: meta.store,
        category: meta.category,
        section: section.id,
        check: location,
        status: isBlocker ? STATUS.FAIL : STATUS.MANUAL_REVIEW_REQUIRED,
        evidence: hit,
      });
    }
  }
  return findings;
}

function buildGateStatus(sections) {
  return worstStatus(sections.map((s) => s.status));
}

function buildReport({ sections, gateAReference }) {
  const gateBSectionIds = [
    'A_pre_release_language_scan',
    'B_legal_url_eula_checks',
    'D_language_market_consistency',
    'E_auth_review_access',
    'F_account_deletion',
    'G_iap_subscription_checks',
    'H_tracking_privacy',
    'I_version_build_cache',
  ];
  const gateCSectionIds = ['C_placeholder_review_unsafe_copy_scan', 'C_submission_metadata_review_package'];

  const gateBSections = sections.filter((s) => gateBSectionIds.includes(s.id));
  const gateCSections = sections.filter((s) => gateCSectionIds.includes(s.id));

  const gateBStatus = buildGateStatus(gateBSections);
  const gateCStatus = buildGateStatus(gateCSections);

  const findings = collectFindings(sections);
  const p0 = findings.filter((f) => f.severity === 'P0');
  const p1 = findings.filter((f) => f.severity === 'P1');
  const p2 = findings.filter((f) => f.severity === 'P2');
  const info = findings.filter((f) => f.severity === 'INFO');

  const overallHasFail = sections.some((s) => s.status === STATUS.FAIL);
  const overallHasManual = sections.some((s) => s.status === STATUS.MANUAL_REVIEW_REQUIRED);

  let exitCode;
  if (overallHasFail) exitCode = EXIT.HARD_FAILURE;
  else exitCode = EXIT.OK_WITH_MANUAL_REMAINING; // manual items may remain; that is never a hard failure exit

  const gateAIsPass = gateAReference?.status === 'PASS';
  const gateAIsNotVerified = gateAReference?.status === 'NOT_VERIFIED';

  const readiness = {
    codeReady:
      gateAIsNotVerified
        ? 'NOT_VERIFIED'
        : gateAIsPass && !overallHasFail
          ? 'PASS'
          : overallHasFail
            ? 'FAIL'
            : 'NOT_VERIFIED',
    storeReady:
      gateBStatus === STATUS.PASS
        ? 'PASS'
        : gateBStatus === STATUS.FAIL
          ? 'FAIL'
          : gateBStatus === STATUS.MANUAL_REVIEW_REQUIRED
            ? 'MANUAL_REVIEW_REQUIRED'
            : gateBStatus,
    submissionReady: 'NOT_VERIFIED',
  };

  return {
    schema: 'stjarndag.release_compliance_gate.v1',
    generatedAt: new Date().toISOString(),
    gateA: gateAReference,
    gateB: { status: gateBStatus, sections: gateBSections },
    gateC: { status: gateCStatus, sections: gateCSections },
    overallStatus: overallHasFail ? STATUS.FAIL : overallHasManual ? STATUS.MANUAL_REVIEW_REQUIRED : STATUS.PASS,
    exitCode,
    readiness,
    findings: { p0, p1, p2, info },
    sections,
  };
}

function humanSummary(report) {
  const lines = [];
  lines.push('# APPLE / GOOGLE RELEASE COMPLIANCE REPORT');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push(`Technical gate (Gate A — run separately): ${report.gateA.status} — ${report.gateA.note}`);
  lines.push(`Policy gate (Gate B): ${report.gateB.status}`);
  lines.push(`Submission gate (Gate C): ${report.gateC.status}`);
  lines.push('');

  if (report.findings.p0.length) {
    lines.push('## FAILURES (P0 — likely rejection/blocker)');
    for (const f of report.findings.p0) {
      lines.push(`- [${f.store}] ${f.category} — ${f.check}`);
    }
    lines.push('');
  }
  if (report.findings.p1.length) {
    lines.push('## FAILURES / HIGH RISK (P1)');
    for (const f of report.findings.p1) {
      lines.push(`- [${f.store}] ${f.category} — ${f.check} (${f.status})`);
    }
    lines.push('');
  }
  if (report.findings.info.length) {
    lines.push('## MANUAL CHECKS REQUIRED');
    const seen = new Set();
    for (const f of report.findings.info) {
      const key = `${f.category} :: ${f.check}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- [${f.store}] ${f.category} — ${f.check}`);
    }
    lines.push('');
  }

  const reviewScanHits = report.sections.flatMap((s) => s.evidence?.reviewHits || []);
  if (reviewScanHits.length) {
    lines.push('## REVIEW BEFORE SUBMIT (not automatic blockers)');
    for (const hit of reviewScanHits.slice(0, 20)) {
      const location = hit.jsonPointer ? `${hit.filePath}${hit.jsonPointer}` : `${hit.filePath}:${hit.line}`;
      lines.push(`- ${location} — ${hit.snippet || hit.dispositionReason || 'human review'}`);
    }
    lines.push('');
  }

  lines.push('## Sections');
  for (const section of report.sections) {
    lines.push(`### ${section.title}`);
    lines.push(`status: ${section.status}`);
    lines.push(section.summary);
    lines.push('');
  }

  lines.push('## Readiness');
  lines.push(`CODE READY: ${report.readiness.codeReady} (Gate A technical readiness — run release:pre-public-gate separately)`);
  lines.push(`STORE READY: ${report.readiness.storeReady} (Gate B policy/legal — FAIL only for verified blockers)`);
  lines.push(`SUBMISSION READY: ${report.readiness.submissionReady} (Gate C + STORE_SUBMISSION_CHECKLIST.md — never auto-verified from repo alone)`);
  lines.push('');
  lines.push(`Exit code: ${report.exitCode} (0 = automated checks pass but manual checks may remain · 1 = hard failure · 2 = script/config error)`);
  return lines.join('\n');
}

module.exports = { buildReport, humanSummary, collectFindings, SECTION_META };
