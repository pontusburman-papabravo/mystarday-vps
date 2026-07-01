// library.js — Mitt bibliotek core module
// Owns: shared state, icon constants, auth/init, main tab switching,
//       categories, activities (list + DnD + modal + search),
//       rewards (list + DnD + modal + search), icon pickers, star picker,
//       favorite/approval toggles, confirm modal, modal backdrop listeners, utilities.
// Does NOT own: schema tab logic (library-schema.js), standard library tab
//               (library-standard.js), sub-steps (library-substeps.js),
//               treasury view (library-treasury.js).

// ─── Overflow menu (mobile ⋯ per-row action menu) ─────────
function closeOverflowMenus() {
  document.querySelectorAll('.overflow-menu-popup.open').forEach(m => m.classList.remove('open'));
  // Remove active-row class from all rows so stacking context resets
  document.querySelectorAll('.overflow-menu-row-active').forEach(el => el.classList.remove('overflow-menu-row-active'));
}
function toggleOverflowMenu(e, menuId) {
  e.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const wasOpen = menu.classList.contains('open');
  closeOverflowMenus(); // clears all active-row classes too
  if (!wasOpen) {
    menu.classList.add('open');
    // Promote this row's stacking context so the popup renders above siblings
    const row = menu.closest('[data-id]');
    if (row) row.classList.add('overflow-menu-row-active');
  }
}
// Close overflow menus when clicking outside (but not on menu buttons or inside menus)
document.addEventListener('click', e => {
  if (e.target.closest('.overflow-menu-btn')) return;
  if (e.target.closest('.overflow-menu-popup')) return;
  closeOverflowMenus();
});

function _handleLibraryOverflowBtn(btn) {
  const menuId = btn.getAttribute('data-overflow-menu');
  const menu = menuId ? document.getElementById(menuId) : btn.nextElementSibling;
  if (!menu || !menu.classList.contains('overflow-menu-popup')) return;
  const wasOpen = menu.classList.contains('open');
  closeOverflowMenus();
  if (!wasOpen) {
    menu.classList.add('open');
    const row = btn.closest('[data-id]');
    if (row) row.classList.add('overflow-menu-row-active');
  }
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.overflow-menu-btn');
  if (btn && btn.hasAttribute('data-overflow-menu')) {
    e.stopPropagation();
    _handleLibraryOverflowBtn(btn);
  }
});

document.addEventListener('touchstart', e => {
  const btn = e.target.closest('.overflow-menu-btn[data-overflow-menu]');
  if (!btn) return;
  e.preventDefault();
  _handleLibraryOverflowBtn(btn);
}, { passive: false });

// ─── Shared state ─────────────────────────────────────────
let categories = [];
let activities = [];
let rewards = [];
let rewardChildren = [];
let _rewardsLoaded = false;
let _activitiesLoaded = false;
let _categoriesLoaded = false;
let confirmCallback = null;
let favValue = false;
let approvalValue = true;
let activeSchemaTab = null; // category id of active schema tab
const subStepsCache = {};
const openSubStepPanels = new Set();


const ICONS = [
  '🪥','🧼','🚿','🛁','🚽','🧴','🪒','💊','🧻',
  '🍳','🥣','🥗','🥪','🍎','🍌','🥛','🍞','🍱','🥤','🍽️','☕',
  '📚','✏️','📝','🎒','📖','🔬','🖊️','🏫','📐','🔢',
  '🎨','🎮','🧩','⚽','🏀','🎯','🎭','🎵','🎸','🪀','🛝','🎲',
  '😴','🛏️','📕','🌙','🧸','🌟',
  '🚴','🏊','🌳','🏃','🚶','🌸','🐕','🌞',
  '🧘','❤️','🤗','💪','🌈',
  '🧹','🧺','🗑️','🌿','🪴',
  '🚌','🚗','🚲',
  '⭐','🏆','🎉','📱','🎁','🎊','🍦','🎬','🎠','🏅','🥇','💝',
  '👕','🌅','📺','💧',
];

const REWARD_ICONS = [
  '🏆','🎁','🎉','🎊','🍦','🎬','🎠','🏅','🥇','💝','⭐','🌟',
  '🎯','🎮','🛝','🎨','🎵','🧩','⚽','🏀','🚴','🏊','🌸',
  '🍕','🍔','🍟','🍩','🍪','🍫','🧁','🎂','🥤','🍓',
  '📱','🎒','👟','👗','🕹️','🔮','🦄','🐉',
  '✈️','🏖️','🎡','🎢','🎪','🎭','🎵',
];

// ─── Auth & Init ──────────────────────────────────────────
function showLibraryLoadError(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const safe = typeof escHtml === 'function' ? escHtml(message) : String(message || '');
  el.innerHTML = `<div class="text-center py-8 text-text-soft"><p class="text-sm">${safe}</p></div>`;
}

function isContainerLoading(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return false;
  return /Laddar/i.test(el.textContent || '');
}

function routeLibraryHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'treasury') {
    window.location.href = '/skattkammaren';
    return;
  }
  if (window.LibraryMagicHub && LibraryMagicHub.isMagic()) return;
  if (hash === 'schema') switchTab('schema');
  else if (hash === 'rewards') switchTab('rewards');
  else if (hash === 'standard') switchTab('standard');
  else if (hash === 'activities') switchTab('activities');
  else switchTab('schema');
}

document.addEventListener('DOMContentLoaded', async () => {
  const initHash = window.location.hash.replace('#', '');
  if (initHash === 'treasury') {
    window.location.href = '/skattkammaren';
    return;
  }

  const user = await window.authGuard();
  if (!user) return;
  _libIsAdmin = !!user.is_admin;

  document.getElementById('logoutBtn')?.addEventListener('click', () => window.logout());
  // logoutBtn2 removed — logout only in sidebar/hamburger menu now

  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('hidden'));
  }

  try {
    buildIconPicker();
    buildRewardIconPicker();
    selectStar(1);
    setApproval(true);
  } catch (err) {
    console.warn('[LIBRARY] Picker init skipped:', err.message);
  }

  // Load library data in parallel with magic hub — never block on AppViewMode.initParent()
  const dataLoadPromise = (async () => {
    try {
      await Promise.all([loadCategories(), loadActivities(), loadRewards()]);
      if (window.LibraryImages) await LibraryImages.init();
    } catch (err) {
      console.error('[LIBRARY] Data load error:', err);
      showToast('Kunde inte ladda allt biblioteksinnehåll. Försök ladda om sidan.', true);
    }
  })();

  if (window.LibraryMagicHub) {
    await LibraryMagicHub.init();
  }

  await dataLoadPromise;
  routeLibraryHash();

  if (window.ParentMagicShell) await ParentMagicShell.init('library');
});

// ─── Main tab switching (4 tabs: schema, activities, rewards, standard) ──
// Skattkammaren (treasury) removed from tabs — accessible only via sidebar /skattkammaren
function switchTab(tab) {
  ['schema', 'activities', 'standard', 'rewards'].forEach(t => {
    const pane = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tab-${t}-btn`);
    if (pane) pane.classList.toggle('active', t === tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  // Magic hub owns location.hash — writing classic tab hashes here caused an
  // infinite hashchange loop (standard ↔ magic-standard) and 429 rate limits.
  if (!(window.LibraryMagicHub && LibraryMagicHub.isMagic())) {
    window.location.hash = tab;
  }
  if (tab === 'standard' && !_standardLoaded) loadStandardLibrary();
  if (tab === 'schema' && !_schemaLoaded) loadSchemaTab();
  if (tab === 'rewards' && (!_rewardsLoaded || isContainerLoading('rewardsContainer'))) {
    loadRewards().catch(() => {});
  }
  if (tab === 'activities' && (!_activitiesLoaded || isContainerLoading('activitiesContainer'))) {
    loadActivities().catch(() => {});
  }
}
window.switchTab = switchTab;

// ─── Standard sub-tab switching ──────────────────────────
let _activeStdSubTab = 'schedules';
function switchStdSubTab(sub) {
  _activeStdSubTab = sub;
  ['schedules', 'activities', 'rewards'].forEach(s => {
    const pane = document.getElementById(`std-sub-${s}`);
    const btn = document.getElementById(`std-sub-${s}-btn`);
    if (pane) {
      pane.classList.toggle('hidden', s !== sub);
    }
    if (btn) {
      btn.classList.toggle('bg-white', s === sub);
      btn.classList.toggle('text-navy', s === sub);
      btn.classList.toggle('shadow-sm', s === sub);
    }
  });
}
window.switchStdSubTab = switchStdSubTab;

// ─── Categories (= schema tabs) ──────────────────────────
async function loadCategories() {
  try {
    const res = await window.apiFetch('/api/categories');
    if (res.ok) {
      categories = await res.json();
      _categoriesLoaded = true;
      buildCategoryOptions();
      renderSchemaTabs();
      renderActivities();
      return;
    }
    showLibraryLoadError('schemaTabsContainer', 'Kunde inte ladda kategorier. Försök ladda om sidan.');
  } catch (err) {
    console.error('[LIBRARY] loadCategories failed:', err);
    showLibraryLoadError('schemaTabsContainer', 'Kunde inte ladda kategorier. Försök ladda om sidan.');
  }
}

function buildCategoryOptions() {
  const sel = document.getElementById('activityCategory');
  const current = sel.value;
  sel.innerHTML = '<option value="">Ingen kategori</option>' +
    categories.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  if (current) sel.value = current;
}

function renderSchemaTabs() {
  const container = document.getElementById('schemaTabsContainer');
  if (categories.length === 0) {
    container.innerHTML = '<span class="text-sm text-text-soft py-2">Inga kategorier ännu</span>';
    activeSchemaTab = null;
    return;
  }

  const showAllActive = !activeSchemaTab || !categories.find(c => c.id === activeSchemaTab);

  container.innerHTML = `
    <div class="flex items-center gap-1 schema-tab ${showAllActive ? 'active' : ''}"
      data-cat-tab="__all__"
      onclick="selectSchemaTab(null)">
      <span class="px-4 py-2 font-semibold text-sm cursor-pointer">Alla</span>
    </div>
    ${categories.map(cat => {
      const isActive = cat.id === activeSchemaTab;
      return `
        <div class="flex items-center gap-0 schema-tab ${isActive ? 'active' : ''}"
          data-cat-tab="${cat.id}"
          onclick="selectSchemaTab('${cat.id}')">
          <span class="px-3 py-2 font-semibold text-sm cursor-pointer">${escHtml(cat.name)}</span>
          <button onclick="event.stopPropagation(); deleteCategoryWithConfirm('${cat.id}', '${escHtml(cat.name).replace(/'/g, "\\'")}')"
            title="Ta bort kategori"
            class="cat-delete-btn w-6 h-6 flex items-center justify-center rounded-full text-xs leading-none
              ${isActive ? 'text-white/60 hover:text-white hover:bg-red-500' : 'text-text-soft hover:text-red-500 hover:bg-red-50'}
              transition-colors flex-shrink-0" aria-label="Ta bort ${escHtml(cat.name)}">
            ✕
          </button>
        </div>
      `;
    }).join('')}
  `;

  updateSchemaTabTitle();
}

function selectSchemaTab(catId) {
  activeSchemaTab = catId; // null = "Alla", string = specific category
  // Update tab UI
  document.querySelectorAll('[data-cat-tab]').forEach(btn => {
    const isActive = catId === null
      ? btn.dataset.catTab === '__all__'
      : btn.dataset.catTab === catId;
    btn.classList.toggle('active', isActive);
  });
  updateSchemaTabTitle();
  renderActivities();
}

function updateSchemaTabTitle() {
  const titleEl = document.getElementById('schemaTabTitle');
  const cat = categories.find(c => c.id === activeSchemaTab);
  if (cat) {
    titleEl.textContent = cat.name;
  } else {
    titleEl.textContent = 'Aktiviteter';
  }
}

// ─── Activities ───────────────────────────────────────────
async function loadActivities() {
  try {
    const res = await window.apiFetch('/api/activities');
    if (res.ok) {
      activities = await res.json();
      _activitiesLoaded = true;
      renderActivities();
      return;
    }
    showLibraryLoadError('activitiesContainer', 'Kunde inte ladda aktiviteter. Försök ladda om sidan.');
  } catch (err) {
    console.error('[LIBRARY] loadActivities failed:', err);
    showLibraryLoadError('activitiesContainer', 'Kunde inte ladda aktiviteter. Försök ladda om sidan.');
  }
}

function renderActivities() {
  const container = document.getElementById('activitiesContainer');
  if (!container) return;

  if (activities.length === 0 && categories.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">
        <p class="text-4xl mb-3">🌟</p>
        <p class="font-heading font-bold text-navy text-lg mb-1">Biblioteket är tomt</p>
        <p class="text-sm text-text-soft max-w-sm mx-auto mb-4">Här samlar du dina aktiviteter. Skapa en aktivitet som t.ex. "Borsta tänderna" och använd den i alla barns scheman.</p>
        <button onclick="openActivityModal()" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">
          + Skapa din första aktivitet
        </button>
      </div>
    `;
    return;
  }

  // Filter activities for the active schema tab (category)
  const tabActivities = activeSchemaTab
    ? activities.filter(a => a.category_id === activeSchemaTab)
    : activities;

  if (tabActivities.length === 0) {
    const cat = categories.find(c => c.id === activeSchemaTab);
    const catLabel = activeSchemaTab === null ? 'alla kategorier' : (cat ? cat.name : 'denna kategori');
    container.innerHTML = `
      <div class="text-center py-10 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">
        <p class="text-3xl mb-2">📋</p>
        <p class="font-heading font-bold text-navy mb-1">Inga aktiviteter i ${catLabel}</p>
        <p class="text-sm text-text-soft max-w-sm mx-auto mb-4">Lägg till aktiviteter för att bygga upp ditt schema.</p>
        <button onclick="openActivityModalInCategory('${activeSchemaTab || ''}')" class="px-5 py-2.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
          + Lägg till aktivitet
        </button>
      </div>
    `;
    return;
  }

  // Flat list sorted by sort_order
  const sortedActivities = [...tabActivities].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  let html = `
    <div class="sortable-activities space-y-2">
      ${sortedActivities.map(a => renderActivityItem(a)).join('')}
    </div>
  `;

  // Category edit/delete controls — all categories can be deleted by the parent
  const activeCat = categories.find(c => c.id === activeSchemaTab);
  if (activeCat) {
    const editBtnHtml = !activeCat.is_default
      ? `<button onclick="openCategoryModal(${JSON.stringify(activeCat).replace(/'/g, "\\'")})"
          class="px-3 py-1.5 text-sm font-semibold text-text-soft hover:text-navy border border-lavender rounded-lg transition-colors">
          ✏️ Redigera flik
        </button>`
      : '';
    html += `
      <div class="flex gap-2 mt-2">
        ${editBtnHtml}
        <button onclick="deleteCategory('${activeCat.id}', '${escHtml(activeCat.name)}')"
          class="px-3 py-1.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 rounded-lg transition-colors">
          ✕ Ta bort flik
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
  initActivityDnD();
  if (window.LibraryMagicMine) LibraryMagicMine.refresh();

  // Reopen sub-step panels
  for (const templateId of openSubStepPanels) {
    const panel = document.getElementById(`substeps-panel-${templateId}`);
    const btn = document.getElementById(`substep-btn-${templateId}`);
    if (panel) {
      panel.classList.add('open');
      if (btn) { btn.classList.remove('bg-mint'); btn.classList.add('bg-green-200'); }
      if (subStepsCache[templateId]) {
        renderSubStepsList(templateId, subStepsCache[templateId]);
        updateSubStepBadge(templateId, subStepsCache[templateId].length);
      } else {
        loadSubSteps(templateId);
      }
    }
  }
}

function renderActivityItem(a) {
  const subStepCount = subStepsCache[a.id] ? subStepsCache[a.id].length : null;
  const countBadge = subStepCount !== null
    ? `<span class="text-xs bg-mint text-green-700 px-1.5 py-0.5 rounded-full font-semibold">${subStepCount} steg</span>`
    : '';
  return `
    <div class="bg-white rounded-xl overflow-hidden fade-in" data-id="${a.id}">
      <div class="flex items-center justify-between px-3 py-2 gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="drag-handle text-text-soft text-sm select-none px-1">☰</span>
          <span class="text-xl flex-shrink-0">${window.ActivityVisual ? ActivityVisual.thumb(a) : (a.icon || '📌')}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-semibold text-sm text-navy" style="word-break:break-word">${escHtml(a.name)}</span>
              ${a.for_dig_goal && window.ForDigGoalBadge ? ForDigGoalBadge.render(a.for_dig_goal) : ''}
              ${a.is_favorite ? '<span class="text-gold text-sm flex-shrink-0">★</span>' : ''}
              ${countBadge}
            </div>
            <div class="text-xs text-text-soft">${'⭐'.repeat(a.star_value)}</div>
          </div>
        </div>
        <!-- Desktop: inline buttons (hidden on mobile via CSS) -->
        <div class="icon-btns-desktop flex gap-1 flex-shrink-0">
          <button onclick="toggleActivityFavoriteInline('${a.id}', ${a.is_favorite ? 'true' : 'false'})"
            class="icon-btn px-2 py-1 rounded-lg text-sm transition-colors ${a.is_favorite ? 'text-gold' : 'text-gray-300'}"
            title="${a.is_favorite ? 'Ta bort favorit' : 'Spara som favorit'}">${a.is_favorite ? '★' : '☆'}</button>
          <button onclick="toggleSubSteps('${a.id}')"
            id="substep-btn-${a.id}"
            title="Delsteg"
            class="icon-btn px-2 py-1 bg-mint hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors text-green-700">📋</button>
          <button onclick="openActivityModalById('${a.id}')"
            class="icon-btn px-2 py-1 bg-lavender hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors text-text-soft">✏️</button>
          <button onclick="deleteActivity('${a.id}', '${escHtml(a.name)}')"
            class="icon-btn px-2 py-1 border border-coral/40 hover:border-red-400 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors text-red-400">✕</button>
        </div>
        <!-- Mobile: ⋯ overflow menu (hidden on desktop via CSS) -->
        <div class="overflow-menu-wrap flex-shrink-0">
          <button class="overflow-menu-btn" data-overflow-menu="omenu-a-${a.id}" aria-label="Fler alternativ">⋯</button>
          <div id="omenu-a-${a.id}" class="overflow-menu-popup">
            <button onclick="closeOverflowMenus();toggleSubSteps('${a.id}')">📋 Delsteg</button>
            <button onclick="closeOverflowMenus();openActivityModalById('${a.id}')">✏️ Redigera</button>
            <button class="danger" onclick="closeOverflowMenus();deleteActivity('${a.id}', '${escHtml(a.name)}')">✕ Ta bort</button>
          </div>
        </div>
      </div>
      <div id="substeps-panel-${a.id}" class="substeps-panel border-t border-lavender bg-sky/40 px-3 py-2">
        <div id="substeps-list-${a.id}" class="space-y-1 mb-2">
          <p class="text-xs text-text-soft py-1">Laddar…</p>
        </div>
        <button onclick="openSubStepModal('${a.id}')"
          class="text-xs font-semibold text-navy bg-white border border-lavender hover:border-gold px-3 py-1.5 rounded-lg transition-colors">
          + Lägg till delsteg
        </button>
      </div>
    </div>
  `;
}

// ─── Activity DnD ─────────────────────────────────────────
let _activitySortables = [];
function initActivityDnD() {
  _activitySortables.forEach(s => s.destroy());
  _activitySortables = [];
  if (typeof Sortable === 'undefined') return;
  document.querySelectorAll('.sortable-activities').forEach(el => {
    const s = new Sortable(el, {
      animation: 200, handle: '.drag-handle', draggable: '[data-id]',
      ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', forceFallback: true,
      onEnd: async function(evt) {
        const items = Array.from(evt.from.querySelectorAll('[data-id]'));
        const order = items.map((item, i) => ({ id: item.dataset.id, sort_order: i }));
        try {
          const res = await window.apiFetch('/api/activities/reorder', {
            method: 'PUT', body: JSON.stringify({ order }),
          });
          if (!res.ok) showToast('Kunde inte spara ordningen', true);
        } catch { showToast('Kunde inte spara ordningen', true); }
      },
    });
    _activitySortables.push(s);
  });
}

function openActivityModalInCategory(catId) {
  openActivityModal();
  if (catId) document.getElementById('activityCategory').value = catId;
}

// ─── Icon picker ──────────────────────────────────────────
function buildIconPicker() {
  const container = document.getElementById('iconPicker');
  if (!container) return;
  container.innerHTML = ICONS.map(icon => `
    <button type="button" class="icon-opt text-2xl rounded-xl hover:bg-white border-2 border-transparent hover:border-gold transition-all flex items-center justify-center" onclick="selectIcon('${icon}')">${icon}</button>
  `).join('');
}

function buildRewardIconPicker() {
  const container = document.getElementById('rewardIconPicker');
  if (!container) return;
  container.innerHTML = REWARD_ICONS.map(icon => `
    <button type="button" class="icon-opt text-2xl rounded-xl hover:bg-white border-2 border-transparent hover:border-gold transition-all flex items-center justify-center" onclick="selectRewardIcon('${icon}')">${icon}</button>
  `).join('');
}

function selectIcon(icon) {
  document.getElementById('activityIcon').value = icon;
  document.getElementById('selectedIconDisplay').textContent = icon;
  const emojiInput = document.getElementById('emojiTextInput');
  if (emojiInput) emojiInput.value = icon;
  document.querySelectorAll('#iconPicker button').forEach(btn => {
    btn.classList.toggle('border-gold', btn.textContent === icon);
    btn.classList.toggle('bg-white', btn.textContent === icon);
  });
}

function onEmojiTextInput(val) {
  const trimmed = val.trim();
  if (trimmed) {
    document.getElementById('activityIcon').value = trimmed;
    document.getElementById('selectedIconDisplay').textContent = trimmed;
    // Deselect all picker buttons
    document.querySelectorAll('#iconPicker button').forEach(btn => {
      btn.classList.remove('border-gold', 'bg-white');
    });
  }
}

function selectRewardIcon(icon) {
  document.getElementById('rewardIcon').value = icon;
  document.getElementById('rewardIconDisplay').textContent = icon;
  const emojiInput = document.getElementById('rewardEmojiTextInput');
  if (emojiInput) emojiInput.value = icon;
  document.querySelectorAll('#rewardIconPicker button').forEach(btn => {
    btn.classList.toggle('border-gold', btn.textContent === icon);
    btn.classList.toggle('bg-white', btn.textContent === icon);
  });
}

function onRewardEmojiTextInput(val) {
  const trimmed = val.trim();
  if (trimmed) {
    document.getElementById('rewardIcon').value = trimmed;
    document.getElementById('rewardIconDisplay').textContent = trimmed;
    document.querySelectorAll('#rewardIconPicker button').forEach(btn => {
      btn.classList.remove('border-gold', 'bg-white');
    });
  }
}

// ─── Star picker ──────────────────────────────────────────
function selectStar(val) {
  document.getElementById('activityStarValue').value = val;
  document.querySelectorAll('#starPicker button').forEach(btn => {
    const isSelected = parseInt(btn.dataset.val) === val;
    btn.classList.toggle('bg-gold', isSelected);
    btn.classList.toggle('text-white', isSelected);
    btn.classList.toggle('border-gold', isSelected);
  });
}

// ─── Favorite toggle ──────────────────────────────────────
async function toggleActivityFavoriteInline(id, currentlyFavorite) {
  const act = activities.find(a => a.id === id);
  if (!act) return;
  const isFavorite = currentlyFavorite === true || currentlyFavorite === 'true';
  const res = await window.apiFetch(`/api/activities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: act.name,
      icon: act.icon,
      category_id: act.category_id,
      star_value: act.star_value,
      is_favorite: !isFavorite,
      feedback_for: act.feedback_for,
    }),
  });
  if (res.ok) {
    act.is_favorite = !isFavorite;
    renderActivities();
    fetch('/api/analytics/event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'for_dig_favorite_toggle',
        metadata: { entity_type: 'activity', entity_id: id, is_favorite: !isFavorite },
      }),
    }).catch(() => {});
  } else {
    showToast('Kunde inte uppdatera favorit', true);
  }
}

function toggleFavorite() {
  favValue = !favValue;
  document.getElementById('activityFavorite').value = favValue ? 'true' : 'false';
  const toggle = document.getElementById('favToggle');
  const dot = document.getElementById('favDot');
  if (favValue) { toggle.classList.replace('bg-lavender', 'bg-gold'); dot.style.transform = 'translateX(16px)'; }
  else { toggle.classList.replace('bg-gold', 'bg-lavender'); dot.style.transform = ''; }
}

function setFavorite(val) {
  favValue = val;
  document.getElementById('activityFavorite').value = val ? 'true' : 'false';
  const toggle = document.getElementById('favToggle');
  const dot = document.getElementById('favDot');
  if (val) { toggle.classList.remove('bg-lavender'); toggle.classList.add('bg-gold'); dot.style.transform = 'translateX(16px)'; }
  else { toggle.classList.remove('bg-gold'); toggle.classList.add('bg-lavender'); dot.style.transform = ''; }
}

// ─── Approval toggle ──────────────────────────────────────
function toggleApproval() {
  approvalValue = !approvalValue;
  setApproval(approvalValue);
}

function setApproval(val) {
  approvalValue = val;
  document.getElementById('rewardRequiresApproval').value = val ? 'true' : 'false';
  const toggle = document.getElementById('approvalToggle');
  const dot = document.getElementById('approvalDot');
  if (val) { toggle.classList.remove('bg-lavender'); toggle.classList.add('bg-gold'); dot.style.transform = 'translateX(16px)'; }
  else { toggle.classList.remove('bg-gold'); toggle.classList.add('bg-lavender'); dot.style.transform = ''; }
}

// ─── Category modal ───────────────────────────────────────
function openCategoryModal(cat) {
  document.getElementById('categoryId').value = cat ? cat.id : '';
  document.getElementById('categoryName').value = cat ? cat.name : '';
  document.getElementById('categoryModalTitle').textContent = cat ? 'Redigera kategori' : 'Ny kategori';
  document.getElementById('categoryError').classList.add('hidden');
  document.getElementById('categoryModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('categoryName').focus(), 100);
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.add('hidden');
}

async function submitCategory(e) {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value.trim();
  const btn = document.getElementById('categorySubmitBtn');
  const errEl = document.getElementById('categoryError');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Sparar…';
  const url = id ? `/api/categories/${id}` : '/api/categories';
  const method = id ? 'PUT' : 'POST';
  const res = await window.apiFetch(url, { method, body: JSON.stringify({ name }) });
  const data = await res.json();
  if (res.ok) {
    closeCategoryModal(); showToast('Kategorin har sparats');
    // If new category, switch to it
    if (!id && data.id) activeSchemaTab = data.id;
    await loadCategories(); await loadActivities();
  } else {
    errEl.textContent = data.error || 'Fel uppstod'; errEl.classList.remove('hidden');
  }
  btn.disabled = false; btn.textContent = 'Spara';
}

function deleteCategory(id, name) {
  const cat = categories.find(c => c.id === id);
  const extraInfo = cat && cat.is_default
    ? ' Kategorin kan kopieras tillbaka från Standardbiblioteket. Barnens scheman påverkas inte.'
    : ' Aktiviteter i denna kategori förlorar sin kategori.';
  openConfirmModal(`Ta bort fliken "${name}"?${extraInfo}`, async () => {
    const res = await window.apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Kategorin har tagits bort');
      if (activeSchemaTab === id) activeSchemaTab = null;
      await loadCategories(); await loadActivities();
    }
    else showToast(data.error || 'Kunde inte ta bort kategorin', true);
  });
}

async function deleteCategoryWithConfirm(id, name) {
  // First, check activity count and schedule usage
  let activityCount = 0;
  let usedInSchedule = false;
  try {
    const checkRes = await window.apiFetch(`/api/categories/${id}/delete-check`);
    if (checkRes.ok) {
      const info = await checkRes.json();
      activityCount = info.activity_count || 0;
      usedInSchedule = info.used_in_schedule || false;
    }
  } catch {}

  // Build warning message
  let msg = `Är du säker på att du vill ta bort kategorin "${name}"?`;
  if (activityCount > 0) {
    msg += `\n\n⚠️ Alla ${activityCount} aktiviteter i denna kategori tas också bort.`;
  }
  if (usedInSchedule) {
    msg += '\n\n⚠️ Obs! Aktiviteter från den här kategorin används i ett barns schema. Schemat påverkas om du tar bort kategorin.';
  }

  openConfirmModal(msg, async () => {
    const res = await window.apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Kategorin har tagits bort');
      if (activeSchemaTab === id) activeSchemaTab = null;
      await loadCategories();
      await loadActivities();
    } else {
      showToast(data.error || 'Kunde inte ta bort kategorin', true);
    }
  });
}

// ─── Activity modal substeps ──────────────────────────────────
// State: [{ id: null|string, name, icon: string|null, _deleted: bool }]
// Existing steps (id != null) are soft-deleted (_deleted=true) on remove.
// New steps (id == null) are hard-removed.

function renderLibActSubsteps() {
  const list = document.getElementById('libActSubstepList');
  if (!list) return;
  const visible = _libActSubsteps.filter(s => !s._deleted);
  if (visible.length === 0) {
    list.innerHTML = '<p class="text-xs text-text-soft italic">Inga delsteg ännu. Lägg till nedan.</p>';
    return;
  }
  list.innerHTML = visible.map((s, vi) => {
    const realIdx = _libActSubsteps.indexOf(s);
    const icon = s.icon ? `<span class="text-base">${s.icon}</span>` : '';
    const editBtn = s.id
      ? `<button type="button" onclick="openLibActSubstepEdit(${realIdx})" class="text-text-soft hover:text-navy text-xs px-1 py-0.5 rounded transition-colors">✏️</button>`
      : '';
    const nameHtml = icon
      ? `<span class="text-sm flex-1 flex items-center gap-1.5">${icon}<span style="word-break:break-word">${escHtml(s.name)}</span></span>`
      : `<span class="text-sm flex-1" style="word-break:break-word">${escHtml(s.name)}</span>`;
    return `<div class="flex items-center gap-2 bg-sky/50 rounded-lg px-3 py-1.5">
      ${nameHtml}
      ${editBtn}
      <button type="button" onclick="removeLibActSubstep(${realIdx})" class="text-text-soft hover:text-red-500 text-sm ml-auto">✕</button>
    </div>`;
  }).join('');
}

function addLibActSubstep() {
  const input = document.getElementById('libActSubstepInput');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  _libActSubsteps.push({ id: null, name, icon: null, _deleted: false });
  input.value = '';
  renderLibActSubsteps();
}

function removeLibActSubstep(idx) {
  const step = _libActSubsteps[idx];
  if (!step) return;
  if (step.id) {
    step._deleted = true; // soft-delete; will DELETE on save
  } else {
    _libActSubsteps.splice(idx, 1); // hard-remove (never saved)
  }
  renderLibActSubsteps();
}

// Open icon picker + edit inline for an existing step in the activity modal
let _libActStepEditingIdx = -1;

function openLibActSubstepEdit(idx) {
  _libActStepEditingIdx = idx;
  const step = _libActSubsteps[idx];
  document.getElementById('libActStepEditName').value = step.name || '';
  const icon = step.icon || '';
  document.getElementById('libActStepEditIcon').value = icon;
  document.getElementById('libActStepEditIconDisplay').textContent = icon || '❓';
  buildSubStepIconPicker();
  if (icon) {
    setTimeout(() => {
      document.querySelectorAll('#subStepIconPicker button').forEach(btn => {
        btn.classList.toggle('border-gold', btn.textContent.trim() === icon);
        btn.classList.toggle('bg-white', btn.textContent.trim() === icon);
      });
    }, 50);
  }
  document.getElementById('libActSubstepEditModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('libActStepEditName').focus(), 100);
}

function closeLibActSubstepEdit() {
  document.getElementById('libActSubstepEditModal').classList.add('hidden');
  _libActStepEditingIdx = -1;
}

function submitLibActSubstepEdit() {
  if (_libActStepEditingIdx < 0) return;
  const name = document.getElementById('libActStepEditName').value.trim();
  if (!name) return;
  const icon = document.getElementById('libActStepEditIcon').value || null;
  _libActSubsteps[_libActStepEditingIdx].name = name;
  _libActSubsteps[_libActStepEditingIdx].icon = icon;
  closeLibActSubstepEdit();
  renderLibActSubsteps();
}

function clearLibActStepIcon() {
  document.getElementById('libActStepEditIcon').value = '';
  document.getElementById('libActStepEditIconDisplay').textContent = '❓';
  document.querySelectorAll('#subStepIconPicker button').forEach(btn => {
    btn.classList.remove('border-gold', 'bg-white');
  });
}

// Sync in-modal substep additions/deletions to the server after activity save.
// Called by submitActivity() — returns count of failed operations.
async function syncLibActSubsteps(activityId) {
  const toDelete = _libActSubsteps.filter(s => s._deleted && s.id);
  const toCreate = _libActSubsteps.filter(s => !s._deleted && !s.id);
  let failed = 0;
  for (const step of toDelete) {
    const r = await window.apiFetch(`/api/activities/${activityId}/sub-steps/${step.id}`, { method: 'DELETE' });
    if (!r.ok) failed++;
  }
  for (const step of toCreate) {
    const r = await window.apiFetch(`/api/activities/${activityId}/sub-steps`, {
      method: 'POST',
      body: JSON.stringify({ name: step.name, icon: step.icon }),
    });
    if (!r.ok) failed++;
  }
  return failed;
}

// ─── Activity modal ───────────────────────────────────────
function openActivityModalById(id) {
  const act = activities.find(a => String(a.id) === String(id));
  if (act) openActivityModal(act);
}

async function openActivityModal(act) {
  document.getElementById('activityId').value = act ? act.id : '';
  document.getElementById('activityName').value = act ? act.name : '';
  document.getElementById('activityIcon').value = act && act.icon ? act.icon : '';
  document.getElementById('selectedIconDisplay').textContent = act && act.icon ? act.icon : '❓';
  document.getElementById('activityCategory').value = act && act.category_id ? act.category_id : (activeSchemaTab || '');
  selectStar(act ? act.star_value : 1);
  setFavorite(act ? act.is_favorite : false);
  document.getElementById('activityFeedbackFor').value = (act && act.feedback_for) ? act.feedback_for : 'both';
  document.getElementById('activityModalTitle').textContent = act ? 'Redigera aktivitet' : 'Ny aktivitet';
  document.getElementById('activityError').classList.add('hidden');
  const currentIcon = act && act.icon ? act.icon : null;
  document.querySelectorAll('#iconPicker button').forEach(btn => {
    btn.classList.toggle('border-gold', btn.textContent === currentIcon);
    btn.classList.toggle('bg-white', btn.textContent === currentIcon);
  });

  // Always show substep section; load existing steps for existing activities
  const substepSection = document.getElementById('libSubstepSection');
  if (substepSection) substepSection.classList.remove('hidden');

  if (act && act.id) {
    // Prefer cached substeps (loaded from panel), otherwise fetch
    if (subStepsCache[act.id] && subStepsCache[act.id].length > 0) {
      _libActSubsteps = subStepsCache[act.id].map(s => ({ id: s.id, name: s.name, icon: s.icon || null, _deleted: false }));
    } else {
      try {
        const res = await window.apiFetch(`/api/activities/${act.id}/sub-steps`);
        if (res.ok) {
          const steps = await res.json();
          _libActSubsteps = steps.map(s => ({ id: s.id, name: s.name, icon: s.icon || null, _deleted: false }));
          subStepsCache[act.id] = steps;
        } else {
          _libActSubsteps = [];
        }
      } catch {
        _libActSubsteps = [];
      }
    }
  } else {
    _libActSubsteps = [];
  }
  renderLibActSubsteps();
  const substepInput = document.getElementById('libActSubstepInput');
  if (substepInput) substepInput.value = '';

  if (window.LibrarySevenQuestions) {
    if (act) await LibrarySevenQuestions.initForActivity(act);
    else LibrarySevenQuestions.reset();
  }

  if (window.LibraryImages) await LibraryImages.initActivityImagePicker(act);

  document.getElementById('activityModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('activityName').focus(), 100);
}

function closeActivityModal() {
  document.getElementById('activityModal').classList.add('hidden');
  if (window.LibrarySevenQuestions) LibrarySevenQuestions.reset();
}

async function submitActivity(e) {
  e.preventDefault();
  const id = document.getElementById('activityId').value;
  const name = document.getElementById('activityName').value.trim();
  const icon = document.getElementById('activityIcon').value || null;
  const category_id = document.getElementById('activityCategory').value || null;
  const star_value = parseInt(document.getElementById('activityStarValue').value, 10);
  const is_favorite = document.getElementById('activityFavorite').value === 'true';
  const feedback_for = document.getElementById('activityFeedbackFor').value || 'both';
  const seven_questions = window.LibrarySevenQuestions ? LibrarySevenQuestions.getPayload() : undefined;

  const btn = document.getElementById('activitySubmitBtn');
  const errEl = document.getElementById('activityError');
  errEl.classList.add('hidden');

  const isPhoto = window.LibraryImages && LibraryImages.isPhotoMode();
  const image_url = isPhoto && LibraryImages ? LibraryImages.getSelectedUrl() : null;
  if (isPhoto && !image_url) {
    errEl.textContent = 'Välj en bild från bildarkivet (eller ladda upp en ny).';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true; btn.textContent = 'Sparar…';
  const url = id ? `/api/activities/${id}` : '/api/activities';
  const method = id ? 'PUT' : 'POST';
  const body = {
    name,
    icon: isPhoto ? null : icon,
    image_url: isPhoto ? image_url : null,
    category_id,
    star_value,
    is_favorite,
    feedback_for,
  };
  if (seven_questions !== undefined) body.seven_questions = seven_questions;
  const res = await window.apiFetch(url, { method, body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    const activityId = id || data.id;
    const failedSteps = await syncLibActSubsteps(activityId);
    closeActivityModal();
    if (failedSteps > 0)
      showToast(`Aktiviteten sparades men ${failedSteps} delsteg misslyckades`, true);
    else
      showToast('Aktiviteten har sparats');
    // Invalidate substep cache so the panel re-fetches on next open
    if (activityId) delete subStepsCache[activityId];
    await loadActivities();
  } else {
    errEl.textContent = data.error || 'Fel uppstod'; errEl.classList.remove('hidden');
  }
  btn.disabled = false; btn.textContent = 'Spara';
}

function deleteActivity(id, name) {
  openConfirmModal(`Ta bort aktiviteten "${name}"?`, async () => {
    const res = await window.apiFetch(`/api/activities/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { showToast('Aktiviteten har tagits bort'); await loadActivities(); }
    else showToast(data.error || 'Kunde inte ta bort aktiviteten', true);
  });
}

// ─── Activity Search (Mina aktiviteter tab) ──────────────
// Searches both own activities and standard library simultaneously
let _activitySearchStandardLoaded = false;
let _standardActivitiesFlat = []; // flat list of all standard activities for search

async function ensureStandardActivitiesLoaded() {
  if (_activitySearchStandardLoaded) return;
  try {
    const res = await window.apiFetch('/api/standard-library');
    if (res.ok) {
      const items = await res.json();
      // API returns a flat list of { id, name, icon, star_value, sort_order, sub_steps, already_copied }
      _standardActivitiesFlat = Array.isArray(items)
        ? items.map(a => ({ ...a, _groupName: 'Standardbiblioteket', _isStandard: true }))
        : [];
      _activitySearchStandardLoaded = true;
    }
  } catch {}
}

async function onActivitySearch(query) {
  const resultsEl = document.getElementById('activitySearchResults');
  const containerEl = document.getElementById('activitiesContainer');

  if (!query.trim()) {
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    containerEl.classList.remove('hidden');
    return;
  }

  containerEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = '<div class="text-center text-text-soft text-sm py-4">Söker…</div>';

  // Ensure standard library is loaded for search
  await ensureStandardActivitiesLoaded();

  const q = query.toLowerCase();

  // Filter own activities
  const ownMatches = activities.filter(a => a.name && a.name.toLowerCase().includes(q));

  // Filter standard activities (exclude already in own by name match)
  const ownNames = new Set(activities.map(a => a.name.toLowerCase()));
  const standardMatches = _standardActivitiesFlat.filter(a =>
    a.name && a.name.toLowerCase().includes(q) && !ownNames.has(a.name.toLowerCase())
  );

  if (ownMatches.length === 0 && standardMatches.length === 0) {
    resultsEl.innerHTML = `
      <div class="text-center py-8 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">
        <p class="text-3xl mb-2">🔍</p>
        <p class="font-semibold text-navy mb-1">Ingen aktivitet hittades för "${escHtml(query)}"</p>
        <p class="text-sm text-text-soft mb-4">Skapa en ny aktivitet med det här namnet</p>
        <button onclick="openActivityModalWithName(${JSON.stringify(query)})"
          class="px-5 py-2.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
          + Skapa "${escHtml(query)}"
        </button>
      </div>
    `;
    return;
  }

  let html = '';

  if (ownMatches.length > 0) {
    html += `<div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 px-1">📋 Dina aktiviteter</div>`;
    html += ownMatches.map(a => `
      <div class="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-lavender hover:border-gold transition-colors gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="text-xl flex-shrink-0">${window.ActivityVisual ? ActivityVisual.thumb(a) : (a.icon || '📌')}</span>
          <div class="min-w-0">
            <div class="font-semibold text-sm text-navy">${escHtml(a.name)}</div>
            <div class="text-xs text-text-soft">${'⭐'.repeat(a.star_value || 1)}</div>
          </div>
        </div>
        <button onclick="openActivityModalById('${a.id}')"
          class="px-3 py-1.5 bg-lavender hover:bg-purple-100 text-navy rounded-lg text-xs font-semibold transition-colors flex-shrink-0">✏️ Redigera</button>
      </div>
    `).join('');
  }

  if (standardMatches.length > 0) {
    html += `<div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 mt-3 px-1">📚 Standardbibliotek</div>`;
    html += standardMatches.slice(0, 10).map(a => `
      <div class="flex items-center justify-between bg-sky/40 rounded-xl px-3 py-2.5 border border-blue-100 hover:border-gold transition-colors gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="text-xl flex-shrink-0">${a.icon || '📌'}</span>
          <div class="min-w-0">
            <div class="font-semibold text-sm text-navy">${escHtml(a.name)}</div>
            <div class="text-xs text-text-soft">${'⭐'.repeat(a.star_value || 1)} · ${escHtml(a._groupName)}</div>
          </div>
        </div>
        <button onclick="copyStandardActivityToLibrary(${JSON.stringify(a).replace(/'/g, "\\'")})"
          class="px-3 py-1.5 bg-gold hover:bg-yellow-500 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0 whitespace-nowrap">📥 Kopiera</button>
      </div>
    `).join('');
  }

  resultsEl.innerHTML = html;
}

function openActivityModalWithName(name) {
  openActivityModal();
  document.getElementById('activityName').value = name;
  // Pre-fill category if tab is active
  if (activeSchemaTab) document.getElementById('activityCategory').value = activeSchemaTab;
}

async function copyStandardActivityToLibrary(stdActivity) {
  // Create the activity in the parent's own library
  const body = {
    name: stdActivity.name,
    icon: stdActivity.icon || null,
    star_value: stdActivity.star_value || 1,
    is_favorite: false,
    feedback_for: 'both',
    category_id: activeSchemaTab || null,
  };
  const res = await window.apiFetch('/api/activities', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    showToast(`"${stdActivity.name}" kopierad till ditt bibliotek!`);
    await loadActivities();
    // Clear search to show the updated library
    const searchInput = document.getElementById('activitySearchInput');
    if (searchInput) { searchInput.value = ''; onActivitySearch(''); }
  } else {
    showToast(data.error || 'Kunde inte kopiera aktiviteten', true);
  }
}

// ─── Reward Search (egna + standardbibliotek) ─────────────
let _rewardSearchStandardLoaded = false;
let _standardRewardsFlat = []; // flat list for search

async function ensureStandardRewardsLoaded() {
  if (_rewardSearchStandardLoaded) return;
  try {
    const res = await window.apiFetch('/api/standard-library/rewards');
    if (res.ok) {
      _standardRewardsFlat = await res.json();
      _rewardSearchStandardLoaded = true;
    }
  } catch {}
}

async function onRewardSearch(query) {
  const resultsEl = document.getElementById('rewardSearchResults');
  const containerEl = document.getElementById('rewardsContainer');

  if (!query.trim()) {
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    containerEl.classList.remove('hidden');
    return;
  }

  containerEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = '<div class="text-center text-text-soft text-sm py-4">Söker…</div>';

  await ensureStandardRewardsLoaded();

  const q = query.toLowerCase();
  const ownMatches = rewards.filter(r => r.name && r.name.toLowerCase().includes(q));

  // Standard matches — exclude those already in own library by name
  const ownNames = new Set(rewards.map(r => r.name.toLowerCase()));
  const standardMatches = _standardRewardsFlat.filter(r =>
    r.name && r.name.toLowerCase().includes(q) && !ownNames.has(r.name.toLowerCase())
  );

  if (ownMatches.length === 0 && standardMatches.length === 0) {
    resultsEl.innerHTML = `
      <div class="text-center py-8 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">
        <p class="text-3xl mb-2">🔍</p>
        <p class="font-semibold text-navy mb-1">Ingen belöning hittades för "${escHtml(query)}"</p>
        <p class="text-sm text-text-soft mb-4">Skapa en ny belöning med det här namnet</p>
        <button onclick="openRewardModalWithName(${JSON.stringify(query)})"
          class="px-5 py-2.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">
          + Skapa "${escHtml(query)}"
        </button>
      </div>
    `;
    return;
  }

  let html = '';

  if (ownMatches.length > 0) {
    html += `<div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 px-1">🏆 Dina belöningar</div>`;
    html += ownMatches.map(r => `
      <div class="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-lavender hover:border-gold transition-colors gap-2">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <span class="text-2xl flex-shrink-0">${r.icon || '🏆'}</span>
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-sm text-navy">${escHtml(r.name)}</div>
            <div class="text-xs text-text-soft">${r.star_cost} ⭐</div>
          </div>
        </div>
        <button onclick='openRewardModal(${JSON.stringify(r).replace(/'/g, "\\'")})'
          class="px-3 py-1.5 bg-lavender hover:bg-purple-100 text-navy rounded-lg text-xs font-semibold transition-colors flex-shrink-0">✏️ Redigera</button>
      </div>
    `).join('');
  }

  if (standardMatches.length > 0) {
    html += `<div class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-1 mt-3 px-1">📚 Standardbibliotek</div>`;
    html += standardMatches.slice(0, 10).map(r => `
      <div class="flex items-center justify-between bg-sky/40 rounded-xl px-3 py-2.5 border border-blue-100 hover:border-gold transition-colors gap-2">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <span class="text-2xl flex-shrink-0">${r.icon || '🏆'}</span>
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-sm text-navy">${escHtml(r.name)}</div>
            <div class="text-xs text-text-soft">${r.star_cost} ⭐ · Standardbibliotek</div>
          </div>
        </div>
        <button onclick="copyStandardRewardToLibrary(${JSON.stringify(r).replace(/'/g, "\\'")})"
          class="px-3 py-1.5 bg-gold hover:bg-yellow-500 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0 whitespace-nowrap">📥 Kopiera</button>
      </div>
    `).join('');
  }

  resultsEl.innerHTML = html;
}

function openRewardModalWithName(name) {
  openRewardModal();
  document.getElementById('rewardName').value = name;
}

async function copyStandardRewardToLibrary(stdReward) {
  const body = {
    name: stdReward.name,
    icon: stdReward.icon || '🏆',
    star_cost: stdReward.star_cost || 10,
    requires_approval: true,
    visible_to_children: null,
  };
  const res = await window.apiFetch('/api/rewards', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    showToast(`"${stdReward.name}" kopierad till ditt belöningsbibliotek!`);
    await loadRewards();
    // Update standard flat cache state to reflect new own reward
    _rewardSearchStandardLoaded = false;
    // Clear search to show updated list
    const searchInput = document.getElementById('rewardSearchInput');
    if (searchInput) { searchInput.value = ''; onRewardSearch(''); }
  } else {
    showToast(data.error || 'Kunde inte kopiera belöningen', true);
  }
}

// ─── Rewards ──────────────────────────────────────────────
async function loadRewards() {
  try {
    const res = await window.apiFetch('/api/rewards');
    if (res.ok) {
      const data = await res.json();
      rewards = data.rewards || [];
      rewardChildren = data.children || [];
      _rewardsLoaded = true;
      renderRewards();
      return;
    }
    showLibraryLoadError('rewardsContainer', 'Kunde inte ladda belöningar. Försök ladda om sidan.');
  } catch (err) {
    console.error('[LIBRARY] loadRewards failed:', err);
    showLibraryLoadError('rewardsContainer', 'Kunde inte ladda belöningar. Försök ladda om sidan.');
  }
}

function renderRewards() {
  const container = document.getElementById('rewardsContainer');
  if (!container) return;
  if (rewards.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender">
        <p class="text-4xl mb-3">🏆</p>
        <p class="font-heading font-bold text-navy text-lg mb-1">Belöningsbiblioteket är tomt</p>
        <p class="text-sm text-text-soft max-w-sm mx-auto mb-4">Lägg till belöningar som barnen kan tjäna ihop stjärnor till.</p>
        <button onclick="openRewardModal()" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">
          + Lägg till belöning
        </button>
      </div>
    `;
    return;
  }
  container.innerHTML = `
    <div class="space-y-2" id="rewardsSortableList">
      ${rewards.map(r => renderRewardItem(r)).join('')}
    </div>
  `;
  initRewardsDnD();
}

function renderRewardItem(r) {
  const isActive = r.is_active !== false;
  const isFavorite = r.is_favorite === true;
  const visLabel = !r.visible_to_children || r.visible_to_children.length === 0
    ? 'Alla barn'
    : `${r.visible_to_children.length} barn`;
  return `
    <div class="flex items-center justify-between bg-white rounded-xl px-3 py-3 gap-2 fade-in ${!isActive ? 'opacity-50' : ''}" data-id="${r.id}">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <span class="drag-handle text-text-soft text-sm select-none px-1">☰</span>
        <button type="button" onclick="toggleRewardFavorite('${r.id}', ${isFavorite})" class="text-lg flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${isFavorite ? 'text-gold' : 'text-gray-300'}" aria-label="${isFavorite ? 'Ta bort favorit' : 'Spara som favorit'}">${isFavorite ? '★' : '☆'}</button>
        <span class="text-2xl flex-shrink-0">${r.icon || '🏆'}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-sm text-navy">${escHtml(r.name)}</span>
            <span class="text-xs bg-gold-light text-navy px-2 py-0.5 rounded-full font-semibold">${r.star_cost} ⭐</span>
            ${r.requires_approval ? '<span class="text-xs bg-lavender text-navy px-2 py-0.5 rounded-full">Godkänn</span>' : ''}
            ${!isActive ? '<span class="text-xs bg-gray-100 text-text-soft px-2 py-0.5 rounded-full">Inaktiv</span>' : ''}
          </div>
          <div class="text-xs text-text-soft mt-0.5">${visLabel}</div>
        </div>
      </div>
      <!-- Desktop: inline buttons (hidden on mobile via CSS) -->
      <div class="icon-btns-desktop flex items-center gap-1 flex-shrink-0">
        <button onclick="toggleRewardActive('${r.id}', ${isActive})"
          title="${isActive ? 'Inaktivera' : 'Aktivera'}"
          class="reward-toggle px-2 py-1 ${isActive ? 'bg-mint text-green-700' : 'bg-gray-100 text-text-soft'} hover:opacity-80 rounded-lg text-sm transition-colors">
          ${isActive ? '✓' : '○'}
        </button>
        <button onclick='openRewardModal(${JSON.stringify(r).replace(/'/g, "\\'")})'
          class="icon-btn px-2 py-1 bg-lavender hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors text-text-soft">✏️</button>
        <button onclick="deleteReward('${r.id}', '${escHtml(r.name)}')"
          class="icon-btn px-2 py-1 border border-coral/40 hover:border-red-400 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors text-red-400">✕</button>
      </div>
      <!-- Mobile: ⋯ overflow menu (hidden on desktop via CSS) -->
      <div class="overflow-menu-wrap flex-shrink-0">
        <button class="overflow-menu-btn" onclick="toggleOverflowMenu(event,'omenu-r-${r.id}')" aria-label="Fler alternativ">⋯</button>
        <div id="omenu-r-${r.id}" class="overflow-menu-popup">
          <button onclick="closeOverflowMenus();toggleRewardActive('${r.id}', ${isActive})">${isActive ? '○ Inaktivera' : '✓ Aktivera'}</button>
          <button onclick="closeOverflowMenus();openRewardModal(${JSON.stringify(r).replace(/'/g, "\\'")})">✏️ Redigera</button>
          <button class="danger" onclick="closeOverflowMenus();deleteReward('${r.id}', '${escHtml(r.name)}')">✕ Ta bort</button>
        </div>
      </div>
    </div>
  `;
}

let _rewardSortable = null;
function initRewardsDnD() {
  if (_rewardSortable) _rewardSortable.destroy();
  const el = document.getElementById('rewardsSortableList');
  if (!el || typeof Sortable === 'undefined') return;
  _rewardSortable = new Sortable(el, {
    animation: 200, handle: '.drag-handle', draggable: '[data-id]',
    ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', forceFallback: true,
    onEnd: async function(evt) {
      const items = Array.from(el.querySelectorAll('[data-id]'));
      const order = items.map((item, i) => ({ id: item.dataset.id, sort_order: i }));
      try {
        const res = await window.apiFetch('/api/rewards/reorder', { method: 'PUT', body: JSON.stringify({ order }) });
        if (!res.ok) showToast('Kunde inte spara ordningen', true);
      } catch { showToast('Kunde inte spara ordningen', true); }
    },
  });
}

async function toggleRewardFavorite(id, currentlyFavorite) {
  const reward = rewards.find(r => r.id === id);
  if (!reward) return;
  const res = await window.apiFetch(`/api/rewards/${id}`, {
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
    }).catch(() => {});
  } else {
    showToast('Kunde inte uppdatera favorit', true);
  }
}

async function toggleRewardActive(id, currentlyActive) {
  const reward = rewards.find(r => r.id === id);
  if (!reward) return;
  const res = await window.apiFetch(`/api/rewards/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...reward, is_active: !currentlyActive }),
  });
  if (res.ok) { await loadRewards(); }
  else showToast('Kunde inte uppdatera belöning', true);
}

// ─── Reward modal ─────────────────────────────────────────
function openRewardModal(r) {
  document.getElementById('rewardId').value = r ? r.id : '';
  document.getElementById('rewardName').value = r ? r.name : '';
  const icon = r && r.icon ? r.icon : '🏆';
  document.getElementById('rewardIcon').value = icon;
  document.getElementById('rewardIconDisplay').textContent = icon;
  document.getElementById('rewardStarCost').value = r ? r.star_cost : 10;
  setApproval(r ? (r.requires_approval !== false) : true);
  document.getElementById('rewardModalTitle').textContent = r ? 'Redigera belöning' : 'Ny belöning';
  document.getElementById('rewardError').classList.add('hidden');
  document.querySelectorAll('#rewardIconPicker button').forEach(btn => {
    btn.classList.toggle('border-gold', btn.textContent === icon);
    btn.classList.toggle('bg-white', btn.textContent === icon);
  });
  const visContainer = document.getElementById('rewardVisibilityContainer');
  const currentVisible = r && r.visible_to_children ? r.visible_to_children : [];
  if (rewardChildren.length === 0) {
    visContainer.innerHTML = '<p class="text-sm text-text-soft">Inga barn i familjen ännu.</p>';
  } else {
    visContainer.innerHTML = rewardChildren.map(child => `
      <label class="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" class="reward-child-checkbox w-5 h-5 accent-gold" value="${child.id}">
        <span class="text-sm font-semibold text-navy">${child.emoji || '🧒'} ${escHtml(child.name)}</span>
      </label>
    `).join('');
  // Set .checked property directly — do not rely on HTML attribute alone
  visContainer.querySelectorAll('.reward-child-checkbox').forEach(cb => {
    if (currentVisible.includes(cb.value)) cb.checked = true;
  });
  }
  document.getElementById('rewardModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('rewardName').focus(), 100);
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
  const checked = Array.from(document.querySelectorAll('.reward-child-checkbox:checked')).map(cb => cb.value);
  const visible_to_children = checked.length > 0 ? checked : null;
  const btn = document.getElementById('rewardSubmitBtn');
  const errEl = document.getElementById('rewardError');
  errEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Sparar…';
  const url = id ? `/api/rewards/${id}` : '/api/rewards';
  const method = id ? 'PUT' : 'POST';
  const res = await window.apiFetch(url, {
    method,
    body: JSON.stringify({ name, icon, star_cost, requires_approval, visible_to_children }),
  });
  const data = await res.json();
  if (res.ok) {
    closeRewardModal(); showToast('Belöningen har sparats');
    await loadRewards();
  } else {
    errEl.textContent = data.error || 'Fel uppstod'; errEl.classList.remove('hidden');
  }
  btn.disabled = false; btn.textContent = 'Spara';
}

function deleteReward(id, name) {
  openConfirmModal(`Ta bort belöningen "${name}"?`, async () => {
    const res = await window.apiFetch(`/api/rewards/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { showToast('Belöningen har tagits bort'); await loadRewards(); }
    else showToast(data.error || 'Kunde inte ta bort belöningen', true);
  });
}

// ─── Confirm modal ────────────────────────────────────────
function openConfirmModal(msg, callback) {
  const msgEl = document.getElementById('confirmMsg');
  // Support newlines in message by splitting into paragraphs
  msgEl.innerHTML = msg.split('\n').map(line => line.trim() ? `<span class="block mb-2">${escHtml(line)}</span>` : '').join('');
  confirmCallback = callback;
  document.getElementById('confirmModal').classList.remove('hidden');
  document.getElementById('confirmOkBtn').onclick = async () => { closeConfirmModal(); await callback(); };
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.add('hidden');
  confirmCallback = null;
}

function closeAllLibraryModals() {
  ['categoryModal', 'activityModal', 'rewardModal', 'subStepModal', 'confirmModal', 'libActSubstepEditModal']
    .forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  ['createTemplateModal', 'scheduleCopyModal', 'copyFromModal'].forEach(function (id) {
    const dyn = document.getElementById(id);
    if (dyn) dyn.remove();
  });
  closeOverflowMenus();
}
window.closeAllLibraryModals = closeAllLibraryModals;

// ─── Utilities ────────────────────────────────────────────
// escHtml shim — delegates to escapeHtml() from /js/dom-utils.js
function escHtml(str) { return escapeHtml(str); }

// Close modals on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('categoryModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCategoryModal(); });
  document.getElementById('activityModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeActivityModal(); });
  document.getElementById('rewardModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeRewardModal(); });
  document.getElementById('confirmModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeConfirmModal(); });
  document.getElementById('subStepModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeSubStepModal(); });
});

// Magic hub modules resolve these on window (Capacitor WebView-safe).
window.openActivityModal = openActivityModal;
window.openActivityModalById = openActivityModalById;
window.openRewardModal = openRewardModal;
window.selectSchemaTab = selectSchemaTab;
window.loadActivities = loadActivities;
