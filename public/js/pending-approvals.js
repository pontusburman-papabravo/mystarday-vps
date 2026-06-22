/**
 * pending-approvals.js — Shared pending redemption/goal-change UI (vuxenmeny v2.1 Sprint 2).
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  async function fetchPending() {
    var res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error('Kunde inte ladda förfrågningar');
    return res.json();
  }

  function rowHtml(req, type, childId) {
    var label =
      type === 'goal'
        ? '🎯 Vill byta mål till ' + esc(req.to_reward_name || '') + ' ' + (req.to_reward_icon || '')
        : '🎁 ' + esc(req.reward_name || '') + ' (⭐ ' + (req.star_cost || 0) + ')';
    var approveFn = type === 'goal' ? 'PendingApprovals.approveGoal' : 'PendingApprovals.approveRedemption';
    var denyFn = type === 'goal' ? 'PendingApprovals.denyGoal' : 'PendingApprovals.denyRedemption';
    var id = req.id;
    return (
      '<div class="flex items-center gap-2 p-3 bg-white rounded-xl border border-lavender">' +
      '<span class="flex-1 text-sm font-semibold text-navy">' + label + '</span>' +
      '<button type="button" onclick="' + approveFn + "('" + id + "','" + childId + '\')" class="min-h-[40px] px-3 bg-green-500 text-white text-xs font-bold rounded-lg">✅</button>' +
      '<button type="button" onclick="' + denyFn + "('" + id + "','" + childId + '\')" class="min-h-[40px] px-3 bg-red-100 text-red-700 text-xs font-bold rounded-lg">❌</button>' +
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

    var html = '<div class="space-y-2">';
    if (opts.heading) {
      html += '<h2 class="text-lg font-heading font-bold text-navy mb-2">' + esc(opts.heading) + '</h2>';
    }
    goals.forEach(function (req) {
      var name = childName || req.child_name || '';
      html += rowHtml(req, 'goal', req.child_id) +
        (name && !childId ? '<p class="text-xs text-text-soft -mt-1 mb-1 pl-1">' + esc(name) + '</p>' : '');
    });
    redemptions.forEach(function (req) {
      var name = childName || req.child_name || '';
      html += rowHtml(req, 'redemption', req.child_id) +
        (name && !childId ? '<p class="text-xs text-text-soft -mt-1 mb-1 pl-1">' + esc(name) + '</p>' : '');
    });
    html += '</div>';
    return html;
  }

  async function approveGoal(requestId) {
    var res = await window.apiFetch('/api/rewards/goal-change-requests/' + requestId + '/approve', { method: 'PUT' });
    if (!res.ok) { var e = await res.json(); throw new Error(e.error || 'Fel'); }
  }

  async function denyGoal(requestId) {
    var res = await window.apiFetch('/api/rewards/goal-change-requests/' + requestId + '/deny', { method: 'PUT' });
    if (!res.ok) { var e = await res.json(); throw new Error(e.error || 'Fel'); }
  }

  async function approveRedemption(redemptionId) {
    var res = await window.apiFetch('/api/rewards/redemptions/' + redemptionId + '/approve', { method: 'PUT' });
    if (!res.ok) { var e = await res.json(); throw new Error(e.error || 'Fel'); }
  }

  async function denyRedemption(redemptionId) {
    var res = await window.apiFetch('/api/rewards/redemptions/' + redemptionId + '/deny', { method: 'PUT' });
    if (!res.ok) { var e = await res.json(); throw new Error(e.error || 'Fel'); }
  }

  window.PendingApprovals = {
    fetchPending: fetchPending,
    renderList: renderList,
    approveGoal: async function (id) {
      await approveGoal(id);
      if (typeof showToast === 'function') showToast('🎯 Målbyte godkänt!');
      document.dispatchEvent(new CustomEvent('pending-approvals-changed'));
    },
    denyGoal: async function (id) {
      await denyGoal(id);
      if (typeof showToast === 'function') showToast('Målbyte nekat.');
      document.dispatchEvent(new CustomEvent('pending-approvals-changed'));
    },
    approveRedemption: async function (id) {
      await approveRedemption(id);
      if (typeof showToast === 'function') showToast('🎉 Inlösen godkänd!');
      document.dispatchEvent(new CustomEvent('pending-approvals-changed'));
    },
    denyRedemption: async function (id) {
      await denyRedemption(id);
      if (typeof showToast === 'function') showToast('Inlösen nekad.');
      document.dispatchEvent(new CustomEvent('pending-approvals-changed'));
    },
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
      } catch (_) {
        mountEl.innerHTML = '<p class="text-sm text-coral py-2">Kunde inte ladda förfrågningar.</p>';
      }
    },
  };
})();
