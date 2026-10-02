'use strict';

/**
 * Parent notice the day before a product trial ends.
 * Intro year and grandfathered families are not trials and never match.
 * One day means trial_days_remaining === 1 (the last 24 hours, ceil).
 */

const TRIAL_ENDING_NOTICE_DAYS = 1;

function shouldShowTrialEndingNotice(status) {
  if (!status || status.access_kind !== 'trial') return false;
  const premium = status.premium;
  if (!premium || premium.active !== true || premium.source !== 'trial' || premium.trial !== true) {
    return false;
  }
  return status.trial_days_remaining === TRIAL_ENDING_NOTICE_DAYS;
}

module.exports = {
  TRIAL_ENDING_NOTICE_DAYS,
  shouldShowTrialEndingNotice,
};
