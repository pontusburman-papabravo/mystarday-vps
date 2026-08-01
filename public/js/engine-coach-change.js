/**
 * engine-coach-change.js — prod change notice contract (see docs/first-success/CHANGE-SURFACE-CONTRACT.md).
 * Shown inside #engineCoachMount only; no separate UI layer.
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'engine_coach_change_seen_';

  /** Bump release_id when user-visible coach behavior changes in prod. */
  const ACTIVE_RELEASE_ID = 'coach_primary_v1';

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function releaseKey(suffix) {
    return 'journey.coachChange.releases.' + ACTIVE_RELEASE_ID + '.' + suffix;
  }

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
    if (!ACTIVE_RELEASE_ID) return null;
    if (hasSeen(ACTIVE_RELEASE_ID)) return null;
    return {
      release_id: ACTIVE_RELEASE_ID,
      user_visible_intent: pt(releaseKey('userVisibleIntent')),
      what_changed: pt(releaseKey('whatChanged')),
      why_it_matters: pt(releaseKey('whyItMatters')),
    };
  }

  function acknowledge(releaseId) {
    markSeen(releaseId || ACTIVE_RELEASE_ID);
  }

  window.EngineCoachChange = {
    ACTIVE_RELEASE_ID: ACTIVE_RELEASE_ID,
    getNotice: getNotice,
    acknowledge: acknowledge,
    hasSeen: hasSeen,
  };
})();
