/**
 * planning-hub.js — Thin planning hub (vuxenmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  var LINKS = [
    { href: '/schedule', icon: '📅', title: 'Veckoschema', sub: 'Redigera barnets vecka' },
    { href: '/daily-log', icon: '📝', title: 'Daglig logg', sub: 'Bocka av och backfill' },
    { href: '/calendar', icon: '🗓️', title: 'Kalender', sub: 'Månad och specialdagar' },
    { href: '/library', icon: '📚', title: 'Bibliotek', sub: 'Aktiviteter och scheman' },
    { href: '/assign-schedule', icon: '📋', title: 'Tilldela schema', sub: 'Kopiera mall till barn' },
    { href: '/activities', icon: '➕', title: 'Aktiviteter', sub: 'Hantera aktivitetsbibliotek' },
  ];

  function trackClick(label) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'nav_hub_click', { hub: 'planning', label: label });
    }
  }

  function render() {
    var mount = document.getElementById('planningHubMount');
    if (!mount) return;
    mount.innerHTML =
      '<div class="grid gap-3 max-w-lg">' +
      LINKS.map(function (l) {
        return '<a href="' + l.href + '" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px]" data-hub-link="' + l.title + '">' +
          '<span class="text-2xl" aria-hidden="true">' + l.icon + '</span>' +
          '<span><span class="font-heading font-bold text-navy block">' + l.title + '</span>' +
          '<span class="text-sm text-text-soft">' + l.sub + '</span></span></a>';
      }).join('') +
      '</div>';

    mount.querySelectorAll('[data-hub-link]').forEach(function (el) {
      el.addEventListener('click', function () {
        trackClick(el.getAttribute('data-hub-link'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
