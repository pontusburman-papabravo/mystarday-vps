/**
 * parent-backup-login-intent.js — one-shot client intent for shared-picker backup parent login.
 * Intent grants ZERO authority; server verification via #1059 explicit-parent-resume path only.
 */
(function () {
  'use strict';

  const BACKUP_INTENT_KEY = 'stjarndag_parent_backup_login_intent_v1';
  const ORIGIN_SHARED_PROFILE_PICKER = 'shared_profile_picker';
  const CANONICAL_PARENT_PATH = '/dashboard';
  const BACKUP_INTENT_TTL_MS = 10 * 60 * 1000;

  function readJson() {
    try {
      const raw = sessionStorage.getItem(BACKUP_INTENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(value) {
    try {
      sessionStorage.setItem(BACKUP_INTENT_KEY, JSON.stringify(value));
    } catch (_) { /* ignore */ }
  }

  function canonicalizeParentPath(path) {
    if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
      return path === '/home' ? CANONICAL_PARENT_PATH : path;
    }
    return CANONICAL_PARENT_PATH;
  }

  function isSafeParentPath(path) {
    return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
  }

  function isIntentExpired(intent) {
    return !intent || !intent.expiresAt || Date.now() > intent.expiresAt;
  }

  function isValidIntent(intent) {
    if (!intent || typeof intent !== 'object') return false;
    if (intent.origin !== ORIGIN_SHARED_PROFILE_PICKER) return false;
    if (!isSafeParentPath(intent.requestedPath)) return false;
    if (isIntentExpired(intent)) return false;
    return true;
  }

  function clearOrchestratorSessionState() {
    if (window.AppEntryOrchestrator
      && typeof AppEntryOrchestrator.clearOrchestratorSessionState === 'function') {
      AppEntryOrchestrator.clearOrchestratorSessionState();
    }
  }

  function storeIntent(requestedPath) {
    clearOrchestratorSessionState();
    const now = Date.now();
    writeJson({
      origin: ORIGIN_SHARED_PROFILE_PICKER,
      requestedPath: canonicalizeParentPath(requestedPath),
      createdAt: now,
      expiresAt: now + BACKUP_INTENT_TTL_MS,
    });
  }

  function readIntent() {
    const intent = readJson();
    if (!intent) return null;
    if (!isValidIntent(intent)) {
      clearIntent();
      return null;
    }
    return intent;
  }

  function clearIntent() {
    try {
      sessionStorage.removeItem(BACKUP_INTENT_KEY);
    } catch (_) { /* ignore */ }
  }

  /** @returns {object|null} consumed intent when valid; clears invalid/expired intents */
  function consumeIntent() {
    const intent = readJson();
    if (!intent) return null;
    if (!isValidIntent(intent)) {
      clearIntent();
      return null;
    }
    clearIntent();
    return intent;
  }

  function isParentLoginFlow() {
    try {
      return new URLSearchParams(window.location.search).get('parent') === '1';
    } catch (_) {
      return false;
    }
  }

  window.ParentBackupLoginIntent = {
    BACKUP_INTENT_KEY: BACKUP_INTENT_KEY,
    ORIGIN_SHARED_PROFILE_PICKER: ORIGIN_SHARED_PROFILE_PICKER,
    CANONICAL_PARENT_PATH: CANONICAL_PARENT_PATH,
    BACKUP_INTENT_TTL_MS: BACKUP_INTENT_TTL_MS,
    canonicalizeParentPath: canonicalizeParentPath,
    storeIntent: storeIntent,
    readIntent: readIntent,
    clearIntent: clearIntent,
    consumeIntent: consumeIntent,
    isValidIntent: isValidIntent,
    isParentLoginFlow: isParentLoginFlow,
    clearOrchestratorSessionState: clearOrchestratorSessionState,
  };
})();
