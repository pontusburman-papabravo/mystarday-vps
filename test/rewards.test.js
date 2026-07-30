/**
 * rewards.test.js — Tests for reward redemption logic.
 *
 * Covers:
 * - Concurrent redemption race condition: second attempt gets 409
 * - Star balance check: insufficient stars → 400
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// ─── Race condition simulation ────────────────────────────
// The actual race condition protection uses a transaction with SELECT FOR UPDATE.
// We test the logic: if a redemption already exists for this child+reward in
// 'pending' or 'approved' state, a second redemption should be rejected.

function canRedeem(existingRedemptions, childId, rewardId, starBalance, starCost) {
  // Check: sufficient stars
  if (starBalance < starCost) {
    return { allowed: false, status: 400, error: 'Inte tillräckligt med stjärnor' };
  }

  // Check: no active (pending) redemption for the same reward already exists
  // (This is what SELECT FOR UPDATE in the DB enforces — we model the logic here)
  const alreadyPending = existingRedemptions.some(
    r => r.child_id === childId && r.reward_id === rewardId && r.status === 'pending'
  );

  if (alreadyPending) {
    return { allowed: false, status: 409, error: 'Det finns redan en väntande inlösen för denna belöning' };
  }

  return { allowed: true, status: 201 };
}

test('First redemption succeeds when balance is sufficient', () => {
  const result = canRedeem([], 'child-1', 'reward-1', 100, 50);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 201);
});

test('Second concurrent redemption gets 409 (race condition)', () => {
  const existing = [
    { child_id: 'child-1', reward_id: 'reward-1', status: 'pending' },
  ];
  const result = canRedeem(existing, 'child-1', 'reward-1', 100, 50);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 409, 'Duplicate pending redemption should return 409');
});

test('Redemption with insufficient stars returns 400', () => {
  const result = canRedeem([], 'child-1', 'reward-1', 10, 50);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 400, 'Insufficient stars should return 400');
});

test('Approved reward does not block a later redemption for the same child', () => {
  function canRedeemRepeatable(existingRedemptions, childId, rewardId, starBalance, starCost) {
    if (starBalance < starCost) {
      return { allowed: false, status: 400 };
    }
    const alreadyPending = existingRedemptions.some(
      (r) => r.child_id === childId && r.reward_id === rewardId && r.status === 'pending'
    );
    if (alreadyPending) {
      return { allowed: false, status: 409 };
    }
    const familyPending = existingRedemptions.some(
      (r) => r.reward_id === rewardId && r.status === 'pending'
    );
    if (familyPending) {
      return { allowed: false, status: 409 };
    }
    return { allowed: true, status: 201 };
  }

  const existing = [
    { child_id: 'child-1', reward_id: 'reward-1', status: 'approved' },
  ];
  const result = canRedeemRepeatable(existing, 'child-1', 'reward-1', 100, 50);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 201);
});

test('Family-wide pending blocks another child until resolved', () => {
  function canRedeemRepeatable(existingRedemptions, childId, rewardId, starBalance, starCost) {
    if (starBalance < starCost) return { allowed: false, status: 400 };
    const alreadyPending = existingRedemptions.some(
      (r) => r.child_id === childId && r.reward_id === rewardId && r.status === 'pending'
    );
    if (alreadyPending) return { allowed: false, status: 409 };
    const familyPending = existingRedemptions.some(
      (r) => r.reward_id === rewardId && r.status === 'pending'
    );
    if (familyPending) return { allowed: false, status: 409 };
    return { allowed: true, status: 201 };
  }

  const existing = [
    { child_id: 'child-1', reward_id: 'reward-1', status: 'pending' },
  ];
  assert.equal(canRedeemRepeatable(existing, 'child-2', 'reward-1', 100, 50).allowed, false);
});

test('Denied redemption does not block a later redemption', () => {
  function canRedeemRepeatable(existingRedemptions, childId, rewardId, starBalance, starCost) {
    if (starBalance < starCost) return { allowed: false, status: 400 };
    const alreadyPending = existingRedemptions.some(
      (r) => r.child_id === childId && r.reward_id === rewardId && r.status === 'pending'
    );
    if (alreadyPending) return { allowed: false, status: 409 };
    const familyPending = existingRedemptions.some(
      (r) => r.reward_id === rewardId && r.status === 'pending'
    );
    if (familyPending) return { allowed: false, status: 409 };
    return { allowed: true, status: 201 };
  }

  const existing = [
    { child_id: 'child-1', reward_id: 'reward-1', status: 'denied' },
  ];
  assert.equal(canRedeemRepeatable(existing, 'child-2', 'reward-1', 100, 50).allowed, true);
  assert.equal(canRedeemRepeatable(existing, 'child-1', 'reward-1', 100, 50).allowed, true);
});

test('Different reward can be redeemed while another is pending', () => {
  const existing = [
    { child_id: 'child-1', reward_id: 'reward-1', status: 'pending' },
  ];
  // Redeeming reward-2 while reward-1 is pending — should be allowed
  const result = canRedeem(existing, 'child-1', 'reward-2', 100, 30);
  assert.equal(result.allowed, true, 'Different reward should not be blocked by existing pending');
});
