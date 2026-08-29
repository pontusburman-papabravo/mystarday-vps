'use strict';

/**
 * Statuses for the release compliance gate. Per DEL 2 of the release-gate mandate:
 * every check/gate reports one of these four states. NOT_APPLICABLE and
 * MANUAL_REVIEW_REQUIRED are first-class — they must never be silently
 * collapsed into PASS.
 */
const STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
});

/**
 * Exit codes.
 *   0 = automated checks pass, but manual checks may remain (never call this "submission ready")
 *   1 = hard compliance failure (a FAIL was found)
 *   2 = script/config error (could not run the gate at all)
 */
const EXIT = Object.freeze({
  OK_WITH_MANUAL_REMAINING: 0,
  HARD_FAILURE: 1,
  SCRIPT_ERROR: 2,
});

/**
 * Gate outcome for a consumer-facing scan hit after classification heuristics.
 * Only BLOCKER can cause a section FAIL. REVIEW surfaces as MANUAL_REVIEW_REQUIRED.
 */
const DISPOSITION = Object.freeze({
  BLOCKER: 'BLOCKER',
  REVIEW: 'REVIEW',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  INFORMATIONAL: 'INFORMATIONAL',
});

/** Classification of a text match found by the pre-release language / placeholder scanners. */
const CLASS = Object.freeze({
  /** User-visible consumer production UI — the dangerous case. */
  A_CONSUMER_UI: 'A_CONSUMER_UI',
  /** Admin/internal/dev/test/docs/identifier — not shipped to end users as prose. */
  B_INTERNAL: 'B_INTERNAL',
  /** Legitimate text without pre-release meaning (allowlisted fixture, false positive). */
  C_SAFE: 'C_SAFE',
});

/** The three release gates from DEL 2 of the mandate. */
const GATE = Object.freeze({
  TECHNICAL: 'GATE_A_TECHNICAL_RELEASE_READINESS',
  POLICY: 'GATE_B_STORE_POLICY_AND_LEGAL_COMPLIANCE',
  SUBMISSION: 'GATE_C_SUBMISSION_METADATA_AND_REVIEW_PACKAGE',
});

const STORE = Object.freeze({
  APPLE: 'Apple',
  GOOGLE: 'Google',
  BOTH: 'Both',
});

function worstStatus(statuses) {
  const list = statuses.filter(Boolean);
  if (list.includes(STATUS.FAIL)) return STATUS.FAIL;
  if (list.includes(STATUS.MANUAL_REVIEW_REQUIRED)) return STATUS.MANUAL_REVIEW_REQUIRED;
  if (list.every((s) => s === STATUS.NOT_APPLICABLE)) return STATUS.NOT_APPLICABLE;
  return STATUS.PASS;
}

module.exports = { STATUS, EXIT, CLASS, DISPOSITION, GATE, STORE, worstStatus };
