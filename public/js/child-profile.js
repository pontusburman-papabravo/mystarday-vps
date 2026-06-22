/**
 * child-profile.js — Barnprofil /family/child/:id (vuxenmeny v2 Sprint 3).
 */
(function () {
  'use strict';

  var TABS = [
    { id: 'overview', label: 'Översikt' },
    { id: 'log', label: 'Daglig logg' },
    { id: 'schema', label: 'Schema' },
    { id: 'rewards', label: 'Belöningar' },
    { id: 'progress', label: 'Framsteg' },
    { id: 'setup', label: 'Inställningar' },
    { id: 'child-view', label: 'Barnvy' },
  ];

  var childId = null;
  var child = null;
  var dashRow = null;

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function parseChildId() {
    var parts = (window.location.pathname || '').split('/').filter(Boolean);
    var idx = parts.indexOf('child');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return null;
  }

  function currentTab() {
    var p = new URLSearchParams(window.location.search);
    return p.get('tab') || 'overview';
  }

  function setTab(tab) {
    var url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.pathname + url.search);
    render();
  }

  async function loadData() {
    childId = parseChildId();
    if (!childId) throw new Error('Saknar barn-id');

    var statsRes = await window.apiFetch('/api/family/dashboard-stats');
    if (!statsRes.ok) throw new Error('Kunde inte ladda status');
    var stats = await statsRes.json();
    dashRow = (stats.children || []).find(function (c) { return c.id === childId; });

    var childRes = await window.apiFetch('/api/children/' + encodeURIComponent(childId));
    if (!childRes.ok) throw new Error('Barn hittades inte');
    child = await childRes.json();
  }

  function quickActionsHtml() {
    var paused = dashRow && dashRow.today_is_paused;
    var logId = dashRow && dashRow.today_log_id;
    return '<div class="grid grid-cols-2 gap-2 mb-6">' +
      '<button type="button" data-action="pause" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px]">' +
      (paused ? '▶ Återuppta dag' : '⏸ Pausa idag') + '</button>' +
      '<button type="button" data-action="stars" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px]">⭐ Extra stjärnor</button>' +
      '<a href="/daily-log?childId=' + encodeURIComponent(childId) + '" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px] flex items-center justify-center">📝 Daglig logg</a>' +
      '<button type="button" data-action="once" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px]">📋 Engångsaktivitet</button>' +
      '</div>';
  }

  function tabContent(tab) {
    if (tab === 'overview') {
      var stars = dashRow ? (dashRow.stars_today || 0) : '—';
      var paused = dashRow && dashRow.today_is_paused;
      return quickActionsHtml() +
        '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4">' +
        '<p class="text-sm text-text-soft">Idag</p>' +
        '<p class="text-2xl font-heading font-bold text-navy">' + stars + ' ⭐</p>' +
        (paused ? '<p class="text-sm text-coral font-semibold mt-1">⏸ Pausad idag</p>' : '') +
        '</div>';
    }
    if (tab === 'log') {
      return '<a href="/daily-log?childId=' + encodeURIComponent(childId) + '" class="block p-4 bg-gold text-white rounded-xl font-bold text-center">Öppna daglig logg →</a>';
    }
    if (tab === 'schema') {
      return '<p class="text-text-soft mb-4">Redigera veckoschema för ' + esc(child.name) + '.</p>' +
        '<a href="/schedule?child=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Öppna veckoschema →</a>';
    }
    if (tab === 'rewards') {
      return quickActionsHtml() +
        '<a href="/library#rewards" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center mb-3">Hantera belöningar →</a>';
    }
    if (tab === 'progress') {
      return '<p class="text-text-soft mb-4">Stjärnor och utveckling över tid.</p>' +
        '<a href="/reports?child=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Öppna rapporter →</a>';
    }
    if (tab === 'setup') {
      return '<p class="text-text-soft mb-4">PIN, vy och anpassning.</p>' +
        '<a href="/child-settings?id=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Fullständiga barninställningar →</a>';
    }
    if (tab === 'child-view') {
      return '<p class="text-text-soft mb-4">Låt barnet logga in på denna enhet.</p>' +
        '<button type="button" id="childHandoffBtn" class="w-full p-4 bg-gold text-white rounded-xl font-bold">Barnet loggar in</button>';
    }
    return '';
  }

  function render() {
    var mount = document.getElementById('childProfileMount');
    if (!mount || !child) return;
    var tab = currentTab();
    var tabsHtml = TABS.map(function (t) {
      var active = t.id === tab ? ' bg-gold text-navy' : ' bg-white text-navy border border-lavender';
      return '<button type="button" data-tab="' + t.id + '" class="px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap' + active + '">' + t.label + '</button>';
    }).join('');

    mount.innerHTML =
      '<a href="/family" class="text-sm text-gold font-semibold mb-4 inline-block">← Familj</a>' +
      '<div class="flex items-center gap-3 mb-4">' +
      '<span class="text-4xl">' + esc(child.emoji || '⭐') + '</span>' +
      '<div><h1 class="text-2xl font-heading font-bold text-navy">' + esc(child.name) + '</h1>' +
      '<p class="text-sm text-text-soft">Barnprofil</p></div></div>' +
      '<div class="flex gap-2 overflow-x-auto pb-2 mb-6">' + tabsHtml + '</div>' +
      '<div id="childProfileTabBody">' + tabContent(tab) + '</div>';

    mount.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.getAttribute('data-tab')); });
    });

    mount.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', onQuickAction);
    });

    var handoff = document.getElementById('childHandoffBtn');
    if (handoff) {
      handoff.addEventListener('click', function () {
        if (window.Auth && Auth.logout) Auth.logout({ childFlow: true });
      });
    }
  }

  async function onQuickAction(e) {
    var action = e.currentTarget.getAttribute('data-action');
    if (action === 'pause') {
      var logId = dashRow && dashRow.today_log_id;
      if (!logId) { showToast('Inget schema idag', true); return; }
      var paused = dashRow.today_is_paused;
      var ep = paused ? 'unpause' : 'pause';
      var res = await window.apiFetch('/api/daily-logs/' + logId + '/' + ep, { method: 'PUT' });
      if (!res.ok) { showToast('Kunde inte uppdatera', true); return; }
      showToast(paused ? 'Dagen återupptagen' : 'Dagen pausad');
      await loadData();
      render();
    }
    if (action === 'stars') {
      document.getElementById('manualStarModal').classList.remove('hidden');
    }
    if (action === 'once') {
      window.location.href = '/schedule?child=' + encodeURIComponent(childId) + '&once=1';
    }
  }

  async function submitManualStar() {
    var count = parseInt(document.getElementById('manualStarCount').value, 10) || 1;
    var reason = document.getElementById('manualStarReason').value.trim();
    if (!reason) { showToast('Skriv en anledning', true); return; }
    var res = await window.apiFetch('/api/rewards/manual-stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, star_count: count, reason: reason }),
    });
    if (!res.ok) { showToast('Kunde inte ge stjärnor', true); return; }
    document.getElementById('manualStarModal').classList.add('hidden');
    showToast('Stjärnor givna!');
  }

    async function boot() {
    try {
      Auth.requireAuth();
      await loadData();
      render();
      document.getElementById('manualStarCancel')?.addEventListener('click', function () {
        document.getElementById('manualStarModal').classList.add('hidden');
      });
      document.getElementById('manualStarSubmit')?.addEventListener('click', submitManualStar);
    } catch (err) {
      var mount = document.getElementById('childProfileMount');
      if (mount) mount.innerHTML = '<p class="text-coral text-center py-8">' + esc(err.message) + '</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
