/**
 * reward-editor.js — the one parent create/edit reward implementation.
 * Owned by /rewards (status, Hantera, child filter). Library hashes redirect here.
 */
(function () {
  'use strict';

  function lpt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  function libApiError(data, fallbackKey) {
    if (typeof window.apiErrorMessage === 'function') {
      const msg = window.apiErrorMessage(data, fallbackKey);
      if (msg) return msg;
    }
    return lpt(fallbackKey);
  }

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeOverflowMenus() {
    document.querySelectorAll('.overflow-menu-popup.open').forEach(function (m) {
      m.classList.remove('open');
    });
    document.querySelectorAll('.overflow-menu-row-active').forEach(function (el) {
      el.classList.remove('overflow-menu-row-active');
    });
  }

  function toggleOverflowMenu(e, menuId) {
    e.stopPropagation();
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const wasOpen = menu.classList.contains('open');
    closeOverflowMenus();
    if (!wasOpen) {
      menu.classList.add('open');
      const row = menu.closest('[data-id]');
      if (row) row.classList.add('overflow-menu-row-active');
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('.overflow-menu-btn')) return;
    if (e.target.closest('.overflow-menu-popup')) return;
    closeOverflowMenus();
  });

  const REWARD_ICONS = [
    '🏆', '🎁', '🎉', '🎊', '🍦', '🎬', '🎠', '🏅', '🥇', '💝', '⭐', '🌟',
    '🎯', '🎮', '🛝', '🎨', '🎵', '🧩', '⚽', '🏀', '🚴', '🏊', '🌸',
    '🍕', '🍔', '🍟', '🍩', '🍪', '🍫', '🧁', '🎂', '🥤', '🍓',
    '📱', '🎒', '👟', '👗', '🕹️', '🔮', '🦄', '🐉',
    '✈️', '🏖️', '🎡', '🎢', '🎪', '🎭', '🎵',
  ];

  let rewards = [];
  let rewardChildren = [];
  let approvalValue = true;
  let _rewardsReady = false;
  let _rewardSortable = null;
  let _rewardSearchStandardLoaded = false;
  let _searchGen = 0;
  let _standardRewardsFlat = [];
  let _confirmCallback = null;

  function showLoadError(message) {
    const el = document.getElementById('rewardsContainer');
    if (!el) return;
    if (el.dataset) el.dataset.rewardsState = 'error';
    el.innerHTML =
      '<div class="text-center py-8 text-text-soft" role="alert">' +
      '<p class="text-sm mb-4">' + escHtml(message) + '</p>' +
      '<button type="button" onclick="RewardEditor.reload()" class="px-5 py-2.5 min-h-[44px] bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold">' +
      lpt('library.rewardsHub.retry') +
      '</button></div>';
  }

  function activeChildFilter() {
    const id = new URLSearchParams(window.location.search).get('child') || '';
    if (!id) return '';
    if (!rewardChildren.some(function (child) { return String(child.id) === id; })) return '';
    return id;
  }

  function rewardMatchesChild(reward, childId) {
    if (!childId) return true;
    const vtc = reward.visible_to_children;
    if (vtc == null) return true;
    if (!Array.isArray(vtc) || vtc.length === 0) return false;
    return vtc.map(String).indexOf(String(childId)) !== -1;
  }

  function buildRewardIconPicker() {
    const container = document.getElementById('rewardIconPicker');
    if (!container) return;
    container.innerHTML = REWARD_ICONS.map(function (icon) {
      return '<button type="button" class="icon-opt text-2xl rounded-xl hover:bg-white border-2 border-transparent hover:border-gold transition-all flex items-center justify-center min-w-[44px] min-h-[44px]" onclick="selectRewardIcon(\'' + icon + '\')">' + icon + '</button>';
    }).join('');
  }

  function selectRewardIcon(icon) {
    document.getElementById('rewardIcon').value = icon;
    document.getElementById('rewardIconDisplay').textContent = icon;
    const emojiInput = document.getElementById('rewardEmojiTextInput');
    if (emojiInput) emojiInput.value = icon;
    document.querySelectorAll('#rewardIconPicker button').forEach(function (btn) {
      btn.classList.toggle('border-gold', btn.textContent === icon);
      btn.classList.toggle('bg-white', btn.textContent === icon);
    });
  }

  function onRewardEmojiTextInput(val) {
    const trimmed = val.trim();
    if (!trimmed) return;
    document.getElementById('rewardIcon').value = trimmed;
    document.getElementById('rewardIconDisplay').textContent = trimmed;
    document.querySelectorAll('#rewardIconPicker button').forEach(function (btn) {
      btn.classList.remove('border-gold', 'bg-white');
    });
  }

  function setApproval(val) {
    approvalValue = val;
    const hidden = document.getElementById('rewardRequiresApproval');
    const toggle = document.getElementById('approvalToggle');
    const dot = document.getElementById('approvalDot');
    if (hidden) hidden.value = val ? 'true' : 'false';
    if (!toggle || !dot) return;
    if (val) {
      toggle.classList.remove('bg-lavender');
      toggle.classList.add('bg-gold');
      dot.style.transform = 'translateX(16px)';
    } else {
      toggle.classList.remove('bg-gold');
      toggle.classList.add('bg-lavender');
      dot.style.transform = '';
    }
  }

  function toggleApproval() {
    approvalValue = !approvalValue;
    setApproval(approvalValue);
  }

  function openConfirmModal(msg, callback) {
    const msgEl = document.getElementById('rewardConfirmMsg');
    if (!msgEl) return;
    msgEl.innerHTML = String(msg || '').split('\n').map(function (line) {
      return line.trim() ? '<span class="block mb-2">' + escHtml(line) + '</span>' : '';
    }).join('');
    _confirmCallback = callback;
    document.getElementById('rewardConfirmModal').classList.remove('hidden');
  }

  function closeConfirmModal() {
    const modal = document.getElementById('rewardConfirmModal');
    if (modal) modal.classList.add('hidden');
    _confirmCallback = null;
  }

  async function confirmRewardAction() {
    const cb = _confirmCallback;
    closeConfirmModal();
    if (cb) await cb();
  }

  async function ensureStandardRewardsLoaded() {
    if (_rewardSearchStandardLoaded) return;
    try {
      const res = await window.apiFetch('/api/standard-library/rewards');
      if (res.ok) {
        _standardRewardsFlat = await res.json();
        _rewardSearchStandardLoaded = true;
      }
    } catch (_) { /* search still shows own rewards */ }
  }

  function renderRewardItem(r) {
    const isActive = r.is_active !== false;
    const isFavorite = r.is_favorite === true;
    const vtc = r.visible_to_children;
    let visLabel = lpt('library.rewards.allChildren');
    if (Array.isArray(vtc) && vtc.length === 0) {
      visLabel = lpt('library.rewards.hiddenFromAll');
    } else if (Array.isArray(vtc) && vtc.length > 0) {
      visLabel = lpt('library.rewards.childrenCount', { count: vtc.length });
    }
    return (
      '<div class="flex items-center justify-between bg-white rounded-xl px-3 py-3 gap-2 fade-in ' + (!isActive ? 'opacity-50' : '') + '" data-id="' + r.id + '">' +
      '<div class="flex items-center gap-3 min-w-0 flex-1">' +
      '<span class="drag-handle text-text-soft text-sm select-none px-1">☰</span>' +
      '<button type="button" onclick="toggleRewardFavorite(\'' + r.id + '\', ' + isFavorite + ')" class="text-lg flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ' + (isFavorite ? 'text-gold' : 'text-gray-300') + '" aria-label="' + (isFavorite ? lpt('library.favorite.remove') : lpt('library.favorite.add')) + '">' + (isFavorite ? '★' : '☆') + '</button>' +
      '<span class="text-2xl flex-shrink-0">' + (r.icon || '🏆') + '</span>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="flex items-center gap-2 flex-wrap">' +
      '<span class="font-semibold text-sm text-navy">' + escHtml(r.display_name || r.name) + '</span>' +
      '<span class="text-xs bg-gold-light text-navy px-2 py-0.5 rounded-full font-semibold">' + r.star_cost + ' ⭐</span>' +
      (r.requires_approval ? '<span class="text-xs bg-lavender text-navy px-2 py-0.5 rounded-full">' + lpt('library.modal.approvalBadge') + '</span>' : '') +
      (!isActive ? '<span class="text-xs bg-gray-100 text-text-soft px-2 py-0.5 rounded-full">' + lpt('library.rewards.inactive') + '</span>' : '') +
      '</div>' +
      '<div class="text-xs text-text-soft mt-0.5">' + visLabel + '</div>' +
      '</div></div>' +
      '<div class="icon-btns-desktop flex items-center gap-1 flex-shrink-0">' +
      '<button onclick="toggleRewardActive(\'' + r.id + '\', ' + isActive + ')" title="' + (isActive ? lpt('library.chrome.deactivate') : lpt('library.chrome.activate')) + '" class="reward-toggle px-2 py-1 min-w-[44px] min-h-[44px] ' + (isActive ? 'bg-mint text-green-700' : 'bg-gray-100 text-text-soft') + ' hover:opacity-80 rounded-lg text-sm transition-colors">' + (isActive ? '✓' : '○') + '</button>' +
      '<button onclick="openRewardModalById(\'' + r.id + '\')" class="icon-btn px-2 py-1 bg-lavender hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors text-text-soft">✏️</button>' +
      '<button onclick="deleteReward(\'' + r.id + '\', \'' + escHtml(r.name) + '\')" class="icon-btn px-2 py-1 border border-coral/40 hover:border-red-400 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors text-red-400">✕</button>' +
      '</div>' +
      '<div class="overflow-menu-wrap flex-shrink-0">' +
      '<button class="overflow-menu-btn" onclick="toggleOverflowMenu(event,\'omenu-r-' + r.id + '\')" aria-label="' + lpt('library.chrome.moreOptions') + '">⋯</button>' +
      '<div id="omenu-r-' + r.id + '" class="overflow-menu-popup">' +
      '<button onclick="closeOverflowMenus();toggleRewardActive(\'' + r.id + '\', ' + isActive + ')">' + (isActive ? '○ ' + lpt('library.chrome.deactivate') : '✓ ' + lpt('library.chrome.activate')) + '</button>' +
      '<button onclick="closeOverflowMenus();openRewardModalById(\'' + r.id + '\')">✏️ ' + lpt('library.actions.edit') + '</button>' +
      '<button class="danger" onclick="closeOverflowMenus();deleteReward(\'' + r.id + '\', \'' + escHtml(r.name) + '\')">✕ ' + lpt('library.actions.delete') + '</button>' +
      '</div></div></div>'
    );
  }

  function initRewardsDnD() {
    if (_rewardSortable) _rewardSortable.destroy();
    const el = document.getElementById('rewardsSortableList');
    if (!el || typeof Sortable === 'undefined') return;
    _rewardSortable = new Sortable(el, {
      animation: 200,
      handle: '.drag-handle',
      draggable: '[data-id]',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      forceFallback: true,
      onEnd: async function () {
        const items = Array.from(el.querySelectorAll('[data-id]'));
        const order = items.map(function (item, i) { return { id: item.dataset.id, sort_order: i }; });
        try {
          const res = await window.apiFetch('/api/rewards/reorder', { method: 'PUT', body: JSON.stringify({ order: order }) });
          if (!res.ok) showToast(lpt('library.errors.saveOrder'), true);
        } catch (_) {
          showToast(lpt('library.errors.saveOrder'), true);
        }
      },
    });
  }

  function renderRewards() {
    const container = document.getElementById('rewardsContainer');
    if (!container) return;
    const childId = activeChildFilter();
    const visible = rewards.filter(function (reward) { return rewardMatchesChild(reward, childId); });
    if (visible.length === 0) {
      if (container.dataset) container.dataset.rewardsState = 'empty';
      container.innerHTML =
        '<div class="text-center py-12 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">' +
        '<p class="text-4xl mb-3">🏆</p>' +
        '<p class="font-heading font-bold text-navy text-lg mb-1">' + lpt('library.empty.rewardsTitle') + '</p>' +
        '<p class="text-sm text-text-soft max-w-sm mx-auto mb-4">' + lpt('library.empty.rewardsBody') + '</p>' +
        '<button type="button" onclick="openRewardModal()" class="px-6 py-3 min-h-[44px] bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">' +
        lpt('library.empty.addReward') +
        '</button></div>';
      return;
    }
    if (container.dataset) container.dataset.rewardsState = 'ready';
    container.innerHTML = '<div class="space-y-2" id="rewardsSortableList">' + visible.map(renderRewardItem).join('') + '</div>';
    initRewardsDnD();
  }

  let _loadPromise = null;

  async function loadRewards() {
    if (_loadPromise) return _loadPromise;
    const run = (async function () {
      try {
        const res = await window.apiFetch('/api/rewards');
        if (!res.ok) {
          _rewardsReady = false;
          showLoadError(lpt('library.errors.loadRewards'));
          return;
        }
        const data = await res.json();
        rewards = data && Array.isArray(data.rewards) ? data.rewards : [];
        rewardChildren = data && Array.isArray(data.children) ? data.children : [];
        _rewardsReady = true;
        renderRewards();
      } catch (err) {
        _rewardsReady = false;
        console.error('[REWARDS] loadRewards failed:', err);
        showLoadError(lpt('library.errors.loadRewards'));
      }
    })();
    _loadPromise = run.finally(function () {
      _loadPromise = null;
    });
    return _loadPromise;
  }

  function openRewardModalById(id) {
    const reward = rewards.find(function (r) { return String(r.id) === String(id); });
    if (reward) openRewardModal(reward);
  }

  function openRewardModal(r) {
    document.getElementById('rewardId').value = r ? r.id : '';
    document.getElementById('rewardName').value = r ? r.name : '';
    const icon = r && r.icon ? r.icon : '🏆';
    document.getElementById('rewardIcon').value = icon;
    document.getElementById('rewardIconDisplay').textContent = icon;
    document.getElementById('rewardStarCost').value = r ? r.star_cost : 10;
    setApproval(r ? (r.requires_approval !== false) : true);
    document.getElementById('rewardModalTitle').textContent = r ? lpt('library.modal.editReward') : lpt('library.modal.newReward');
    document.getElementById('rewardError').classList.add('hidden');
    document.querySelectorAll('#rewardIconPicker button').forEach(function (btn) {
      btn.classList.toggle('border-gold', btn.textContent === icon);
      btn.classList.toggle('bg-white', btn.textContent === icon);
    });
    const visContainer = document.getElementById('rewardVisibilityContainer');
    const vtc = r ? r.visible_to_children : null;
    const childIds = rewardChildren.map(function (child) { return String(child.id); });
    const filterId = !r ? activeChildFilter() : '';
    let checkedIds;
    if (filterId) {
      checkedIds = childIds.filter(function (id) { return id === filterId; });
    } else if (vtc == null) {
      checkedIds = childIds.slice();
    } else if (Array.isArray(vtc)) {
      const allow = new Set(vtc.map(String));
      checkedIds = childIds.filter(function (id) { return allow.has(id); });
    } else {
      checkedIds = childIds.slice();
    }
    if (rewardChildren.length === 0) {
      visContainer.innerHTML = '<p class="text-sm text-text-soft">' + lpt('library.empty.noChildren') + '</p>';
    } else {
      visContainer.innerHTML = rewardChildren.map(function (child) {
        return '<label class="flex items-center gap-3 cursor-pointer min-h-[44px]">' +
          '<input type="checkbox" class="reward-child-checkbox w-5 h-5 accent-gold" value="' + child.id + '">' +
          '<span class="text-sm font-semibold text-navy">' + (child.emoji || '🧒') + ' ' + escHtml(child.name) + '</span>' +
          '</label>';
      }).join('');
      visContainer.querySelectorAll('.reward-child-checkbox').forEach(function (cb) {
        cb.checked = checkedIds.indexOf(cb.value) >= 0;
      });
    }
    document.getElementById('rewardModal').classList.remove('hidden');
    setTimeout(function () { document.getElementById('rewardName').focus(); }, 100);
  }

  function openRewardModalWithName(name) {
    openRewardModal();
    document.getElementById('rewardName').value = name;
  }

  function closeRewardModal() {
    document.getElementById('rewardModal').classList.add('hidden');
  }

  async function submitReward(e) {
    e.preventDefault();
    const id = document.getElementById('rewardId').value;
    const name = document.getElementById('rewardName').value.trim();
    const icon = document.getElementById('rewardIcon').value || '🏆';
    const star_cost = parseInt(document.getElementById('rewardStarCost').value, 10);
    const requires_approval = document.getElementById('rewardRequiresApproval').value === 'true';
    const checked = Array.from(document.querySelectorAll('.reward-child-checkbox:checked')).map(function (cb) { return cb.value; });
    const childCount = rewardChildren.length;
    let visible_to_children = null;
    if (childCount > 0) {
      if (checked.length === 0) {
        visible_to_children = id ? [] : null;
      } else if (checked.length >= childCount) {
        visible_to_children = null;
      } else {
        visible_to_children = checked;
      }
    }
    const btn = document.getElementById('rewardSubmitBtn');
    const errEl = document.getElementById('rewardError');
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = lpt('library.actions.saving');
    const url = id ? '/api/rewards/' + id : '/api/rewards';
    const method = id ? 'PUT' : 'POST';
    const res = await window.apiFetch(url, {
      method: method,
      body: JSON.stringify({ name: name, icon: icon, star_cost: star_cost, requires_approval: requires_approval, visible_to_children: visible_to_children }),
    });
    const data = await res.json();
    if (res.ok) {
      closeRewardModal();
      showToast(lpt('library.saved.reward'));
      await loadRewards();
      if (window.RewardsHub && typeof RewardsHub.render === 'function') RewardsHub.render();
    } else {
      errEl.textContent = libApiError(data, 'library.errors.generic');
      errEl.classList.remove('hidden');
    }
    btn.disabled = false;
    btn.textContent = lpt('library.actions.save');
  }

  function deleteReward(id, name) {
    openConfirmModal(lpt('library.confirm.deleteReward', { name: name }), async function () {
      const res = await window.apiFetch('/api/rewards/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(lpt('library.saved.rewardDeleted'));
        await loadRewards();
        if (window.RewardsHub && typeof RewardsHub.render === 'function') RewardsHub.render();
      } else {
        showToast(libApiError(data, 'library.errors.deleteReward'), true);
      }
    });
  }

  async function toggleRewardFavorite(id, currentlyFavorite) {
    const reward = rewards.find(function (r) { return r.id === id; });
    if (!reward) return;
    const res = await window.apiFetch('/api/rewards/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !currentlyFavorite }),
    });
    if (res.ok) {
      reward.is_favorite = !currentlyFavorite;
      renderRewards();
      fetch('/api/analytics/event', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'for_dig_favorite_toggle',
          metadata: { entity_type: 'reward', entity_id: id, is_favorite: !currentlyFavorite },
        }),
      }).catch(function () {});
    } else {
      showToast(lpt('library.errors.updateFavorite'), true);
    }
  }

  async function toggleRewardActive(id, currentlyActive) {
    const reward = rewards.find(function (r) { return r.id === id; });
    if (!reward) return;
    const res = await window.apiFetch('/api/rewards/' + id, {
      method: 'PUT',
      body: JSON.stringify(Object.assign({}, reward, { is_active: !currentlyActive })),
    });
    if (res.ok) await loadRewards();
    else showToast(lpt('library.errors.updateReward'), true);
  }

  async function onRewardSearch(query) {
    const gen = ++_searchGen;
    const resultsEl = document.getElementById('rewardSearchResults');
    const containerEl = document.getElementById('rewardsContainer');
    if (!resultsEl || !containerEl) return;
    if (!String(query || '').trim()) {
      resultsEl.classList.add('hidden');
      resultsEl.innerHTML = '';
      if (resultsEl.dataset) resultsEl.dataset.searchState = 'idle';
      containerEl.classList.remove('hidden');
      return;
    }
    containerEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');
    if (resultsEl.dataset) resultsEl.dataset.searchState = 'searching';
    resultsEl.innerHTML = '<div class="text-center text-text-soft text-sm py-4">' + lpt('library.searching') + '</div>';
    await ensureStandardRewardsLoaded();
    if (gen !== _searchGen) return;
    const q = query.toLowerCase();
    const childId = activeChildFilter();
    const ownMatches = rewards.filter(function (r) {
      return r.name && r.name.toLowerCase().includes(q) && rewardMatchesChild(r, childId);
    });
    const ownNames = new Set(rewards.map(function (r) { return r.name.toLowerCase(); }));
    const standardMatches = _standardRewardsFlat.filter(function (r) {
      return r.name && r.name.toLowerCase().includes(q) && !ownNames.has(r.name.toLowerCase());
    });
    if (ownMatches.length === 0 && standardMatches.length === 0) {
      if (resultsEl.dataset) resultsEl.dataset.searchState = 'empty';
      resultsEl.innerHTML =
        '<div class="text-center py-8 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">' +
        '<p class="text-3xl mb-2">🔍</p>' +
        '<p class="font-semibold text-navy mb-1">' + lpt('library.empty.noSearchReward', { query: query }) + '</p>' +
        '<p class="text-sm text-text-soft mb-4">' + lpt('library.empty.createRewardHint') + '</p>' +
        '<button type="button" onclick="openRewardModalWithName(' + JSON.stringify(query) + ')" class="px-5 py-2.5 min-h-[44px] bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">' +
        lpt('library.page.addReward') +
        '</button></div>';
      return;
    }
    let html = '';
    if (ownMatches.length > 0) {
      html += '<div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 px-1">🏆 ' + lpt('library.empty.yourRewards') + '</div>';
      html += ownMatches.map(function (r) {
        return '<div class="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-lavender hover:border-gold transition-colors gap-2">' +
          '<div class="flex items-center gap-3 min-w-0 flex-1"><span class="text-2xl flex-shrink-0">' + (r.icon || '🏆') + '</span>' +
          '<div class="min-w-0 flex-1"><div class="font-semibold text-sm text-navy">' + escHtml(r.name) + '</div>' +
          '<div class="text-xs text-text-soft">' + r.star_cost + ' ⭐</div></div></div>' +
          '<button type="button" onclick="openRewardModalById(\'' + r.id + '\')" class="px-3 py-1.5 min-h-[44px] bg-lavender hover:bg-purple-100 text-navy rounded-lg text-xs font-semibold transition-colors flex-shrink-0">✏️ ' + lpt('library.actions.edit') + '</button></div>';
      }).join('');
    }
    if (standardMatches.length > 0) {
      html += '<div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 mt-3 px-1">📚 ' + lpt('library.hub.sections.standard.title') + '</div>';
      html += standardMatches.slice(0, 10).map(function (r) {
        return '<div class="flex items-center justify-between bg-sky/40 rounded-xl px-3 py-2.5 border border-blue-100 hover:border-gold transition-colors gap-2">' +
          '<div class="flex items-center gap-3 min-w-0 flex-1"><span class="text-2xl flex-shrink-0">' + (r.icon || '🏆') + '</span>' +
          '<div class="min-w-0 flex-1"><div class="font-semibold text-sm text-navy">' + escHtml(r.name) + '</div>' +
          '<div class="text-xs text-text-soft">' + r.star_cost + ' ⭐ · ' + lpt('library.hub.sections.standard.title') + '</div></div></div>' +
          '<button type="button" onclick="copyStandardRewardToLibrary(' + JSON.stringify(r).replace(/'/g, "\\'") + ')" class="px-3 py-1.5 min-h-[44px] bg-gold hover:bg-yellow-500 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0 whitespace-nowrap">📥 ' + lpt('library.actions.copy') + '</button></div>';
      }).join('');
    }
    if (resultsEl.dataset) resultsEl.dataset.searchState = 'results';
    resultsEl.innerHTML = html;
  }

  async function copyStandardRewardToLibrary(stdReward) {
    const body = {
      name: stdReward.name,
      icon: stdReward.icon || '🏆',
      star_cost: stdReward.star_cost || 10,
      requires_approval: true,
      visible_to_children: activeChildFilter() ? [activeChildFilter()] : null,
    };
    const res = await window.apiFetch('/api/rewards', { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      showToast(lpt('library.saved.rewardCopied', { name: stdReward.name }));
      _rewardSearchStandardLoaded = false;
      await loadRewards();
      const searchInput = document.getElementById('rewardSearchInput');
      if (searchInput) {
        searchInput.value = '';
        onRewardSearch('');
      }
      if (window.RewardsHub && typeof RewardsHub.render === 'function') RewardsHub.render();
    } else {
      showToast(libApiError(data, 'library.errors.copyReward'), true);
    }
  }

  function refresh() {
    if (!_rewardsReady) return loadRewards();
    renderRewards();
  }

  window.RewardEditor = {
    refresh: refresh,
    reload: loadRewards,
  };
  window.closeOverflowMenus = closeOverflowMenus;
  window.toggleOverflowMenu = toggleOverflowMenu;
  window.selectRewardIcon = selectRewardIcon;
  window.onRewardEmojiTextInput = onRewardEmojiTextInput;
  window.toggleApproval = toggleApproval;
  window.openRewardModal = openRewardModal;
  window.openRewardModalById = openRewardModalById;
  window.openRewardModalWithName = openRewardModalWithName;
  window.closeRewardModal = closeRewardModal;
  window.submitReward = submitReward;
  window.deleteReward = deleteReward;
  window.toggleRewardFavorite = toggleRewardFavorite;
  window.toggleRewardActive = toggleRewardActive;
  window.onRewardSearch = onRewardSearch;
  window.copyStandardRewardToLibrary = copyStandardRewardToLibrary;
  window.closeRewardConfirmModal = closeConfirmModal;
  window.confirmRewardAction = confirmRewardAction;

  let _booted = false;

  function boot() {
    if (_booted) {
      if (_rewardsReady) renderRewards();
      return;
    }
    _booted = true;
    buildRewardIconPicker();
    setApproval(true);
    const modal = document.getElementById('rewardModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) closeRewardModal();
      });
    }
    const confirm = document.getElementById('rewardConfirmModal');
    if (confirm) {
      confirm.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) closeConfirmModal();
      });
    }
    loadRewards();
  }

  document.addEventListener('parent-i18n-ready', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
