/**
 * pending-approvals.js — Shared pending redemption/goal-change UI (vuxenmeny v2.1 Sprint 2).
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  async function fetchPending() {
    var res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error('Kunde inte ladda förfrågningar');
    return res.json();
  }

  function rowHtml(req, type) {
    var label =
      type === 'goal'
        ? '🎯 Vill byta mål till ' + esc(req.to_reward_name || '') + ' ' + esc(req.to_reward_icon || '')
        : '🎁 ' + esc(req.reward_name || '') + ' (⭐ ' + (req.star_cost || 0) + ')';
    return (
      '<div class="flex items-center gap-2 p-3 bg-white rounded-xl border border-lavender">' +
      '<span class="flex-1 text-sm font-semibold text-navy">' + label + '</span>' +
      '<button type="button" data-pending-action="approve" data-pending-type="' + esc(type) + '" data-pending-id="' + esc(req.id) + '" class="min-h-[40px] px-3 bg-green-500 text-white text-xs font-bold rounded-lg">✅</button>' +
      '<button type="button" data-pending-action="deny" data-pending-type="' + esc(type) + '" data-pending-id="' + esc(req.id) + '" class="min-h-[40px] px-3 bg-red-100 text-red-700 text-xs font-bold rounded-lg">❌</button>' +
      '</div>'
    );
  }

  function renderList(data, opts) {
    opts = opts || {};
    var childId = opts.childId || null;
    var childName = opts.childName || '';
    var redemptions = data.pending_redemptions || [];
    var goals = data.pending_goal_changes || [];
    if (childId) {
      redemptions = redemptions.filter(function (r) { return r.child_id === childId; });
      goals = goals.filter(function (r) { return r.child_id === childId; });
    }

    if (!redemptions.length && !goals.length) {
      return opts.emptyHtml || '<p class="text-sm text-text-soft text-center py-4">Inga väntande förfrågningar 🎉</p>';
    }

    var html = '<div class="space-y-2 pending-approvals-list">';
    if (opts.heading) {
      html += '<h2 class="text-lg font-heading font-bold text-navy mb-2">' + esc(opts.heading) + '</h2>';
    }
    goals.forEach(function (req) {
      var name = childName || req.child_name || '';
      html += rowHtml(req, 'goal') +
        (name && !childId ? '<p class="text-xs text-text-soft -mt-1 mb-1 pl-1">' + esc(name) + '</p>' : '');
    });
    redemptions.forEach(function (req) {
      var name = childName || req.child_name || '';
      html += rowHtml(req, 'redemption') +
        (name && !childId ? '<p class="text-xs text-text-soft -mt-1 mb-1 pl-1">' + esc(name) + '</p>' : '');
    });
    html += '</div>';
    return html;
  }

  function bindRowActions(container) {
    if (!container || container._pendingBound) return;
    container._pendingBound = true;
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-pending-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-pending-action');
      var type = btn.getAttribute('data-pending-type');
      var id = btn.getAttribute('data-pending-id');
      if (!id || !type) return;
      btn.disabled = true;
      var fn;
      if (action === 'approve') {
        fn = type === 'goal' ? approveGoal : approveRedemption;
      } else {
        fn = type === 'goal' ? denyGoal : denyRedemption;
      }
      fn(id).then(function () {
        if (typeof showToast === 'function') {
          if (action === 'approve') {
            showToast(type === 'goal' ? '🎯 Målbyte godkänt!' : '🎉 Inlösen godkänd!');
          } else {
            showToast(type === 'goal' ? 'Målbyte nekat.' : 'Inlösen nekad.');
          }
        }
        document.dispatchEvent(new CustomEvent('pending-approvals-changed'));
      }).catch(function (err) {
        if (typeof showToast === 'function') showToast((err && err.message) || 'Kunde inte uppdatera', true);
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }

  async function approveGoal(requestId) {
    var res = await window.apiFetch('/api/rewards/goal-change-requests/' + encodeURIComponent(requestId) + '/approve', { method: 'PUT' });
    if (!res.ok) { var e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  async function denyGoal(requestId) {
    var res = await window.apiFetch('/api/rewards/goal-change-requests/' + encodeURIComponent(requestId) + '/deny', { method: 'PUT' });
    if (!res.ok) { var e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  async function approveRedemption(redemptionId) {
    var res = await window.apiFetch('/api/rewards/redemptions/' + encodeURIComponent(redemptionId) + '/approve', { method: 'PUT' });
    if (!res.ok) { var e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  async function denyRedemption(redemptionId) {
    var res = await window.apiFetch('/api/rewards/redemptions/' + encodeURIComponent(redemptionId) + '/deny', { method: 'PUT' });
    if (!res.ok) { var e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  window.PendingApprovals = {
    fetchPending: fetchPending,
    renderList: renderList,
    bindRowActions: bindRowActions,
    approveGoal: approveGoal,
    denyGoal: denyGoal,
    approveRedemption: approveRedemption,
    denyRedemption: denyRedemption,
    mountHub: async function (mountEl) {
      if (!mountEl) return;
      mountEl.innerHTML = '<p class="text-sm text-text-soft py-2">Laddar förfrågningar…</p>';
      try {
        var data = await fetchPending();
        var total = (data.pending_redemptions || []).length + (data.pending_goal_changes || []).length;
        if (!total) {
          mountEl.innerHTML = '';
          mountEl.classList.add('hidden');
          return;
        }
        mountEl.classList.remove('hidden');
        mountEl.innerHTML = renderList(data, { heading: 'Kräver godkännande (' + total + ')' });
        bindRowActions(mountEl);
      } catch (_) {
        mountEl.innerHTML = '<p class="text-sm text-coral py-2">Kunde inte ladda förfrågningar.</p>';
      }
    },
  };
})();
