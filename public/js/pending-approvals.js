/**
 * pending-approvals.js — Shared pending redemption/goal-change UI (vuxenmeny v2.1 Sprint 2).
 */
(function () {
  'use strict';

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  async function fetchPending() {
    const res = await window.apiFetch('/api/rewards/pending-requests');
    if (!res.ok) throw new Error(pt('home.approvals.loadError'));
    return res.json();
  }

  function rowHtml(req, type, opts) {
    opts = opts || {};
    const childName = req.child_name ? esc(req.child_name) : '';
    let label;
    if (type === 'goal') {
      label = childName
        ? pt('home.approvals.wantsGoalNamed', { name: childName, reward: esc(req.to_reward_name || ''), icon: esc(req.to_reward_icon || '') })
        : pt('home.approvals.wantsGoalAnon', { reward: esc(req.to_reward_name || ''), icon: esc(req.to_reward_icon || '') });
    } else if (opts.hub && childName) {
      label = pt('home.approvals.wantsRedeemNamed', { name: childName, reward: esc(req.reward_name || ''), cost: req.star_cost || 0 });
    } else {
      label = pt('home.approvals.wantsRedeemAnon', { reward: esc(req.reward_name || ''), cost: req.star_cost || 0 });
    }
    const cardClass = opts.hub
      ? 'flex items-center gap-2 p-3 bg-white rounded-2xl border border-lavender parent-glass-card'
      : 'flex items-center gap-2 p-3 bg-white rounded-xl border border-lavender';
    const approveLabel = opts.hub ? pt('home.approvals.approve') : '✅';
    return (
      '<div class="' + cardClass + '">' +
      '<span class="flex-1 text-sm font-semibold text-navy leading-snug">' + label + '</span>' +
      '<button type="button" data-pending-action="approve" data-pending-type="' + esc(type) + '" data-pending-id="' + esc(req.id) + '" class="min-h-[44px] px-3 bg-green-500 text-white text-xs font-bold rounded-lg flex-shrink-0">' + approveLabel + '</button>' +
      '<button type="button" data-pending-action="deny" data-pending-type="' + esc(type) + '" data-pending-id="' + esc(req.id) + '" class="min-h-[44px] px-3 bg-red-100 text-red-700 text-xs font-bold rounded-lg flex-shrink-0" aria-label="' + pt('home.approvals.deny') + '">❌</button>' +
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
      return opts.emptyHtml != null ? opts.emptyHtml : '<p class="text-sm text-text-soft text-center py-4">' + pt('home.approvals.empty') + '</p>';
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
            showToast(type === 'goal' ? pt('home.approvals.goalApproved') : pt('home.approvals.redemptionApproved'));
          } else {
            showToast(type === 'goal' ? pt('home.approvals.goalDenied') : pt('home.approvals.redemptionDenied'));
          }
        }
        document.dispatchEvent(new CustomEvent('pending-approvals-changed'));
      }).catch(function (err) {
        if (typeof showToast === 'function') showToast((err && err.message) || pt('home.approvals.updateFailed'), true);
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }

  async function approveGoal(requestId) {
    const res = await window.apiFetch('/api/rewards/goal-change-requests/' + encodeURIComponent(requestId) + '/approve', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || pt('home.approvals.genericError')); }
  }

  async function denyGoal(requestId) {
    const res = await window.apiFetch('/api/rewards/goal-change-requests/' + encodeURIComponent(requestId) + '/deny', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || pt('home.approvals.genericError')); }
  }

  async function approveRedemption(redemptionId) {
    const res = await window.apiFetch('/api/rewards/redemptions/' + encodeURIComponent(redemptionId) + '/approve', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || pt('home.approvals.genericError')); }
  }

  async function denyRedemption(redemptionId) {
    const res = await window.apiFetch('/api/rewards/redemptions/' + encodeURIComponent(redemptionId) + '/deny', { method: 'PUT' });
    if (!res.ok) { const e = await res.json().catch(function () { return {}; }); throw new Error(e.error || pt('home.approvals.genericError')); }
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
      mountEl.innerHTML = '<p class="text-sm text-text-soft py-2">' + pt('home.approvals.loading') + '</p>';
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
        const heading = total > 1 ? pt('home.approvals.requiresApprovalCount', { count: total }) : pt('home.approvals.requiresApproval');
        mountEl.innerHTML = renderList(data, {
          heading: heading,
          hub: opts.hub,
          emptyHtml: '',
        });
        bindRowActions(mountEl);
      } catch (_) {
        mountEl.innerHTML = '<p class="text-sm text-coral py-2">' + pt('home.approvals.loadError') + '</p>';
      }
    },
  };
})();
