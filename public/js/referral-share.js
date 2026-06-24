/**
 * referral-share.js — personal ?ref= links for parent share flows.
 * Used by mobile-nav.js (sidebar/topbar) and dashboard-cta.js.
 */
(function () {
  'use strict';

  var _cache = undefined;
  var DEFAULT_URL = 'https://mystarday.se';

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

  function buildPayload(ref) {
    if (ref && ref.registerUrl) {
      return {
        url: ref.registerUrl,
        text:
          'Hej! Vi använder Min Stjärndag för barnens rutiner och stjärnor. ' +
          'Skapa konto med min länk' +
          (ref.code ? ' (kod ' + ref.code + ')' : '') +
          ': ' +
          ref.registerUrl,
        withReferral: true,
        code: ref.code || null,
      };
    }
    return {
      url: DEFAULT_URL,
      text:
        'Hej! Vi använder Min Stjärndag — visuella rutiner och stjärnor för barn. ' +
        'Gratis för grundarmedlemmar: ' +
        DEFAULT_URL,
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
