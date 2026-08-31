'use strict';

const { hemLoadOutcome } = require('./hem-attention');

/**
 * C1 — För Dig product-scope honesty. Server authz (P0.4) stays authoritative.
 */

function forDigActivationBlock(childrenOutcome) {
  if (childrenOutcome === 'loading') return 'loading';
  if (childrenOutcome === 'error') return 'error';
  if (childrenOutcome === 'ok_empty') return 'empty';
  return null;
}

function forDigCanClaimAllLinked(childrenOutcome, installsOutcome, installedCount, childrenCount) {
  return childrenOutcome === 'ok_items'
    && installsOutcome !== 'error'
    && installsOutcome !== 'loading'
    && childrenCount > 1
    && installedCount === childrenCount;
}

function forDigFilterPreselected(preselectedId, accessibleIds) {
  if (!preselectedId) return null;
  const allow = (accessibleIds || []).map(String);
  return allow.includes(String(preselectedId)) ? preselectedId : null;
}

function forDigInstallsForAccessible(installs, childIds) {
  const allow = new Set((childIds || []).map(String));
  return (installs || []).filter((row) => allow.has(String(row.child_id)));
}

/**
 * Apply a list fetch: success replaces; failure never fabricates empty.
 * @returns {{ items: Array, outcome: string, stale: boolean }}
 */
function forDigApplyListFetch(prevItems, resOk, nextItems) {
  if (resOk === null) {
    return { items: prevItems || [], outcome: 'loading', stale: false };
  }
  if (resOk === false) {
    if (prevItems && prevItems.length) {
      return {
        items: prevItems,
        outcome: hemLoadOutcome(true, true),
        stale: true,
      };
    }
    return { items: [], outcome: 'error', stale: false };
  }
  const items = Array.isArray(nextItems) ? nextItems : [];
  return { items, outcome: hemLoadOutcome(true, items.length > 0), stale: false };
}

module.exports = {
  forDigActivationBlock,
  forDigCanClaimAllLinked,
  forDigFilterPreselected,
  forDigInstallsForAccessible,
  forDigApplyListFetch,
};
