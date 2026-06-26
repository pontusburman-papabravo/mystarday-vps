/**
 * referral-capture.js — persist ?ref= for registration (referral v0).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mystarday_referral_code'; // pragma: allowlist secret

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
    try {
      localStorage.setItem(STORAGE_KEY, ref.trim().toUpperCase());
    } catch (_) {}
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
