/**
 * referral-capture.js — persist ?ref= for registration (referral v0).
 * Also emits referral_landing when a code is first seen (allowlisted analytics).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'msd_referral_code'; // pragma: allowlist secret

  function readFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref');
    } catch (_) {
      return null;
    }
  }

  function capture() {
    const ref = readFromUrl();
    if (!ref) return;
    const code = ref.trim().toUpperCase().slice(0, 12);
    if (!code) return;
    let isNew = false;
    try {
      const prev = localStorage.getItem(STORAGE_KEY);
      isNew = prev !== code;
      localStorage.setItem(STORAGE_KEY, code);
    } catch (_) {}
    if (isNew) {
      try {
        if (window.analytics && typeof analytics.track === 'function') {
          analytics.track('referral_landing', { code: code });
        }
      } catch (_) {}
    }
  }

  function getStoredCode() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function clearStoredCode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  capture();

  window.ReferralCapture = {
    getCode: getStoredCode,
    clear: clearStoredCode,
  };
})();
