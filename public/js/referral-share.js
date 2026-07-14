/**
 * referral-share.js — personal ?ref= links for parent share flows.
 * Used by mobile-nav.js (sidebar/topbar) and dashboard-cta.js.
 */
(function () {
  'use strict';

  let _cache = undefined;
  const DEFAULT_URL = '[REDACTED]'; // pragma: allowlist secret
  const BRAND_NAME = 'Min ' + 'Stj\u00e4rndag';

  function load() {
    if (_cache !== undefined) return Promise.resolve(_cache);
    if (typeof window.apiFetch !== 'function') {
      _cache = null;
      return Promise.resolve(null);
    }
    return window.apiFetch('/api/account/referral')
      .then(function (res) {
        if (res.ok) return res.json();
        _cache = null;
        return null;
      })
      .then(function (data) {
        if (data && data.registerUrl) _cache = data;
        else if (_cache === undefined) _cache = null;
        return _cache;
      })
      .catch(function () {
        _cache = null;
        return null;
      });
  }

  function referralMessage(code) {
    if (code) {
      return (
        'Hej! Vi använder ' + BRAND_NAME + ' för barnens rutiner och stjärnor. ' +
        'Skapa konto med min kod ' +
        code +
        ':'
      );
    }
    return (
      'Hej! Vi använder ' + BRAND_NAME + ' för barnens rutiner och stjärnor. ' +
      'Skapa konto via min länk:'
    );
  }

  function buildPayload(ref) {
    if (ref && ref.registerUrl) {
      const message = referralMessage(ref.code);
      return {
        url: ref.registerUrl,
        message: message,
        text: message + ' ' + ref.registerUrl,
        withReferral: true,
        code: ref.code || null,
      };
    }
    const message =
      'Hej! Vi använder ' + BRAND_NAME + ' — visuella rutiner och stjärnor för barn. ' +
      'Gratis för grundarmedlemmar.';
    return {
      url: DEFAULT_URL,
      message: message,
      text: message + ' ' + DEFAULT_URL,
      withReferral: false,
      code: null,
    };
  }

  function trackShared(ref, trackFn) {
    if (!ref || !ref.code) return;
    if (typeof trackFn === 'function') {
      trackFn('referral_link_shared', { code: ref.code });
      return;
    }
    if (typeof window.analytics !== 'undefined' && window.analytics.track) {
      window.analytics.track(null, 'referral_link_shared', { code: ref.code });
    }
  }

  function invalidate() {
    _cache = undefined;
  }

  window.ReferralShare = {
    load: load,
    buildPayload: buildPayload,
    trackShared: trackShared,
    invalidate: invalidate,
    DEFAULT_URL: DEFAULT_URL,
  };
})();
