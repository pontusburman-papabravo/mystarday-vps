/**
 * child-universe-client.js — API client for child universe (V1–V4).
 */
(function () {
  'use strict';

  var _cache = null;

  function api(path, opts) {
    return Auth.api('/api/me' + path, opts || {});
  }

  function load(force) {
    if (_cache && !force) return Promise.resolve(_cache);
    return api('/universe').then(function (data) {
      _cache = data;
      return data;
    }).catch(function () {
      return null;
    });
  }

  function invalidate() { _cache = null; }

  function patchAvatar(config) {
    return api('/avatar', { method: 'PATCH', body: JSON.stringify(config) })
      .then(function (r) { invalidate(); return r; });
  }

  function patchHouse(config) {
    return api('/house', { method: 'PATCH', body: JSON.stringify(config) })
      .then(function (r) { invalidate(); return r; });
  }

  function adoptPet(data) {
    return api('/pet', { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { invalidate(); return r; });
  }

  window.ChildUniverse = {
    load: load,
    invalidate: invalidate,
    patchAvatar: patchAvatar,
    patchHouse: patchHouse,
    adoptPet: adoptPet,
    get cache() { return _cache; },
  };
})();
