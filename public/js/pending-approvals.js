/**
 * pending-approvals.js — Shared pending redemption/goal-change UI (vuxenmeny v2.1 Sprint 2).
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  async function fetchPending() {
    const res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error('Kunde inte ladda förfrågningar');
    return res.json();
  }

  function rowHtml(req, type, opts) {
    opts = opts || {};
    const childName = req.child_name ? esc(req.child_name) : '';
    let label;
    if (type === 'goal') {
      label = childName
        ? childName + ' vill byta mål till ' + esc(req.to_reward_name || '') + ' ' + esc(req.to_reward_icon || '')
        : '🎯 Vill byta mål till ' + esc(req.to_reward_name || '') + ' ' + esc(req.to_reward_icon || '');
    } else if (opts.hub && childName) {
      label = childName + ' vill ha "' + esc(req.reward_name || '') + '" (' + (req.star_cost || 0) + ' ⭐)';
    } else {
      label = '🎁 ' + esc(req.reward_name || '') + ' (⭐ ' + (req.star_cost || 0) + ')';
    }
    const cardClass = opts.hub
      ? 'flex items-center gap-2 p-3 bg-white rounded-2xl border border-lavender parent-glass-card'
      : 'flex items-center gap-2 p-3 bg-white rounded-xl border border-lavender';
    const approveLabel = opts.hub ? 'Godkänn' : '✅';
    return (
      '<div class="' + cardClass + '">' +
      '<span class="flex-1 text-sm font-semibold text-navy leading-snug">' + label + '</span>' +
      '<button type="button" data-pending-action="approve" data-pending-type="' + esc(type) + '" data-pending-id="' + esc(req.id) + '" class="min-h-[44px] px-3 bg-green-500 text-white text-xs font-bold rounded-lg flex-shrink-0">' + approveLabel + '</button>' +
      '<button type="button" data-pending-action="deny" data-pending-type="' + esc(type) + '" data-pending-id="' + esc(req.id) + '" class="min-h-[44px] px-3 bg-red-100 text-red-700 text-xs font-bold rounded-lg flex-shrink-0" aria-label="Neka">❌</button>' +
      '</div>'
    );
  }

  function renderList(data, opts) {
    opts = opts || {};
    const childId = opts.childId || null;
    const childName = opts.childName || '';
    let redemptions = data.pending_redemptions || [];
    let goals = data.pending_goal_changes || [];
    if (childId) {
      redemptions = redemptions.filter(function (r) { return r.child_id === childId; });
      goals = goals.filter(function (r) { return r.child_id === childId; });
    }

    if (!redemptions.length && !goals.length) {
      return opts.emptyHtml != null ? opts.emptyHtml : '<p class="text-sm text-text-soft text-center py-4">Inga väntande förfrågningar 🎉</p>';
    }

    const hub = !!opts.hub;
    let html = '<div class="space-y-2 pending-approvals-list">';
    if (opts.heading) {
      const headingClass = hub
        ? 'text-lg font-heading font-bold mb-2 parent-readiness-heading'
        : 'text-lg font-heading font-bold text-navy mb-2';
      html += '<h2 class="' + headingClass + '">' + esc(opts.heading) + '</h2>';
    }
    goals.forEach(function (req) {
      const name = childName || req.child_name || '';
      html += rowHtml(req, 'goal', opts) +
        (name && !childId && !hub ? '<p class="text-xs text-text-soft -mt-1 mb-1 pl-1">' + esc(name) + '</p>' : '');
    });
    redemptions.forEach(function (req) {
      const name = childName || req.child_name || '';
      html += rowHtml(req, 'redemption', opts) +
        (name && !childId && !hub ? '<p class="text-xs text-text-soft -mt-1 mb-1 pl-1">' + esc(name) + '</p>' : '');
    });
    html += '</div>';
    return html;
  }

  function bindRowActions(container) {
    if (!container || container._pendingBound) return;
    container._pendingBound = true;
    container.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-pending-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-pending-action');
      const type = btn.getAttribute('data-pending-type');
      const id = btn.getAttribute('data-pending-id');
      if (!id || !type) return;
      btn.disabled = true;
      let fn;
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
    const res = await window.apiFetch('/api/rewards/goal-change-requests/' + encodeURIComponent(requestId) + '/approve', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  async function denyGoal(requestId) {
    const res = await window.apiFetch('/api/rewards/goal-change-requests/' + encodeURIComponent(requestId) + '/deny', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  async function approveRedemption(redemptionId) {
    const res = await window.apiFetch('/api/rewards/redemptions/' + encodeURIComponent(redemptionId) + '/approve', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  async function denyRedemption(redemptionId) {
    const res = await window.apiFetch('/api/rewards/redemptions/' + encodeURIComponent(redemptionId) + '/deny', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || 'Fel'); }
  }

  window.PendingApprovals = {
    fetchPending: fetchPending,
    renderList: renderList,
    bindRowActions: bindRowActions,
    approveGoal: approveGoal,
    denyGoal: denyGoal,
    approveRedemption: approveRedemption,
    denyRedemption: denyRedemption,
    mountHub: async function (mountEl, opts) {
      opts = opts || {};
      if (!mountEl) return;
      mountEl.innerHTML = '<p class="text-sm text-text-soft py-2">Laddar förfrågningar…</p>';
      mountEl.classList.remove('hidden');
      try {
        const data = await fetchPending();
        const total = (data.pending_redemptions || []).length + (data.pending_goal_changes || []).length;
        if (!total) {
          mountEl.innerHTML = '';
          mountEl.classList.add('hidden');
          return;
        }
        mountEl.classList.remove('hidden');
        const heading = total > 1 ? 'Kräver godkännande (' + total + ')' : 'Kräver godkännande';
        mountEl.innerHTML = renderList(data, {
          heading: heading,
          hub: opts.hub,
          emptyHtml: '',
        });
        bindRowActions(mountEl);
      } catch (_) {
        mountEl.innerHTML = '<p class="text-sm text-coral py-2">Kunde inte ladda förfrågningar.</p>';
      }
    },
  };
})();
