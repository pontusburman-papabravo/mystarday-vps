/**
 * referral-share.js — shared copy + clean register URL for parent share flows.
 */
(function () {
  'use strict';

  const REGISTER_URL = '[REDACTED]/register'; // pragma: allowlist secret
  const BRAND_NAME = 'Min ' + 'Stj\u00e4rndag';

  function buildPayload() {
    const message =
      'Hej! Vi använder ' + BRAND_NAME + ' för barnens rutiner och stjärnor. ' +
      'Skapa konto gratis här:';
    return {
      url: REGISTER_URL,
      message: message,
      text: message + ' ' + REGISTER_URL,
    };
  }

  function load() {
    return Promise.resolve(null);
  }

  window.ReferralShare = {
    load: load,
    buildPayload: buildPayload,
    REGISTER_URL: REGISTER_URL,
    DEFAULT_URL: REGISTER_URL,
  };
})();
