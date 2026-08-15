/**
 * shared-family-fetch.js — coalesce GET /api/family across parent shell bootstraps.
 */
(function (global) {
  'use strict';

  function getCached() {
    return global.__familyWarmData || null;
  }

  /**
   * @param {function(string): Promise<object>} apiFn e.g. Auth.api.bind(Auth)
   * @returns {Promise<object>}
   */
  function fetchFamily(apiFn) {
    const cached = getCached();
    if (cached) return Promise.resolve(cached);

    if (global.__familyWarmFetch) return global.__familyWarmFetch;

    const promise = apiFn('/api/family')
      .then(function (data) {
        global.__familyWarmData = data;
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

  global.SharedFamilyFetch = {
    getCached: getCached,
    fetch: fetchFamily,
  };
})(window);
