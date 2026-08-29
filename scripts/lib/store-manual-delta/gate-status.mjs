const GATE_A_BLOCK = new Set(['BLOCKER', 'FAIL', 'BLOCKED']);
const GATE_BC_BLOCK = new Set(['FAIL']);
const GATE_BC_REVIEW = new Set(['MANUAL_REVIEW_REQUIRED', 'REVIEW', 'NOT_VERIFIED']);
const GATE_A_PASS = new Set(['PASS']);

/**
 * Normalize gate status string.
 * @param {unknown} value
 */
function norm(value) {
  if (value == null) return null;
  const s = String(value).trim().toUpperCase();
  return s || null;
}

/**
 * @param {object|null} gateA
 */
export function evaluateGateA(gateA) {
  const reasons = [];
  if (!gateA) {
    reasons.push('gate_a_not_verified');
    return { verified: false, blocked: false, reasons };
  }

  const overall = norm(gateA.overallStatus);
  const decision = norm(gateA.decision);
  const status = norm(gateA.status);

  if (overall && GATE_A_BLOCK.has(overall)) {
    reasons.push('gate_a_blocker');
    return { verified: false, blocked: true, reasons };
  }
  if (decision && (GATE_A_BLOCK.has(decision) || decision.includes('BLOCKER'))) {
    reasons.push('gate_a_blocker');
    return { verified: false, blocked: true, reasons };
  }
  if (status && GATE_A_BLOCK.has(status)) {
    reasons.push('gate_a_blocker');
    return { verified: false, blocked: true, reasons };
  }

  if (overall && GATE_A_PASS.has(overall)) {
    return { verified: true, blocked: false, reasons };
  }
  if (status && GATE_A_PASS.has(status)) {
    return { verified: true, blocked: false, reasons };
  }
  if (decision && (decision.includes('READY') || decision.includes('PASS'))) {
    return { verified: true, blocked: false, reasons };
  }

  reasons.push('gate_a_not_verified');
  return { verified: false, blocked: false, reasons };
}

/**
 * @param {object|null} gateBC
 */
export function evaluateGateBC(gateBC) {
  const reasons = [];
  if (!gateBC) {
    reasons.push('gate_bc_not_verified');
    return { verified: false, blocked: false, reasons };
  }

  const candidates = [
    gateBC.overallStatus,
    gateBC.policyGate,
    gateBC.gateB?.status,
    gateBC.gateC?.status,
  ].map(norm);

  if (candidates.some((s) => s && GATE_BC_BLOCK.has(s))) {
    reasons.push('gate_bc_fail');
    return { verified: false, blocked: true, reasons };
  }

  if (candidates.some((s) => s && GATE_BC_REVIEW.has(s))) {
    reasons.push('gate_bc_manual_review_required');
    return { verified: false, blocked: false, reasons };
  }

  const gateB = norm(gateBC.gateB?.status);
  const gateC = norm(gateBC.gateC?.status);
  if (gateB === 'PASS' && gateC === 'PASS') {
    return { verified: true, blocked: false, reasons };
  }
  if (norm(gateBC.overallStatus) === 'PASS') {
    return { verified: true, blocked: false, reasons };
  }

  reasons.push('gate_bc_not_verified');
  return { verified: false, blocked: false, reasons };
}

/**
 * Top-level L6 status from gates + path/trigger context.
 * @param {object} params
 */
export function resolveDeltaStatus(params) {
  const {
    gateA,
    gateBC,
    unknownPaths = [],
    hasAlwaysManualTrigger = false,
  } = params;

  const gateAEval = evaluateGateA(gateA);
  const gateBCEval = evaluateGateBC(gateBC);
  const gateReasons = [...gateAEval.reasons, ...gateBCEval.reasons];

  if (gateAEval.blocked || gateBCEval.blocked) {
    return { status: 'BLOCKED', gateReasons };
  }

  if (
    !gateAEval.verified
    || !gateBCEval.verified
    || unknownPaths.length > 0
    || hasAlwaysManualTrigger
  ) {
    if (unknownPaths.length > 0) gateReasons.push('unknown_paths');
    if (hasAlwaysManualTrigger) gateReasons.push('always_manual_triggers');
    return { status: 'MANUAL_REVIEW_REQUIRED', gateReasons };
  }

  return { status: 'DELTA_READY', gateReasons };
}
