/**
 * referral-share.js — share payload helper.
 * Default: clean /register URL (dela-appen).
 * When growth referral gate returns eligible, callers may pass personalUrl.
 */
(function () {
  'use strict';

  const REGISTER_URL = '[REDACTED]/register'; // pragma: allowlist secret
  const BRAND_NAME = 'Min ' + 'Stj\u00e4rndag';

  function buildPayload(opts) {
    opts = opts || {};
    const url = opts.personalUrl || REGISTER_URL;
    const text =
      'Hej! Vi använder ' + BRAND_NAME + ' för barnens rutiner och stjärnor. ' +
      'Skapa konto gratis här: ' +
      url;
    return {
      url: url,
      message: text,
      text: text,
      personal: Boolean(opts.personalUrl),
    };
  }

  /**
   * Optionally load personal referral URL when Journey gate allows.
   * Returns null when not eligible — callers keep using generic share.
   */
  function load() {
    if (!window.Auth || !Auth.api) return Promise.resolve(null);
    return Auth.api('/api/account/referral')
      .then(function (data) {
        if (!data || !data.eligible || !data.registerUrl) return null;
        return {
          code: data.code,
          registerUrl: data.registerUrl,
        };
      })
      .catch(function () {
        return null;
      });
  }

  window.ReferralShare = {
    load: load,
    buildPayload: buildPayload,
    REGISTER_URL: REGISTER_URL,
    DEFAULT_URL: REGISTER_URL,
  };
})();
