/**
 * api-error-classification.js — classify API failures for safe client handling.
 * Auth session loss (401/403) vs transient (429/5xx/network) must not share logout paths.
 */
(function (global) {
  'use strict';

  function statusFromError(err) {
    if (!err || typeof err !== 'object') return null;
    if (typeof err.status === 'number') return err.status;
    return null;
  }

  function isAuthSessionFailure(err) {
    const status = statusFromError(err);
    return status === 401 || status === 403;
  }

  function isTransientApiFailure(err) {
    const status = statusFromError(err);
    if (status === 429) return true;
    if (status >= 500 && status <= 599) return true;
    if (err && (err.name === 'AbortError' || err.name === 'TimeoutError' || err.name === 'TypeError')) {
      return true;
    }
    const msg = String((err && err.message) || '').toLowerCase();
    return msg.indexOf('failed to fetch') !== -1 || msg.indexOf('network') !== -1;
  }

  function getRetryAfterMs(err) {
    if (!err || typeof err !== 'object') return null;
    const body = err.body;
    if (body && typeof body.retry_after === 'number' && body.retry_after > 0) {
      return body.retry_after * 1000;
    }
    const status = statusFromError(err);
    if (status === 429) return 60000;
    return null;
  }

  global.ApiErrorClassification = {
    isAuthSessionFailure: isAuthSessionFailure,
    isTransientApiFailure: isTransientApiFailure,
    getRetryAfterMs: getRetryAfterMs,
    statusFromError: statusFromError,
  };
})(window);
