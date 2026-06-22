/**
 * home-bump-time.js — Hem PX2: +15/+30 min bump-tid per barn (v2.3).
 */
(function () {
  'use strict';

  var snapshots = {};

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function eligibleChildren(stats) {
    if (!stats || !stats.children) return [];
    return stats.children.filter(function (c) {
      return c.today_log_id && !c.today_is_paused && (c.today_total || 0) > 0;
    });
  }

  function render(stats) {
    var mount = document.getElementById('homeBumpMount');
    if (!mount) return;
    var children = eligibleChildren(stats);
    if (!children.length) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }
    mount.classList.remove('hidden');
    mount.innerHTML =
      '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4">' +
      '<p class="text-sm font-semibold text-navy mb-3">⏱ Justera tid idag</p>' +
      children.map(function (c) {
        return '<div class="flex items-center justify-between gap-2 py-2 border-b border-lavender last:border-0" data-bump-child="' + esc(c.id) + '">' +
          '<span class="text-sm font-semibold text-navy truncate">' + esc(c.emoji || '⭐') + ' ' + esc(c.name) + '</span>' +
          '<div class="flex gap-1 flex-shrink-0">' +
          '<button type="button" class="px-3 py-2 bg-sky rounded-lg text-xs font-bold text-navy min-h-[40px]" data-bump-min="15" data-log-id="' + esc(c.today_log_id) + '">+15</button>' +
          '<button type="button" class="px-3 py-2 bg-sky rounded-lg text-xs font-bold text-navy min-h-[40px]" data-bump-min="30" data-log-id="' + esc(c.today_log_id) + '">+30</button>' +
          '<button type="button" class="px-2 py-2 bg-lavender rounded-lg text-xs font-semibold text-text-soft min-h-[40px] opacity-60" data-bump-undo data-log-id="' + esc(c.today_log_id) + '" disabled>↩</button>' +
          '</div></div>';
      }).join('') +
      '</div>';

    mount.querySelectorAll('[data-bump-min]').forEach(function (btn) {
      btn.addEventListener('click', function () { bump(btn); });
    });
    mount.querySelectorAll('[data-bump-undo]').forEach(function (btn) {
      btn.addEventListener('click', function () { undo(btn); });
    });
  }

  async function bump(btn) {
    var logId = btn.getAttribute('data-log-id');
    var minutes = parseInt(btn.getAttribute('data-bump-min'), 10);
    if (!logId || !minutes) return;
    btn.disabled = true;
    try {
      var res = await window.apiFetch('/api/daily-logs/' + encodeURIComponent(logId) + '/bump-time', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: minutes }),
      });
      if (!res.ok) throw new Error('bump failed');
      var data = await res.json();
      snapshots[logId] = data.snapshot;
      var undoBtn = btn.parentElement.querySelector('[data-bump-undo]');
      if (undoBtn) { undoBtn.disabled = false; undoBtn.classList.remove('opacity-60'); }
      showToast('+' + minutes + ' min');
      if (typeof window.loadDashboardCards === 'function') await window.loadDashboardCards();
    } catch (_) {
      showToast('Kunde inte justera tid', true);
    } finally {
      btn.disabled = false;
    }
  }

  async function undo(btn) {
    var logId = btn.getAttribute('data-log-id');
    var snapshot = snapshots[logId];
    if (!logId || !snapshot) return;
    btn.disabled = true;
    try {
      var res = await window.apiFetch('/api/daily-logs/' + encodeURIComponent(logId) + '/bump-time-undo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: snapshot }),
      });
      if (!res.ok) throw new Error('undo failed');
      delete snapshots[logId];
      btn.disabled = true;
      btn.classList.add('opacity-60');
      showToast('Ångrat');
      if (typeof window.loadDashboardCards === 'function') await window.loadDashboardCards();
    } catch (_) {
      showToast('Kunde inte ångra', true);
    } finally {
      btn.disabled = !snapshots[logId];
    }
  }

  window.HomeBumpTime = { render: render };
})();
