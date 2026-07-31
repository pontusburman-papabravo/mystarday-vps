'use strict';

/**
 * Stable error codes for child treasure-chest / goal APIs (client localizes).
 */
const CHILD_TREASURE_ERRORS = {
  CHILD_NOT_FOUND: { status: 404, code: 'CHILD_NOT_FOUND' },
  CHILD_REWARD_NOT_FOUND: { status: 404, code: 'CHILD_REWARD_NOT_FOUND' },
  CHILD_REWARD_NOT_VISIBLE: { status: 403, code: 'CHILD_REWARD_NOT_VISIBLE' },
  CHILD_REWARD_ID_REQUIRED: { status: 400, code: 'CHILD_REWARD_ID_REQUIRED' },
  CHILD_GOAL_ALREADY_ACTIVE: { status: 409, code: 'CHILD_GOAL_ALREADY_ACTIVE' },
  CHILD_GOAL_CHANGE_PENDING: { status: 409, code: 'CHILD_GOAL_CHANGE_PENDING' },
  CHILD_GOAL_TARGET_REQUIRED: { status: 400, code: 'CHILD_GOAL_TARGET_REQUIRED' },
  CHILD_SERVER_ERROR: { status: 500, code: 'CHILD_SERVER_ERROR' },
  CHILD_SERVICE_BUSY: { status: 503, code: 'CHILD_SERVICE_BUSY' },
};

function sendChildTreasureError(res, key, extra = {}) {
  const base = CHILD_TREASURE_ERRORS[key] || CHILD_TREASURE_ERRORS.CHILD_SERVER_ERROR;
  const body = { code: base.code, ...extra };
  return res.status(base.status).json(body);
}

module.exports = {
  CHILD_TREASURE_ERRORS,
  sendChildTreasureError,
};
