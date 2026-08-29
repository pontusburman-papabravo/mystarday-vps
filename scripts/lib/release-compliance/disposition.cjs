'use strict';

const { CLASS, DISPOSITION } = require('./constants.cjs');
const { compileRegexList, matchesAny } = require('./load-config.cjs');
const { matchClosedMarketSurface } = require('./market-context.cjs');

/**
 * Assign a gate disposition to a classified scan hit.
 * Only BLOCKER can fail the gate; REVIEW → MANUAL_REVIEW_REQUIRED; closed markets → N/A.
 */
function dispositionForHit(hit, opts = {}) {
  const { config = {}, closedMarketSurfaces = [], isSubmissionTemplate = false } = opts;

  if (isSubmissionTemplate) {
    return {
      ...hit,
      disposition: DISPOSITION.INFORMATIONAL,
      dispositionReason: 'historical/submission documentation — evidence only, never a blocking scan target',
    };
  }

  const closed = matchClosedMarketSurface(hit.filePath, closedMarketSurfaces);
  if (closed.closed) {
    return {
      ...hit,
      disposition: DISPOSITION.NOT_APPLICABLE,
      dispositionReason: closed.reason,
    };
  }

  if (hit.classification === CLASS.B_INTERNAL || hit.classification === CLASS.C_SAFE) {
    return {
      ...hit,
      disposition: DISPOSITION.INFORMATIONAL,
      dispositionReason: hit.reason,
    };
  }

  const manualReviewPatterns = compileRegexList(config.manualReviewConsumerPatterns || []);
  if (matchesAny(hit.snippet || '', manualReviewPatterns)) {
    return {
      ...hit,
      disposition: DISPOSITION.REVIEW,
      dispositionReason: 'consumer-visible but ambiguous — human eyeball required before treating as a blocker',
    };
  }

  return {
    ...hit,
    disposition: DISPOSITION.BLOCKER,
    dispositionReason: hit.reason,
  };
}

function partitionHitsByDisposition(hits) {
  const blockerHits = hits.filter((h) => h.disposition === DISPOSITION.BLOCKER);
  const reviewHits = hits.filter((h) => h.disposition === DISPOSITION.REVIEW);
  const notApplicableHits = hits.filter((h) => h.disposition === DISPOSITION.NOT_APPLICABLE);
  const informationalHits = hits.filter((h) => h.disposition === DISPOSITION.INFORMATIONAL);
  return { blockerHits, reviewHits, notApplicableHits, informationalHits };
}

function sectionStatusFromHits({ blockerHits, reviewHits }) {
  const { STATUS } = require('./constants.cjs');
  if (blockerHits.length > 0) return STATUS.FAIL;
  if (reviewHits.length > 0) return STATUS.MANUAL_REVIEW_REQUIRED;
  return STATUS.PASS;
}

module.exports = { dispositionForHit, partitionHitsByDisposition, sectionStatusFromHits };
