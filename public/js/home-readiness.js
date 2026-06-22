/**
 * home-readiness.js — Hem readiness cards (vuxenmeny v2 Sprint 5, client-only).
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function renderCard(item) {
    return '<a href="' + esc(item.href) + '" class="block p-4 mb-3 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors">' +
      '<p class="font-semibold text-navy">' + esc(item.title) + '</p>' +
      '<p class="text-sm text-text-soft">' + esc(item.sub) + '</p></a>';
  }

  async function load() {
    var mount = document.getElementById('homeReadinessMount');
    if (!mount) return;
    try {
      var res = await window.apiFetch('/api/family/dashboard-stats');
      if (!res.ok) return;
      var data = await res.json();
      var items = [];
      (data.children || []).forEach(function (c) {
        if (!c.has_pin) {
          items.push({
            title: c.name + ' saknar PIN',
            sub: 'Sätt PIN i barnprofilen',
            href: '/family/child/' + encodeURIComponent(c.id) + '?tab=setup',
          });
        }
        if (c.today_is_paused) {
          items.push({
            title: c.name + ' — pausad idag',
            sub: 'Öppna daglig logg',
            href: '/daily-log?childId=' + encodeURIComponent(c.id),
          });
        }
      });
      if (!items.length) {
        mount.classList.add('hidden');
        return;
      }
      mount.classList.remove('hidden');
      mount.innerHTML = '<h2 class="text-lg font-heading font-bold text-navy mb-3">Kräver åtgärd</h2>' +
        items.map(renderCard).join('');
    } catch (_) {
      mount.classList.add('hidden');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
