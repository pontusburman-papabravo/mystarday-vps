'use strict';

const PIN_QUERY_KEYS = ['pin', 'child_pin', 'parent_pin', 'childPin', 'parentPin'];

/**
 * Strip PIN-bearing query keys from a relative return path or absolute URL.
 * Nested next/redirect values are sanitized recursively.
 * Fail-closed: unparseable input becomes pathname-only or '/'.
 */
function sanitizeReturnUrl(raw) {
  if (!raw || typeof raw !== 'string') return '/';
  const trimmed = raw.trim();
  if (!trimmed) return '/';

  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }

  try {
    const u = new URL(trimmed, 'https://local.invalid');
    for (const key of PIN_QUERY_KEYS) {
      u.searchParams.delete(key);
    }
    for (const nested of ['next', 'redirect']) {
      if (u.searchParams.has(nested)) {
        u.searchParams.set(nested, sanitizeReturnUrl(u.searchParams.get(nested)));
      }
    }
    return u.pathname + u.search + u.hash;
  } catch {
    const q = trimmed.indexOf('?');
    if (q === -1) return trimmed.startsWith('/') ? trimmed : '/';
    return trimmed.slice(0, q) || '/';
  }
}

module.exports = { sanitizeReturnUrl, PIN_QUERY_KEYS };
