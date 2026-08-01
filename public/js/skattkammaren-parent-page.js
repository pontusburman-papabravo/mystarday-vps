/**
 * skattkammaren-parent-page.js — Parent Skattkammaren (treasury) page logic.
 */
(function () {
  'use strict';

  let _children = [];
  let _selectedId = null;

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setView(state) {
    const placeholder = document.getElementById('placeholderState');
    const loading = document.getElementById('loadingState');
    const treasury = document.getElementById('treasuryView');
    if (placeholder) placeholder.classList.toggle('hidden', state !== 'placeholder');
    if (loading) loading.classList.toggle('hidden', state !== 'loading');
    if (treasury) treasury.classList.toggle('hidden', state !== 'treasury');
  }

  function renderChildChips() {
    const container = document.getElementById('childChips');
    if (!container) return;
    if (_children.length === 0) {
      container.innerHTML =
        '<div class="text-center py-6 bg-sky/50 rounded-2xl border-2 border-dashed border-lavender w-full">' +
        '<p class="text-2xl mb-1">👶</p>' +
        '<p class="font-heading font-bold text-navy text-sm mb-1">Inga barn tillagda</p>' +
        '<p class="text-xs text-text-soft">Lägg till barn under <a href="/family" class="text-gold underline font-semibold">Familjen &amp; inställningar</a></p>' +
        '</div>';
      return;
    }
    container.innerHTML = _children.map(function (c) {
      return '<button id="chip-' + c.id + '" onclick="selectChild(\'' + c.id + '\')" class="child-chip ' +
        (_selectedId === c.id ? 'active' : '') + '">' +
        '<span style="font-size:1.3rem;">' + (c.emoji || '⭐') + '</span>' +
        '<span>' + escHtml(c.name) + '</span></button>';
    }).join('');
  }

  async function loadChildren() {
    try {
      const res = await window.apiFetch('/api/children');
      if (!res.ok) throw new Error('API error');
      _children = await res.json();
      renderChildChips();
      if (_children.length === 1) selectChild(_children[0].id);
    } catch (_e) {
      const chips = document.getElementById('childChips');
      if (chips) chips.innerHTML = '<p class="text-sm text-red-500">Kunde inte ladda barn</p>';
    }
  }

  function renderTreasury(data) {
    const rewards = data.rewards;
    const redemptions = data.redemptions;
    const child = data.child;
    const starBalance = data.starBalance;

    const heroBalanceNum = document.getElementById('heroBalanceNum');
    const heroChildName = document.getElementById('heroChildName');
    const heroBalance = document.getElementById('heroBalance');
    if (heroBalanceNum) heroBalanceNum.textContent = '⭐ ' + starBalance;
    if (heroChildName) heroChildName.textContent = (child.emoji || '') + ' ' + child.name;
    if (heroBalance) {
      heroBalance.style.display = 'flex';
      heroBalance.classList.remove('hidden');
    }

    const earned = redemptions.filter(function (r) { return r.status === 'approved' || r.status === 'auto'; });
    const pending = redemptions.filter(function (r) { return r.status === 'pending'; });
    setView('treasury');

    const trophySection = document.getElementById('trophySection');
    const trophyGrid = document.getElementById('trophyGrid');
    if (trophySection && trophyGrid) {
      if (earned.length > 0) {
        trophyGrid.innerHTML = earned.map(function (r, i) {
          return '<div class="trg-item earned" style="animation-delay:' + (i * 40) + 'ms;">' +
            '<span class="trg-badge">✅</span><div class="trg-icon">' + (r.reward_icon || '🎁') + '</div>' +
            '<div class="trg-name">' + escHtml(r.reward_name) + '</div></div>';
        }).join('');
        trophySection.classList.remove('hidden');
      } else {
        trophySection.classList.add('hidden');
      }
    }

    const rewardsSection = document.getElementById('rewardsSection');
    const rewardsGrid = document.getElementById('rewardsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!rewardsSection || !rewardsGrid) return;

    if (rewards.length === 0) {
      rewardsSection.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      const activeRewards = rewards.filter(function (r) {
        return !earned.some(function (rd) { return rd.reward_id === r.id; });
      });
      if (activeRewards.length === 0) {
        rewardsSection.classList.add('hidden');
      } else {
        rewardsGrid.innerHTML = activeRewards.map(function (r, i) {
          return renderRewardCard(r, i, starBalance, pending);
        }).join('');
        rewardsSection.classList.remove('hidden');
      }
    }
  }

  function renderRewardCard(r, i, starBalance, pending) {
    const hasPending = pending.some(function (rd) { return rd.reward_id === r.id; });
    const canAfford = starBalance >= r.star_cost;
    const cardClass = hasPending ? 'pending' : canAfford ? 'affordable' : 'locked';
    const pct = Math.min(100, Math.round((starBalance / r.star_cost) * 100));
    const starsLeft = Math.max(0, r.star_cost - starBalance);
    const progressHtml = hasPending
      ? '<p class="trg-progress-text">⏳ Väntar på godkännande</p>'
      : canAfford
        ? '<p class="trg-progress-text">🌟 Redo att lösa in!</p>'
        : '<div class="trg-bar"><div class="trg-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<p class="trg-progress-text">' + starBalance + ' / ' + r.star_cost + ' ⭐ · ' + starsLeft + ' kvar</p>';
    return '<div class="trg-item ' + cardClass + '" style="animation-delay:' + (i * 35) + 'ms;">' +
      (hasPending ? '<span class="trg-badge">⏳</span>' : canAfford ? '<span class="trg-badge">🌟</span>' : '') +
      '<div class="trg-icon">' + (r.icon || '🎁') + '</div>' +
      '<div class="trg-name">' + escHtml(r.name) + '</div>' +
      '<div class="trg-cost">⭐ ' + r.star_cost + '</div>' +
      progressHtml +
      '</div>';
  }

  async function selectChild(childId) {
    _selectedId = childId;
    document.querySelectorAll('.child-chip').forEach(function (btn) {
      btn.classList.toggle('active', btn.id === 'chip-' + childId);
    });
    setView('loading');
    try {
      const res = await window.apiFetch('/api/rewards/child-view/' + childId);
      if (!res.ok) throw new Error('API error');
      renderTreasury(await res.json());
    } catch (_e) {
      setView('placeholder');
      if (window.showToast) showToast('Kunde inte ladda Skattkammaren', 'error');
    }
  }

  window.selectChild = selectChild;

  async function bootSkattkammarenPage() {
    if (!window.Auth || !Auth.isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    _selectedId = null;
    setView('placeholder');
    await loadChildren();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSkattkammarenPage);
  }
  if (window.ParentMagicPageBoot) {
    ParentMagicPageBoot.register('skattkammaren', bootSkattkammarenPage);
  }
})();
