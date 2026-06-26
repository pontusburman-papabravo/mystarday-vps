/**
 * child-family-client.js — API client for Family layer (read-only).
 * Source of truth: GET /api/me/family
 */
(function () {
  'use strict';

  let _cache = null;
  let _loading = null;

  function invalidate() {
    _cache = null;
  }

  function load(force) {
    if (_cache && !force) return Promise.resolve(_cache);
    if (_loading && !force) return _loading;

    _loading = (window.Auth
      ? Auth.api('/api/me/family')
      : fetch('/api/me/family', { credentials: 'include' }).then(function (r) {
          if (!r.ok) throw new Error('Family API ' + r.status);
          return r.json();
        })
    ).then(function (data) {
      _cache = data;
      _loading = null;
      return data;
    }).catch(function (err) {
      _loading = null;
      throw err;
    });

    return _loading;
  }

  window.ChildFamily = {
    load: load,
    invalidate: invalidate,
  };
})();
