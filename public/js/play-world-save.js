/**
 * play-world-save.js — Delad laddning/sparning för handgjorda lek-världar.
 */
(function () {
  'use strict';

  const SLUG_API = {
    husdjur: '/api/me/build/play/husdjur',
  };

  let saveTimer = null;

  function isPreview() {
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }

  function isChildUser(user) {
    return !!(user && user.type === 'child');
  }

  function normalizeLocal(slug, raw, defaults) {
    if (slug === 'husdjur' && window.PetHome && PetHome.normalizeState) {
      return PetHome.normalizeState(raw);
    }
    return Object.assign({}, defaults || {}, raw || {});
  }

  async function load(slug, defaults) {
    if (!window.Auth || typeof Auth.api !== 'function') {
      if (isPreview()) return { preview: true, state: normalizeLocal(slug, {}, defaults) };
      throw new Error('Inloggning saknas');
    }

    let me = null;
    try { me = await Auth.api('/api/auth/me'); } catch (_) { me = null; }

    if (!isChildUser(me)) {
      if (isPreview()) return { preview: true, state: normalizeLocal(slug, {}, defaults) };
      throw new Error('Logga in som barn');
    }

    const qs = isPreview() ? '?preview=1' : '';
    const endpoint = SLUG_API[slug];
    if (!endpoint) throw new Error('Okänd värld');

    const data = await Auth.api(endpoint + qs);
    const state = data.customization || data.state || defaults;
    return { preview: isPreview(), state: normalizeLocal(slug, state, defaults), project: data.project };
  }

  function saveNow(slug, state) {
    const endpoint = SLUG_API[slug];
    if (!endpoint || !window.Auth) return Promise.resolve(state);
    return Auth.api(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(state),
    }).then(function (res) {
      return res.customization || res.state || state;
    });
  }

  function saveDebounced(slug, state, ms) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveNow(slug, state).catch(function () {});
    }, ms || 800);
  }

  window.PlayWorldSave = {
    load: load,
    saveNow: saveNow,
    saveDebounced: saveDebounced,
    isPreview: isPreview,
  };
})();
