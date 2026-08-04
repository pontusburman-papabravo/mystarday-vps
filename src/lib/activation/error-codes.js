'use strict';

/** Stable activation error codes (UI shows Swedish i18n, not these strings). */
const ACTIVATION_ERROR_CODES = Object.freeze({
  SCHEDULE_LOAD_TIMEOUT: 'ACTIVATION_SCHEDULE_LOAD_TIMEOUT',
  SCHEDULE_LOAD_401: 'ACTIVATION_SCHEDULE_LOAD_401',
  SCHEDULE_LOAD_403: 'ACTIVATION_SCHEDULE_LOAD_403',
  SCHEDULE_LOAD_404: 'ACTIVATION_SCHEDULE_LOAD_404',
  SCHEDULE_LOAD_429: 'ACTIVATION_SCHEDULE_LOAD_429',
  SCHEDULE_LOAD_5XX: 'ACTIVATION_SCHEDULE_LOAD_5XX',
  SCHEDULE_EMPTY: 'ACTIVATION_SCHEDULE_EMPTY',
  SCHEDULE_PARSE_ERROR: 'ACTIVATION_SCHEDULE_PARSE_ERROR',
  SESSION_RESTORE_FAILED: 'ACTIVATION_SESSION_RESTORE_FAILED',
  CHILD_ACCESS_FAILED: 'ACTIVATION_CHILD_ACCESS_FAILED',
  COMPLETION_FAILED: 'ACTIVATION_COMPLETION_FAILED',
  REPORT_SUBMIT_FAILED: 'ACTIVATION_REPORT_SUBMIT_FAILED',
});

const STEP_STATUSES = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  SKIPPED_BY_USER: 'skipped_by_user',
  DEFERRED: 'deferred',
  BLOCKED_BY_ERROR: 'blocked_by_error',
});

const STEP_IDS = Object.freeze({
  create_child: 'create_child',
  save_schedule: 'save_schedule',
  child_access: 'child_access',
  await_first_completion: 'await_first_completion',
  parent_ack: 'parent_ack',
  celebrate_first_success: 'celebrate_first_success',
});

function httpStatusToScheduleErrorCode(status) {
  if (status === 401) return ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_401;
  if (status === 403) return ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_403;
  if (status === 404) return ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_404;
  if (status === 429) return ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_429;
  if (status >= 500) return ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_5XX;
  return ACTIVATION_ERROR_CODES.SCHEDULE_LOAD_5XX;
}

module.exports = {
  ACTIVATION_ERROR_CODES,
  STEP_STATUSES,
  STEP_IDS,
  httpStatusToScheduleErrorCode,
};
