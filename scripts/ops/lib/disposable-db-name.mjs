'use strict';

/** PostgreSQL identifier limit; disposable names must be shorter for safety margin. */
export const DISPOSABLE_DB_MAX_NAME_LENGTH = 63;
export const DISPOSABLE_DB_PREFIX = 'integrity_restore_';
export const DISPOSABLE_DB_NAME_RE = /^integrity_restore_[a-z0-9_]+$/;

/**
 * @param {string} name
 * @param {{ protectedName?: string }} [opts]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateDisposableDatabaseName(name, opts = {}) {
  if (typeof name !== 'string' || name.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (name.length > DISPOSABLE_DB_MAX_NAME_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }
  if (/[\s/\\.\-]/.test(name) || name !== name.trim()) {
    return { ok: false, reason: 'invalid_chars' };
  }
  if (!DISPOSABLE_DB_NAME_RE.test(name)) {
    return { ok: false, reason: 'prefix_or_charset' };
  }
  const protectedName = opts.protectedName;
  if (protectedName && name === protectedName) {
    return { ok: false, reason: 'protected_database' };
  }
  return { ok: true };
}

export function parseSudoersDisposableDbRules(rulesText) {
  const lines = rulesText.split('\n').map((l) => l.trim()).filter(Boolean);
  const hasSetenv = lines.some((l) => /\bSETENV\b/i.test(l));
  const cmdLines = lines.filter((l) => !l.startsWith('#') && !l.startsWith('Defaults'));
  return { hasSetenv, cmdLines };
}
