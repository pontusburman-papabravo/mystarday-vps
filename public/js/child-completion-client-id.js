(function () {
  'use strict';

  const STORAGE_KEY = 'child_completion_client_id';

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    }
    return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }

  function getChildCompletionClientId() {
    try {
      let id = sessionStorage.getItem(STORAGE_KEY);
      if (!id || id.length < 8) {
        id = generateId();
        sessionStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return generateId();
    }
  }

  window.getChildCompletionClientId = getChildCompletionClientId;
})();
