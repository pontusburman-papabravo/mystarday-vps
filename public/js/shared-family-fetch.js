/**
 * shared-family-fetch.js — coalesce in-flight GET /api/family only (no stale response cache).
 */
(function (global) {
  'use strict';

  /**
   * @param {function(string): Promise<object>} apiFn e.g. Auth.api.bind(Auth)
   * @returns {Promise<object>}
   */
  function fetchFamily(apiFn) {
    if (global.__familyWarmFetch) return global.__familyWarmFetch;

    const promise = apiFn('/api/family')
      .then(function (data) {
        global.__familyWarmFetch = null;
        return data;
      })
      .catch(function (err) {
        global.__familyWarmFetch = null;
        throw err;
      });

    global.__familyWarmFetch = promise;
    return promise;
  }

  function clearInflight() {
    global.__familyWarmFetch = null;
  }

  global.SharedFamilyFetch = {
    fetch: fetchFamily,
    clearInflight: clearInflight,
  };
})(window);
