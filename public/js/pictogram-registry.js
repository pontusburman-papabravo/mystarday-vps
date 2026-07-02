/**
 * pictogram-registry.js — client cache for /api/pictograms (parent UI).
 */
(function () {
  'use strict';

  let _map = null;
  let _loadPromise = null;

  function buildMap(list) {
    const map = {};
    (list || []).forEach(function (p) {
      if (p && p.key) map[p.key] = p;
    });
    return map;
  }

  function load() {
    if (_map) return Promise.resolve(_map);
    if (_loadPromise) return _loadPromise;
    _loadPromise = fetch('/api/pictograms', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('pictograms fetch failed');
        return res.json();
      })
      .then(function (data) {
        const list = Array.isArray(data) ? data : (data.pictograms || []);
        _map = buildMap(list);
        return _map;
      })
      .catch(function () {
        _map = {};
        return _map;
      });
    return _loadPromise;
  }

  function getEmoji(key) {
    if (!_map || !key) return null;
    const row = _map[key];
    return row && row.emoji ? row.emoji : null;
  }

  function getUrl(key) {
    if (!_map || !key) return null;
    const row = _map[key];
    return row && row.url ? row.url : null;
  }

  window.PictogramRegistry = {
    load: load,
    getEmoji: getEmoji,
    getUrl: getUrl,
  };
})();
