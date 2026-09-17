/**
 * Map stable API error codes to locale keys. Never prefer Swedish `error`/`message`
 * as primary user copy — codes win, then a locale fallback.
 */
(function () {
  'use strict';

  const CODE_KEYS = {
    UPLOAD_NOT_CONFIGURED: 'family.errors.uploadNotConfigured',
    UPLOAD_NO_FILE: 'family.errors.uploadNoFile',
    UPLOAD_FILE_TOO_LARGE: 'family.errors.uploadTooLarge',
    UPLOAD_INVALID_FIELD: 'family.errors.uploadInvalidField',
    UPLOAD_RECEIVE_FAILED: 'family.errors.uploadReceiveFailed',
    UPLOAD_TYPE_NOT_ALLOWED: 'family.errors.uploadTypeNotAllowed',
    UPLOAD_INVALID_IMAGE: 'family.errors.uploadInvalidImage',
    UPLOAD_HEIC_CONVERT_FAILED: 'family.errors.uploadHeicFailed',
    UPLOAD_FAILED: 'family.errors.upload',
    UPLOAD_AVATAR_GONE: 'family.errors.uploadAvatarGone',
    AVATAR_FORBIDDEN: 'family.errors.avatarForbidden',
    AVATAR_CHILD_NOT_FOUND: 'family.errors.avatarNotFound',
    AVATAR_SAVE_FAILED: 'family.errors.avatarSaveFailed',
    AVATAR_DELETE_FAILED: 'family.errors.avatarDeleteFailed',

    CUSTODY_CYCLE_WEEKS_REQUIRED: 'family.errors.custodyCycleWeeksRequired',
    CUSTODY_CYCLE_WEEKS_NOT_ARRAY: 'family.errors.custodyCycleWeeksArray',
    CUSTODY_CYCLE_WEEKS_LENGTH: 'family.errors.custodyCycleWeeksLength',
    CUSTODY_CYCLE_WEEK_INVALID: 'family.errors.custodyCycleWeekInvalid',
    CUSTODY_CYCLE_DAY_REQUIRED: 'family.errors.custodyCycleDayRequired',
    CUSTODY_INVALID_HOME: 'family.errors.custodyInvalidHome',
    CUSTODY_TWO_HOMES_REQUIRED: 'family.errors.custodyTwoHomesRequired',

    VALIDATION_INVALID_VALUES: 'auth.errors.invalidValues',
    VALIDATION_INVALID_PARAMS: 'auth.errors.invalidParams',
    VALIDATION_INVALID_QUERY: 'auth.errors.invalidQuery',
    VALIDATION_PIN_4_DIGITS: 'family.toasts.pinLength',
    VALIDATION_EMAIL_INVALID: 'auth.errors.emailInvalid',
    VALIDATION_PIN_SAME_DIGITS: 'family.errors.pinSameDigits',
    VALIDATION_PIN_SEQUENTIAL_ASC: 'family.errors.pinSequentialAsc',
    VALIDATION_PIN_SEQUENTIAL_DESC: 'family.errors.pinSequentialDesc',

    PUSH_NOT_CONFIGURED: 'settings.push.errors.notConfigured',
    PUSH_INVALID_SUBSCRIPTION: 'settings.push.errors.invalidSubscription',
    PUSH_SAVE_FAILED: 'settings.push.errors.subscriptionFailed',
    PUSH_ENDPOINT_REQUIRED: 'settings.push.errors.endpointRequired',
    PUSH_UNSUBSCRIBE_FAILED: 'settings.push.errors.disableFailed',
    PUSH_INVALID_TOKEN: 'settings.push.errors.invalidToken',
    PUSH_INVALID_PLATFORM: 'settings.push.errors.invalidPlatform',
    PUSH_TOKEN_SAVE_FAILED: 'settings.push.errors.subscriptionFailed',
    PUSH_TOKEN_REQUIRED: 'settings.push.errors.tokenRequired',
    PUSH_TOKEN_DELETE_FAILED: 'settings.push.errors.disableFailed',
    PUSH_PARENT_NOT_FOUND: 'settings.push.errors.parentNotFound',
    PUSH_PREFS_LOAD_FAILED: 'settings.push.saveFailed',
    PUSH_PREFS_SAVE_FAILED: 'settings.push.saveFailedRetry',

    ACTIVITY_NAME_REQUIRED: 'library.errors.activityNameRequired',
    ACTIVITY_STARS_RANGE: 'library.errors.activityStarsRange',
    ACTIVITY_CATEGORY_NOT_FOUND: 'library.errors.categoryNotFound',
    ACTIVITY_TIMER_RANGE: 'library.errors.activityTimerRange',
    ACTIVITY_NOT_FOUND: 'library.errors.activityNotFound',
    ACTIVITY_IN_USE: 'library.errors.activityInUse',
    ACTIVITY_NOTHING_TO_UPDATE: 'library.errors.nothingToUpdate',
    ACTIVITY_INVALID_FEEDBACK: 'library.errors.activityInvalidFeedback',
    ACTIVITY_INVALID_TIME_GROUP: 'library.errors.activityInvalidTimeGroup',
    ACTIVITY_SUBSTEP_NAME_REQUIRED: 'library.errors.substepNameRequired',
    ACTIVITY_SUBSTEP_NOT_FOUND: 'library.errors.substepNotFound',
    ACTIVITY_SERVER_ERROR: 'library.errors.generic',

    REWARD_NAME_COST_REQUIRED: 'library.errors.rewardNameCostRequired',
    REWARD_COST_MIN: 'library.errors.rewardCostMin',
    REWARD_NOT_FOUND: 'library.errors.rewardNotFound',
    REWARD_NOTHING_TO_UPDATE: 'library.errors.nothingToUpdate',
    REWARD_REDEMPTION_NOT_FOUND: 'library.errors.redemptionNotFound',
    insufficient_stars: 'library.errors.insufficientStars',
    redemption_pending_exists: 'library.errors.redeemPending',
    reward_already_redeemed: 'library.errors.redeemTaken',
    reward_inactive: 'library.errors.rewardInactive',
    redemption_not_pending: 'library.errors.redeemHandled',
    REWARD_SERVICE_BUSY: 'library.errors.serviceBusy',
    REWARD_SERVER_ERROR: 'library.errors.generic',

    CHILD_NAME_REQUIRED: 'family.errors.childNameRequired',
    CHILD_NAME_EMOJI_REQUIRED: 'family.errors.nameEmojiRequired',
    CHILD_PIN_INVALID_FORMAT: 'family.toasts.pinLength',
    CHILD_NAME_PIN_TAKEN: 'family.errors.namePinTaken',
    CHILD_INVALID_DATE: 'family.errors.invalidDate',
    INVALID_NAME: 'family.errors.childNameRequired',
    DUPLICATE_CHILD_NAME: 'family.errors.duplicateChildName',

    INVALID_EMAIL: 'auth.errors.emailInvalid',
    ALREADY_MEMBER: 'family.errors.memberAlreadyExists',
    OTHER_FAMILY: 'family.errors.inviteOtherFamily',
    PENDING_INVITE: 'family.errors.invitePending',
    INVITE_NO_CHILDREN: 'family.errors.inviteNoChildren',
    INVITE_CHILD_ACCESS: 'family.errors.inviteChildAccess',
    INVITE_INVALID_CHILDREN: 'family.errors.inviteInvalidChildren',
    INVITE_INVALID_ROLE: 'family.errors.inviteInvalidRole',
    INVITE_SEND_FAILED: 'family.errors.inviteSendFailed',
    INVITE_EMAIL_REQUIRED: 'family.errors.inviteEmailRequired',

    RATING_SCORE_OR_EMOTION_REQUIRED: 'today.errors.ratingScoreOrEmotion',
    RATING_SCORE_RANGE: 'today.errors.ratingScoreRange',
    RATING_INVALID_EMOTION: 'today.errors.ratingInvalidEmotion',
    RATING_ACTIVITY_NOT_FOUND: 'today.errors.ratingActivityNotFound',
    RATING_NOT_ALLOWED: 'today.errors.ratingNotAllowed',
    RATING_PARENT_SCORE_RANGE: 'today.errors.ratingParentScoreRange',
    RATING_PARENT_NOT_ENABLED: 'today.errors.ratingParentDisabled',
    RATING_SERVER_ERROR: 'today.errors.saveRating',
  };

  const SWEDISH_COPY = /[åäöÅÄÖ]|kunde inte|ogiltig|måste vara|hittades inte|något gick fel|krävs|för stor|inte tillåten|försök igen/i;

  function currentLang() {
    if (window.I18n && typeof I18n.getCurrentLang === 'function') {
      return I18n.getCurrentLang();
    }
    return 'sv-SE';
  }

  function isSvLocale(lang) {
    return !lang || String(lang).toLowerCase().indexOf('sv') === 0;
  }

  function isErrorCode(value) {
    return typeof value === 'string' && /^[A-Z][A-Z0-9_]{2,}$/.test(value);
  }

  function translate(key, params) {
    if (!key) return '';
    if (window.I18n && typeof I18n.t === 'function') {
      const text = I18n.t(key, params || {});
      if (text && text !== key) return text;
    }
    return '';
  }

  function detailsObject(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    return {};
  }

  function apiErrorMessage(dataOrErr, fallbackKey) {
    let data = dataOrErr || {};
    if (data.body && typeof data.body === 'object') data = data.body;

    const details = detailsObject(data.details);
    let code = data.code;
    if (!code && isErrorCode(data.error)) code = data.error;
    if (!code && isErrorCode(data.status)) code = data.status;

    if (code && CODE_KEYS[code]) {
      const mapped = translate(CODE_KEYS[code], details);
      if (mapped) return mapped;
    }

    if (fallbackKey) {
      const fallback = translate(fallbackKey, details);
      if (fallback) return fallback;
    }

    if (isSvLocale(currentLang()) && data.error && !isErrorCode(data.error) && typeof data.error === 'string') {
      return data.error;
    }

    const generic = translate('auth.errors.serverError');
    if (generic) return generic;
    if (data.error && !SWEDISH_COPY.test(String(data.error)) && !isErrorCode(data.error)) {
      return String(data.error);
    }
    return '';
  }

  window.API_ERROR_CODE_KEYS = CODE_KEYS;
  window.apiErrorMessage = apiErrorMessage;
})();
