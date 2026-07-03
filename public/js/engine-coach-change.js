/**
 * engine-coach-change.js — prod change notice contract (see docs/first-success/CHANGE-SURFACE-CONTRACT.md).
 * Shown inside #engineCoachMount only; no separate UI layer.
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'engine_coach_change_seen_';

  /**
   * Bump release_id when user-visible coach behavior changes in prod.
   * @type {{ release_id: string, user_visible_intent: string, what_changed: string, why_it_matters: string }}
   */
  const ACTIVE_RELEASE = {
    release_id: 'coach_primary_v1',
    user_visible_intent: 'Vi visar nu ett tydligt förslag till nästa steg här på Hem.',
    what_changed: 'Ett kort med "Nästa steg" har lagts till högst upp.',
    why_it_matters: 'Ni behöver inte leta bland påminnelser — ett förslag i taget.',
  };

  function storageKey(releaseId) {
    return STORAGE_PREFIX + releaseId;
  }

  function hasSeen(releaseId) {
    try {
      return localStorage.getItem(storageKey(releaseId)) === '1';
    } catch (_) {
      return false;
    }
  }

  function markSeen(releaseId) {
    try {
      localStorage.setItem(storageKey(releaseId), '1');
    } catch (_) {}
  }

  function getNotice() {
    if (!ACTIVE_RELEASE || !ACTIVE_RELEASE.release_id) return null;
    if (hasSeen(ACTIVE_RELEASE.release_id)) return null;
    return ACTIVE_RELEASE;
  }

  function acknowledge(releaseId) {
    markSeen(releaseId || ACTIVE_RELEASE.release_id);
  }

  window.EngineCoachChange = {
    ACTIVE_RELEASE: ACTIVE_RELEASE,
    getNotice: getNotice,
    acknowledge: acknowledge,
    hasSeen: hasSeen,
  };
})();
