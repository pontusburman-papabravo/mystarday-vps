'use strict';

const REWARD_REDEMPTION_ERRORS = {
  reward_already_redeemed: {
    status: 409,
    error: 'Den här belöningen har redan låsts in av ett annat barn',
    code: 'reward_already_redeemed',
  },
  redemption_pending_exists: {
    status: 409,
    error: 'Du har redan en väntande inlösen för den här belöningen',
    code: 'redemption_pending_exists',
  },
  redemption_not_pending: {
    status: 409,
    error: 'Redan hanterad',
    code: 'redemption_not_pending',
  },
  insufficient_stars: {
    status: 400,
    error: 'Inte tillräckligt med stjärnor',
    code: 'insufficient_stars',
  },
  reward_inactive: {
    status: 400,
    error: 'Den här belöningen är inte längre tillgänglig',
    code: 'reward_inactive',
  },
};

function sendRewardRedemptionError(res, key, overrides = {}) {
  const base = REWARD_REDEMPTION_ERRORS[key];
  if (!base) {
    return res.status(500).json({ code: 'CHILD_SERVER_ERROR' });
  }
  const { error, ...rest } = overrides;
  return res.status(base.status).json({
    code: base.code,
    error: error ?? base.error,
    ...rest,
  });
}

function mapRedemptionUniqueViolation(err) {
  if (err.code !== '23505') return null;
  const constraint = err.constraint || '';
  if (constraint === 'idx_reward_redemption_child_reward_pending') {
    return 'redemption_pending_exists';
  }
  if (constraint === 'idx_reward_redemption_one_pending_per_reward') {
    return 'reward_already_redeemed';
  }
  return 'reward_already_redeemed';
}

module.exports = {
  REWARD_REDEMPTION_ERRORS,
  sendRewardRedemptionError,
  mapRedemptionUniqueViolation,
};
