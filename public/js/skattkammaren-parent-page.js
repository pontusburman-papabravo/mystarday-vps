/**
 * skattkammaren-parent-page.js — Parent Skattkammaren (treasury) page logic.
 */
(function () {
  'use strict';

  var _children = [];
  var _selectedId = null;

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setView(state) {
    var placeholder = document.getElementById('placeholderState');
    var loading = document.getElementById('loadingState');
    var treasury = document.getElementById('treasuryView');
    if (placeholder) placeholder.classList.toggle('hidden', state !== 'placeholder');
    if (loading) loading.classList.toggle('hidden', state !== 'loading');
    if (treasury) treasury.classList.toggle('hidden', state !== 'treasury');
  }

  function renderChildChips() {
    var container = document.getElementById('childChips');
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
      var res = await window.apiFetch('/api/children');
      if (!res.ok) throw new Error('API error');
      _children = await res.json();
      renderChildChips();
      if (_children.length === 1) selectChild(_children[0].id);
    } catch (e) {
      var chips = document.getElementById('childChips');
      if (chips) chips.innerHTML = '<p class="text-sm text-red-500">Kunde inte ladda barn</p>';
    }
  }

  function renderTreasury(data) {
    var rewards = data.rewards;
    var redemptions = data.redemptions;
    var child = data.child;
    var starBalance = data.starBalance;

    var heroBalanceNum = document.getElementById('heroBalanceNum');
    var heroChildName = document.getElementById('heroChildName');
    var heroBalance = document.getElementById('heroBalance');
    if (heroBalanceNum) heroBalanceNum.textContent = '⭐ ' + starBalance;
    if (heroChildName) heroChildName.textContent = (child.emoji || '') + ' ' + child.name;
    if (heroBalance) {
      heroBalance.style.display = 'flex';
      heroBalance.classList.remove('hidden');
    }

    var earned = redemptions.filter(function (r) { return r.status === 'approved' || r.status === 'auto'; });
    var pending = redemptions.filter(function (r) { return r.status === 'pending'; });
    setView('treasury');

    var trophySection = document.getElementById('trophySection');
    var trophyGrid = document.getElementById('trophyGrid');
    if (trophySection && trophyGrid) {
      if (earned.length > 0) {
        trophyGrid.innerHTML = earned.map(function (r, i) {
          var d = new Date(r.created_at || r.redeemed_at);
          var dateStr = isNaN(d) ? '' : d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
          return '<div class="trg-item earned" style="animation-delay:' + (i * 40) + 'ms;">' +
            '<span class="trg-badge">✅</span><div class="trg-icon">' + (r.reward_icon || '🎁') + '</div>' +
            '<div class="trg-name">' + escHtml(r.reward_name) + '</div></div>';
        }).join('');
        trophySection.classList.remove('hidden');
      } else {
        trophySection.classList.add('hidden');
      }
    }

    var rewardsSection = document.getElementById('rewardsSection');
    var rewardsGrid = document.getElementById('rewardsGrid');
    var emptyState = document.getElementById('emptyState');
    if (!rewardsSection || !rewardsGrid) return;

    if (rewards.length === 0) {
      rewardsSection.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      rewardsGrid.innerHTML = rewards.map(function (r, i) {
        var isRedeemed = earned.some(function (rd) { return rd.reward_id === r.id; });
        var hasPending = pending.some(function (rd) { return rd.reward_id === r.id; });
        var canAfford = starBalance >= r.star_cost;
        var cardClass = isRedeemed ? 'earned' : hasPending ? 'pending' : canAfford ? 'affordable' : 'locked';
        var pct = Math.min(100, Math.round((starBalance / r.star_cost) * 100));
        return '<div class="trg-item ' + cardClass + '" style="animation-delay:' + (i * 35) + 'ms;">' +
          '<div class="trg-icon">' + (r.icon || '🎁') + '</div>' +
          '<div class="trg-name">' + escHtml(r.name) + '</div>' +
          '<div class="trg-cost">⭐ ' + r.star_cost + '</div>' +
          (!isRedeemed && !hasPending ? '<div class="trg-bar"><div class="trg-bar-fill" style="width:' + pct + '%"></div></div>' : '') +
          '</div>';
      }).join('');
      rewardsSection.classList.remove('hidden');
    }
  }

  async function selectChild(childId) {
    _selectedId = childId;
    document.querySelectorAll('.child-chip').forEach(function (btn) {
      btn.classList.toggle('active', btn.id === 'chip-' + childId);
    });
    setView('loading');
    try {
      var res = await window.apiFetch('/api/rewards/child-view/' + childId);
      if (!res.ok) throw new Error('API error');
      renderTreasury(await res.json());
    } catch (e) {
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
