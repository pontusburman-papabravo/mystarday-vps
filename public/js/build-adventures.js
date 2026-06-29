/**
 * build-adventures.js — Mobil äventyrsväljare (7 MVP-projekt)
 */
(function () {
  'use strict';

  const PREVIEW_CATALOG = [
    { slug: 'racerbil', name: 'Mecka med bilen', icon: '🏎️', description: 'Bygg bilen och mecka i garaget.', parts_required: 6, unlock_label: 'Garaget' },
    { slug: 'husdjur', name: 'Ta hand om husdjur', icon: '🐾', description: 'Hund, katt, hamster eller häst.', parts_required: 8, unlock_label: 'Husdjurshemmet' },
    { slug: 'dinosaurie', name: 'Forska om dinosaurier', icon: '🦕', description: 'Gräv, montera och lär dig fakta.', parts_required: 10, unlock_label: 'Dino-dalen' },
    { slug: 'dockhus', name: 'Dockor & dockhus', icon: '🏠', description: 'Bygg rum och inred minihemmet.', parts_required: 8, unlock_label: 'Dockhuset' },
    { slug: 'fiske', name: 'Fiska & båtliv', icon: '🎣', description: 'Båt, spö och fångst.', parts_required: 8, unlock_label: 'Båtkajen' },
    { slug: 'laxor', name: 'Läxor & lärande', icon: '📚', description: 'Bokstäver, siffror, läsa och matte.', parts_required: 6, unlock_label: 'Läxbordet' },
    { slug: 'vardag', name: 'Vardagsäventyr', icon: '⭐', description: 'Samma som ditt schema — bädda säng, tänder…', parts_required: 6, unlock_label: 'Mitt rum' },
  ];

  const $ = (id) => document.getElementById(id);

  function isPreview() {
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }

  function haptic(kind) {
    if (window.BuildGameMobile) BuildGameMobile.haptic(kind || 'medium');
  }

  function renderCards(catalog, active) {
    const grid = $('advGrid');
    if (!grid) return;
    grid.innerHTML = catalog.map(function (a) {
      const isActive = active && active.catalog_slug === a.slug;
      return '<button type="button" class="adv-card' + (isActive ? ' is-active' : '') +
        '" data-slug="' + a.slug + '">' +
        '<span class="adv-card-icon">' + a.icon + '</span>' +
        '<span class="adv-card-name">' + a.name + '</span>' +
        '<span class="adv-card-desc">' + (a.description || '') + '</span>' +
        '<span class="adv-card-meta">🧩 ' + a.parts_required + ' delar → ' + (a.unlock_label || a.world_label || 'värld') + '</span>' +
        '</button>';
    }).join('');

    grid.querySelectorAll('.adv-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startAdventure(btn.getAttribute('data-slug'));
      });
    });
    grid.hidden = false;
  }

  function showActive(project) {
    const el = $('advActive');
    if (!el || !project) return;
    el.hidden = false;
    el.textContent = 'Pågår: ' + project.icon + ' ' + project.name + ' (' +
      project.parts_collected + '/' + project.parts_required + ' delar)';
  }

  async function startAdventure(slug) {
    haptic('medium');
    if (isPreview()) {
      showToast('Förhandsvisning — logga in som barn för att starta');
      return;
    }
    try {
      const res = await Auth.api('/api/me/build/start', {
        method: 'POST',
        body: JSON.stringify({ catalog_slug: slug }),
      });
      haptic('success');
      showActive(res.project);
      showToast(res.message || 'Äventyr startat!');
      setTimeout(function () {
        window.location.href = '/child-dashboard';
      }, 900);
    } catch (err) {
      haptic('error');
      showToast((err && err.message) || 'Kunde inte starta');
    }
  }

  function showToast(msg) {
    let t = document.getElementById('advToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'advToast';
      t.style.cssText = 'position:fixed;bottom:calc(env(safe-area-inset-bottom,16px) + 16px);left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:16px;background:#1B2340;color:#fff;font-weight:700;font-size:0.85rem;z-index:100;max-width:90vw;text-align:center';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { t.style.display = 'none'; }, 2800);
  }

  async function init() {
    $('advLoading').hidden = false;
    if (isPreview()) {
      renderCards(PREVIEW_CATALOG, null);
      $('advLoading').hidden = true;
      return;
    }
    if (!window.Auth || typeof Auth.api !== 'function') {
      $('advLoading').textContent = 'Logga in som barn först.';
      return;
    }
    try {
      const data = await Auth.api('/api/me/build');
      const catalog = (data.catalog && data.catalog.length) ? data.catalog : PREVIEW_CATALOG;
      renderCards(catalog, data.active_project);
      if (data.active_project) showActive(data.active_project);
    } catch (_) {
      renderCards(PREVIEW_CATALOG, null);
    }
    $('advLoading').hidden = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
