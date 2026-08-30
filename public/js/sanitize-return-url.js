'use strict';

(function (root) {
  const PIN_QUERY_KEYS = ['pin', 'child_pin', 'parent_pin', 'childPin', 'parentPin'];

  function sanitizeReturnUrl(raw) {
    if (!raw || typeof raw !== 'string') return '/';
    const trimmed = raw.trim();
    if (!trimmed) return '/';
    if (trimmed.charAt(0) !== '/' || trimmed.indexOf('//') === 0) {
      return '/';
    }
    try {
      const u = new URL(trimmed, 'https://local.invalid');
      PIN_QUERY_KEYS.forEach((key) => {
        u.searchParams.delete(key);
      });
      ['next', 'redirect'].forEach((nested) => {
        if (u.searchParams.has(nested)) {
          u.searchParams.set(nested, sanitizeReturnUrl(u.searchParams.get(nested)));
        }
      });
      return u.pathname + u.search + u.hash;
    } catch (_err) {
      const q = trimmed.indexOf('?');
      if (q === -1) return trimmed.charAt(0) === '/' ? trimmed : '/';
      return trimmed.slice(0, q) || '/';
    }
  }

  function currentSafeReturnPath() {
    if (typeof window === 'undefined' || !window.location) return '/';
    return sanitizeReturnUrl(window.location.pathname + window.location.search);
  }

  root.sanitizeReturnUrl = sanitizeReturnUrl;
  root.currentSafeReturnPath = currentSafeReturnPath;
})(typeof window !== 'undefined' ? window : globalThis);
