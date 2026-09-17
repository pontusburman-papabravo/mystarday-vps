// child-settings.js — Child settings page logic
// Owns: profile editing, view type toggle, emoji picker, PIN numpad, rewards visibility,
//       toggle settings (mood rating, now/next, reorder, clock, schedule lock, animations),
//       PIN lockout display and unlock.
// Does NOT own: auth (auth.js), birthday picker (birthday-picker.js), toast (toast.js)

if (!Auth.requireAuth()) { /* redirected */ }

const urlParams = new URLSearchParams(window.location.search);
const childId = urlParams.get('child') || urlParams.get('id');
if (!childId) { window.location.href = '/family'; }

let childData = null;
let hasTransitionSupportAccess = false;
let pinBuffer = '';
let selectedEmoji = '';
let rewardsData = [];

function cst(key, params) {
  if (typeof window.pt === 'function') return window.pt(key, params);
  if (window.I18n && typeof I18n.t === 'function') return I18n.t(key, params);
  return key;
}

function apiErr(err, fallbackKey) {
  if (typeof window.apiErrorMessage === 'function') {
    const mapped = window.apiErrorMessage(err, fallbackKey);
    if (mapped) return mapped;
  }
  return cst(fallbackKey);
}

// showToast (red/navy) and showSuccessToast (green) are in /js/toast.js

// ── API save ────────────────────────────────────────────
async function saveSetting(field, value) {
  try {
    const updated = await Auth.api(`/api/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify({ [field]: value }),
    });
    // Update local data
    if (childData) childData[field] = value;
    return updated;
  } catch (err) {
    showToast(apiErr(err, 'family.childProfile.setup.saveFailed'), true);
    throw err;
  }
}

/** NU/NÄSTA/SEDAN — parent opt-in; enables badges + one-at-a-time checkoff together. */
async function saveNnlMode(enabled) {
  try {
    const updated = await Auth.api(`/api/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify({
        show_now_next: enabled,
        require_sequential_completion: enabled,
      }),
    });
    if (childData) {
      childData.show_now_next = enabled;
      childData.require_sequential_completion = enabled;
    }
    return updated;
  } catch (err) {
    showToast(apiErr(err, 'family.childProfile.setup.saveFailed'), true);
    throw err;
  }
}

function isNnlModeEnabled(child) {
  return child && child.show_now_next === true;
}

// ── Toggle helper ───────────────────────────────────────
function makeToggle(id, field, value, onChange) {
  const track = document.getElementById(id);
  if (!track) return;
  if (value) track.classList.add('on'); else track.classList.remove('on');
  track.onclick = async () => {
    const newVal = !track.classList.contains('on');
    track.classList.toggle('on');
    try {
      await saveSetting(field, newVal);
      showSuccessToast(newVal ? cst('family.childSettings.settingsEnabled') : cst('family.childSettings.settingsDisabled'));
      if (onChange) onChange(newVal);
    } catch(_e) {
      // revert
      track.classList.toggle('on');
    }
  };
}

// ── View config ─────────────────────────────────────────
let childViewConfig = null;
async function loadViewConfig() {
  try {
    childViewConfig = await Auth.api(`/api/children/${childId}/view-config`);
    console.log('[child-settings] view-config loaded:', JSON.stringify(childViewConfig));
  } catch (err) {
    console.warn('[child-settings] view-config load failed, using defaults:', err.message);
    childViewConfig = { view_mode: 'classic', show_countdown_timer: true, show_timeline_pipeline: true, show_child_profile_card: true, show_progress_ring: true, show_star_goal: true };
  }
}

async function saveViewConfig(config) {
  console.log('[child-settings] PATCH view-config body:', JSON.stringify(config));
  try {
    const result = await Auth.api(`/api/children/${childId}/view-config`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
    // Merge server response with existing state to handle partial responses safely.
    // If result is null/undefined (malformed response), preserve existing config.
    if (result && typeof result === 'object') {
      childViewConfig = { ...(childViewConfig || {}), ...result };
    } else {
      console.warn('[child-settings] PATCH response invalid, preserving local state');
    }
    console.log('[child-settings] PATCH view-config response:', JSON.stringify(childViewConfig));
    return true;
  } catch (err) {
    console.error('[child-settings] PATCH view-config error:', err.message);
    showToast(apiErr(err, 'family.childProfile.setup.saveFailed'), true);
    return false;
  }
}

function initViewConfigPanel() {
  const vm = childViewConfig || {};
  const isNew = vm.view_mode === 'new';

  // View mode toggle
  const classicBtn = document.getElementById('viewModeClassic');
  const newBtn = document.getElementById('viewModeNew');
  if (classicBtn && newBtn) {
    if (isNew) {
      newBtn.classList.add('active');
      classicBtn.classList.remove('active');
    } else {
      classicBtn.classList.add('active');
      newBtn.classList.remove('active');
    }
    classicBtn.onclick = async () => {
      // Read current state directly from module-level childViewConfig to avoid stale closures
      const current = childViewConfig || {};
      if (current.view_mode === 'classic') return;
      const ok = await saveViewConfig({ ...current, view_mode: 'classic' });
      if (ok) {
        // DOM sync — read from childViewConfig (server response)
        if (childViewConfig && childViewConfig.view_mode === 'classic') {
          classicBtn.classList.add('active');
          newBtn.classList.remove('active');
          document.getElementById('viewConfigElements')?.classList.add('hidden');
          showSuccessToast(cst('family.childSettings.classicSaved'));
        }
      }
    };
    newBtn.onclick = async () => {
      const current = childViewConfig || {};
      if (current.view_mode === 'new') return;
      const ok = await saveViewConfig({ ...current, view_mode: 'new' });
      if (ok) {
        if (childViewConfig && childViewConfig.view_mode === 'new') {
          newBtn.classList.add('active');
          classicBtn.classList.remove('active');
          document.getElementById('viewConfigElements')?.classList.remove('hidden');
          showSuccessToast(cst('family.childSettings.newDesignSaved'));
        }
      }
    };
  }

  // Element toggles
  const elementToggles = [
    ['viewCfgTimer', 'show_countdown_timer'],
    ['viewCfgTimeline', 'show_timeline_pipeline'],
    ['viewCfgCard', 'show_child_profile_card'],
    ['viewCfgRing', 'show_progress_ring'],
    ['viewCfgGoal', 'show_star_goal'],
  ];
  elementToggles.forEach(([id, field]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isOn = vm[field] !== false;
    if (isOn) el.classList.add('on');
    el.onclick = async () => {
      const current = childViewConfig || {};
      if (!current.view_mode || current.view_mode === 'classic') return; // only toggle when in new mode
      const newVal = !el.classList.contains('on');
      el.classList.toggle('on');
      const ok = await saveViewConfig({ ...current, [field]: newVal });
      if (ok) {
        showSuccessToast(newVal ? cst('family.childSettings.shownInNewView') : cst('family.childSettings.hiddenInNewView'));
      } else {
        el.classList.toggle('on'); // revert
      }
    };
  });

  // Minimal UI toggle
  const minimalTrack = document.getElementById('viewCfgMinimalUi');
  if (minimalTrack) {
    minimalTrack.onclick = async () => {
      const current = childViewConfig || {};
      const newVal = !minimalTrack.classList.contains('on');
      minimalTrack.classList.toggle('on');
      const ok = await saveViewConfig({ ...current, minimal_ui: newVal });
      if (ok) {
        showSuccessToast(newVal ? cst('family.childSettings.minimalOn') : cst('family.childSettings.minimalOff'));
        // Fire analytics event
        if (newVal && childId) {
          fetch('/api/analytics/event', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'feature_minimal_ui_enabled', metadata: { child_id: childId } }),
          }).catch(() => {});
        }
      } else {
        minimalTrack.classList.toggle('on'); // revert
      }
    };
  }

  // Show/hide elements panel based on view_mode
  const panel = document.getElementById('viewConfigElements');
  if (panel) {
    if (isNew) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  }
}

// ── View type toggle ────────────────────────────────────
let currentViewType = 'day_sections';
function initViewToggle(initialType) {
  currentViewType = initialType;
  const dayBtn = document.getElementById('viewBtnDay');
  const tlBtn = document.getElementById('viewBtnTimeline');
  if (!dayBtn || !tlBtn) return;

  function setActive(type) {
    currentViewType = type;
    if (type === 'day_sections') {
      dayBtn.classList.add('active');
      tlBtn.classList.remove('active');
    } else {
      tlBtn.classList.add('active');
      dayBtn.classList.remove('active');
    }
    updateViewExplanation(type);
  }
  setActive(initialType);

  dayBtn.onclick = async () => {
    if (currentViewType === 'day_sections') return;
    setActive('day_sections');
    try {
      await saveSetting('view_type', 'day_sections');
      showSuccessToast(cst('family.childSettings.dayViewSaved'));
    } catch(_e) { setActive('now_next_later'); }
  };
  tlBtn.onclick = async () => {
    if (currentViewType === 'now_next_later') return;
    setActive('now_next_later');
    try {
      await saveSetting('view_type', 'now_next_later');
      showSuccessToast(cst('family.childSettings.timelineSaved'));
    } catch(_e) { setActive('day_sections'); }
  };
}

// ── Emoji picker ────────────────────────────────────────
function initEmojiPicker(currentEmoji) {
  selectedEmoji = currentEmoji || '';
  document.querySelectorAll('.emoji-opt').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.emoji === selectedEmoji) btn.classList.add('selected');
    btn.onclick = () => {
      document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = btn.dataset.emoji;
    };
  });
}

// ── Header avatar preview ───────────────────────────────
function setHeaderAvatarPreview(child) {
  const card = document.querySelector('.section-card .flex.items-center.gap-4');
  if (!card || !child) return;
  const wrap = document.getElementById('headerAvatarWrap');
  if (wrap && window.MemberAvatar) {
    wrap.innerHTML = MemberAvatar.renderChildAvatar(child, 64);
    return;
  }
  const hdrImg = document.getElementById('headerAvatarImg');
  if (hdrImg && child.avatar_src) {
    hdrImg.src = child.avatar_src;
    return;
  }
}

// ── Profile save ────────────────────────────────────────
async function saveProfile(e) {
  e.preventDefault();
  const nameVal = document.getElementById('profileName').value.trim();
  if (!nameVal) { showToast(cst('family.childProfile.setup.identity.nameRequired'), true); return; }
  const bdYear = document.getElementById('bdYear').value;
  const bdMonth = document.getElementById('bdMonth').value;
  const bdDay = document.getElementById('bdDay').value;
  const birthday = (bdYear && bdMonth && bdDay) ? `${bdYear}-${bdMonth}-${bdDay}` : undefined;
  const body = { name: nameVal, emoji: selectedEmoji };
  if (birthday) body.birthday = birthday;
  // Profile photo uses dedicated avatar endpoints (not PUT body).
  try {
    const updated = await Auth.api(`/api/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    childData = { ...childData, ...updated };
    document.getElementById('pageTitle').textContent = updated.name || cst('family.childSettings.heading');
    document.getElementById('pageEmoji').textContent = updated.emoji || '⭐';
    if (updated.has_avatar !== undefined) setHeaderAvatarPreview({ ...childData, ...updated });
    showSuccessToast(cst('family.childSettings.settingsSaved'));
  } catch (err) {
    showToast(apiErr(err, 'family.childProfile.setup.saveFailed'), true);
  }
}

// ── Avatar photo picker (PWA + native) ───────────────────
async function changeChildPhoto() {
  const btn = document.getElementById('changePhotoBtn');
  if (!btn || !window.AvatarUploadFlow) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = cst('family.childProfile.setup.loading');
  try {
    const endpoint = '/api/children/' + encodeURIComponent(childId) + '/avatar';
    const updated = await AvatarUploadFlow.pickCropAndUpload(endpoint);
    if (!updated) return;
    childData = { ...childData, ...updated };
    setHeaderAvatarPreview(childData);
    if (childData.username && typeof Auth.persistKnownChildrenFromSession === 'function') {
      Auth.persistKnownChildrenFromSession([childData], Auth.getFamilyId());
    }
    btn.textContent = cst('family.childSettings.photoSaved');
    btn.classList.remove('text-gold');
    btn.classList.add('text-green-600');
    setTimeout(function () {
      btn.textContent = cst('family.childSettings.changePhoto');
      btn.classList.remove('text-green-600');
      btn.classList.add('text-gold');
    }, 2000);
  } catch (err) {
    console.error('[child-settings] photo change failed:', err.message);
    showToast(apiErr(err, 'family.childSettings.changePhotoFailed'), true);
  } finally {
    btn.disabled = false;
    if (btn.textContent === cst('family.childProfile.setup.loading')) btn.textContent = orig;
  }
}

// initBirthdayPicker is now in /js/birthday-picker.js

// ── Vibration toggle ──────────────────────────────────
// Stored in localStorage (no server field needed — client preference only)
function initHapticsToggle() {
  const track = document.getElementById('toggle-haptics_enabled');
  if (!track) return;

  // Sync initial state with localStorage
  const stored = localStorage.getItem('stjarndag_haptics_enabled');
  const isOn = stored === null ? true : stored === 'true';
  if (!isOn) track.classList.remove('on');

  track.onclick = () => {
    const newVal = !track.classList.contains('on');
    track.classList.toggle('on');
    // Persist to localStorage
    localStorage.setItem('stjarndag_haptics_enabled', newVal ? 'true' : 'false');
    showSuccessToast(newVal ? cst('family.childProfile.setup.toggles.haptics.on') : cst('family.childProfile.setup.toggles.haptics.off'));
  };
}

// ── PIN numpad ──────────────────────────────────────────
function initPinPad() {
  pinBuffer = '';
  renderPinDots();
  const numpad = document.getElementById('pinNumpad');
  if (!numpad) return;
  numpad.querySelectorAll('.pin-key[data-digit]').forEach(btn => {
    btn.onclick = () => {
      if (pinBuffer.length >= 4) return;
      pinBuffer += btn.dataset.digit;
      renderPinDots();
      if (pinBuffer.length === 4) {
        setTimeout(submitPin, 200);
      }
    };
  });
  const delBtn = document.getElementById('pinDelBtn');
  if (delBtn) delBtn.onclick = () => { pinBuffer = pinBuffer.slice(0,-1); renderPinDots(); };
}

function renderPinDots() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    if (i < pinBuffer.length) dot.classList.add('filled');
    else dot.classList.remove('filled');
  });
  const saveBtn = document.getElementById('pinSaveBtn');
  if (saveBtn) saveBtn.disabled = pinBuffer.length !== 4;
}

async function submitPin() {
  if (pinBuffer.length !== 4) return;
  const btn = document.getElementById('pinSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = cst('settings.account.saving'); }
  try {
    await Auth.api(`/api/children/${childId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pin: pinBuffer }),
    });
    showSuccessToast(cst('family.childProfile.pinSaved'));
    pinBuffer = '';
    renderPinDots();
  } catch (err) {
    showToast(apiErr(err, 'family.childProfile.pinSaveFailed'), true);
    pinBuffer = '';
    renderPinDots();
  }
  if (btn) { btn.disabled = false; btn.textContent = cst('family.childProfile.pinSave'); }
}

// ── Rewards ─────────────────────────────────────────────
async function loadRewards() {
  const container = document.getElementById('rewardsList');
  if (!container) return;
  try {
    const resp = await Auth.api('/api/rewards');
    // API returns { rewards: [...], children: [...] } or just array
    rewardsData = (Array.isArray(resp) ? resp : (resp.rewards || [])).filter(function (r) {
      return r && r.is_active !== false;
    });
    if (rewardsData.length === 0) {
      container.innerHTML = '<p class="text-sm text-text-soft italic">' + cst('family.childSettings.emptyRewards') + ' <a href="/library" class="text-gold underline">' + cst('family.childSettings.createInLibrary') + '</a></p>';
      return;
    }
    container.innerHTML = rewardsData.map(r => {
      // visible_to_children: null = visible to all, [] = hidden from all, [id,...] = specific
      const vtc = r.visible_to_children;
      const visible = vtc === null || vtc === undefined || (Array.isArray(vtc) && vtc.includes(childId));
      return `<div class="reward-row">
        <div class="flex items-center gap-3">
          <span class="text-xl">${r.icon || r.emoji || '🏆'}</span>
          <div>
            <p class="text-sm font-semibold text-navy dark:text-white">${escHtml(r.name)}</p>
            <p class="text-xs text-text-soft">${r.star_cost} ⭐</p>
          </div>
        </div>
        <div class="toggle-track ${visible ? 'on' : ''}" id="reward-toggle-${r.id}">
          <div class="toggle-thumb"></div>
        </div>
      </div>`;
    }).join('');

    // Wire toggles
    rewardsData.forEach(r => {
      const track = document.getElementById(`reward-toggle-${r.id}`);
      if (!track) return;
      track.onclick = async () => {
        const wasOn = track.classList.contains('on');
        track.classList.toggle('on');
        try {
          // Build new visible_to_children array for this reward
          // Get current state from our local cache
          const rewardEntry = rewardsData.find(x => x.id === r.id);
          const vtcCurrent = rewardEntry?.visible_to_children;
          let newVtc;
          if (wasOn) {
            // turning off: remove this child from visible list
            if (vtcCurrent === null || vtcCurrent === undefined) {
              // was all-visible → make it visible to all EXCEPT this child
              // get all children IDs, exclude this one
              const allChildren = await Auth.api('/api/children');
              const otherIds = allChildren.map(c => c.id).filter(id => id !== childId);
              newVtc = otherIds;
            } else {
              newVtc = (Array.isArray(vtcCurrent) ? vtcCurrent : []).filter(id => id !== childId);
            }
          } else {
            // turning on: add this child to visible list
            if (vtcCurrent === null || vtcCurrent === undefined) {
              newVtc = null; // already all-visible, stays that way
            } else {
              newVtc = [...new Set([...(vtcCurrent || []), childId])];
            }
          }
          const updated = await Auth.api(`/api/rewards/${r.id}`, {
            method: 'PUT',
            body: JSON.stringify({ visible_to_children: newVtc }),
          });
          // Update local cache
          if (rewardEntry) rewardEntry.visible_to_children = updated.visible_to_children;
          showSuccessToast(wasOn ? cst('family.childSettings.hiddenForChild') : cst('family.childSettings.visibleForChild'));
        } catch (err) {
          track.classList.toggle('on'); // revert
          showToast(apiErr(err, 'family.childProfile.setup.updateFailed'), true);
        }
      };
    });
  } catch (_err) {
    if (container) container.innerHTML = '<p class="text-sm text-red-500">' + cst('family.childProfile.errors.loadRewards') + '</p>';
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.saveProfile = saveProfile;
window.changeChildPhoto = changeChildPhoto;
window.unlockChild = unlockChild;

// ── Main render ─────────────────────────────────────────
function renderPage(child) {
  const currentViewType = child.view_type || 'day_sections';
  const ageText = child.birthday ? calcAge(child.birthday) : null;
  const avatarBlock = window.MemberAvatar
    ? '<div id="headerAvatarWrap" class="flex-shrink-0">' + MemberAvatar.renderChildAvatar(child, 64) + '</div>'
    : (child.has_avatar && child.avatar_src
      ? '<img src="' + escHtml(child.avatar_src) + '" class="w-16 h-16 rounded-full object-cover flex-shrink-0" alt="' + escHtml(child.name) + '" id="headerAvatarImg" />'
      : '<span class="text-5xl flex-shrink-0">' + (child.emoji || '👤') + '</span>');
  const moodMode = child.mood_input_mode || 'slider';
  const leadMins = Array.isArray(child.transition_lead_minutes) ? child.transition_lead_minutes : [5, 1];

  const html = `
  <!-- Child header card -->
  <div class="section-card fade-in" style="background: linear-gradient(135deg, #FFF9EE, #FFF0D0); border: 2px solid rgba(245,166,35,0.3);">
    <div class="flex items-center gap-4">
      ${avatarBlock}
      <div>
        <h2 class="text-xl font-heading font-bold text-navy">${escHtml(child.name)}</h2>
        <p class="text-sm text-text-soft">${ageText ? ageText : cst('family.child.ageUnknown')}</p>
        <!-- Byt profilbild (PWA + native) -->
        <button id="changePhotoBtn" onclick="changeChildPhoto()" class="mt-1.5 text-xs text-gold font-semibold hover:text-gold-dark transition-colors">
          ${cst('family.childSettings.changePhoto')}
        </button>
      </div>
    </div>
  </div>

  <!-- 1. Profil -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.profileTitle')}</div>
    <form id="profileForm" onsubmit="saveProfile(event)" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-text-soft mb-1.5">${cst('family.childSettings.nameLabel')}</label>
        <input id="profileName" type="text" value="${escHtml(child.name)}" required
          class="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none transition-colors"
          placeholder="${cst('family.childProfile.setup.identity.nameLabel')}" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-text-soft mb-1.5">${cst('family.childProfile.setup.identity.birthdayLabel')}</label>
        <div class="grid grid-cols-3 gap-2">
          <select id="bdYear" onchange="updateBirthdayDays('bd')" class="w-full min-w-0 px-2 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none">
            <option value="">${cst('family.childProfile.setup.identity.year')}</option>
          </select>
          <select id="bdMonth" onchange="updateBirthdayDays('bd')" class="w-full min-w-0 px-2 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none">
            <option value="">${cst('family.childProfile.setup.identity.month')}</option>
          </select>
          <select id="bdDay" class="w-full min-w-0 px-2 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none">
            <option value="">${cst('family.childProfile.setup.identity.day')}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-text-soft mb-1.5">${cst('family.childProfile.setup.identity.emojiLabel')}</label>
        <div class="flex flex-wrap gap-2">
          ${['👧','👦','🧒','👶','🌟','🦄','🐱','🐶','🐻','🦊','🌈','🎀'].map(em =>
            `<button type="button" class="emoji-opt" data-emoji="${em}">${em}</button>`
          ).join('')}
        </div>
      </div>
      <button type="submit"
        class="w-full py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-heading font-bold text-sm transition-colors">
        ${cst('family.childProfile.setup.identity.saveProfile')}
      </button>
    </form>
  </div>

  <!-- 2. Vy -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.viewTitle')}</div>
    <p class="text-xs text-text-soft mb-4">${cst('family.childSettings.viewLead')}</p>
    <div class="view-toggle" id="viewToggle">
      <button class="view-btn" id="viewBtnDay" type="button">
        ${cst('family.childSettings.viewDay')}<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">${cst('family.childSettings.viewDayHint')}</span>
      </button>
      <button class="view-btn" id="viewBtnTimeline" type="button">
        ${cst('family.childSettings.viewTimeline')}<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">${cst('family.childSettings.viewTimelineHint')}</span>
      </button>
    </div>
    <div class="mt-4 p-3 rounded-xl" id="viewExplanation"
      style="background:rgba(245,166,35,0.08); border: 1px solid rgba(245,166,35,0.2);">
      <p class="text-xs text-text-soft" id="viewExplainText"></p>
    </div>
  </div>

  <!-- 2b. Barnvy-inställningar -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.childViewTitle')}</div>
    <p class="text-xs text-text-soft mb-2">${cst('family.childSettings.childViewLead', { name: escHtml(child.name) })}</p>
    <p class="text-xs text-text-soft mb-4" style="opacity:0.85">${cst('family.childSettings.childViewPreviewHint')}</p>
    <div class="view-toggle mb-4" id="childViewToggle">
      <button class="view-btn" id="viewModeClassic" type="button">
        ${cst('family.childSettings.classic')}<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">${cst('family.childSettings.classicHint')}</span>
      </button>
      <button class="view-btn" id="viewModeNew" type="button">
        ${cst('family.childSettings.newDesign')}<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">${cst('family.childSettings.newDesignHint')}</span>
      </button>
    </div>
    <!-- Element visibility — only shown when new view is selected -->
    <div id="viewConfigElements" class="hidden mt-4">
      <p class="text-xs font-semibold text-text-soft mb-3">${cst('family.childSettings.elementsHeading')}</p>
      <div class="space-y-1">
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childSettings.countdownTimer')}</p>
            <p class="text-xs text-text-soft mt-0.5">${cst('family.childSettings.countdownHint')}</p>
          </div>
          <div class="toggle-track on" id="viewCfgTimer" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childSettings.timelinePipeline')}</p>
            <p class="text-xs text-text-soft mt-0.5">${cst('family.childSettings.timelinePipelineHint')}</p>
          </div>
          <div class="toggle-track on" id="viewCfgTimeline" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childSettings.profileCard')}</p>
            <p class="text-xs text-text-soft mt-0.5">${cst('family.childSettings.profileCardHint')}</p>
          </div>
          <div class="toggle-track on" id="viewCfgCard" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childSettings.progressRing')}</p>
            <p class="text-xs text-text-soft mt-0.5">${cst('family.childSettings.progressRingHint')}</p>
          </div>
          <div class="toggle-track on" id="viewCfgRing" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2" style="border-bottom:none;">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childSettings.starGoal')}</p>
            <p class="text-xs text-text-soft mt-0.5">${cst('family.childSettings.starGoalHint')}</p>
          </div>
          <div class="toggle-track on" id="viewCfgGoal" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Minimal UI — distraktionsfritt läge -->
    <div class="mt-4 p-3 rounded-xl" style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);">
      <div class="flex items-start gap-3">
        <span class="text-xl mt-0.5">🧘</span>
        <div class="flex-1">
          <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.view.minimalUiLabel')}</p>
          <p class="text-xs text-text-soft mt-0.5 mb-3">${cst('family.childSettings.minimalHint')}</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-soft">${childViewConfig && childViewConfig.minimal_ui ? cst('family.childSettings.enabled') : cst('family.childSettings.disabled')}</span>
            <div class="toggle-track ${childViewConfig && childViewConfig.minimal_ui ? 'on' : ''}" id="viewCfgMinimalUi" style="min-width:44px;min-height:24px;display:flex;align-items:center;justify-content:center;">
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 3. Belöningar -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.rewardsTitle')}</div>
    <p class="text-xs text-text-soft mb-4">${cst('family.childSettings.rewardsLead', { name: escHtml(child.name) })}</p>
    <div id="rewardsList">
      <p class="text-sm text-text-soft italic">${cst('family.childProfile.setup.moodRewards.loadingRewards')}</p>
    </div>
    <a href="/library" class="block mt-4 text-center text-xs text-gold hover:underline">
      ${cst('family.childSettings.createMoreRewards')}
    </a>
  </div>

  <!-- 4. Känslor -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.moodTitle')}</div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.moodRewards.moodLabel')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childSettings.moodHint')}</p>
      </div>
      <div class="toggle-track ${child.show_mood_rating !== false ? 'on' : ''}" id="toggle-show_mood_rating">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="mt-4 pt-3 border-t border-lavender/60">
      <p class="text-xs font-semibold text-text-soft mb-2">${cst('family.childSettings.moodHow')}</p>
      <div class="flex flex-col gap-2" id="moodModeGroup">
        <label class="flex items-center gap-2 text-sm text-navy dark:text-white cursor-pointer">
          <input type="radio" name="mood_input_mode" value="slider" ${moodMode === 'slider' ? 'checked' : ''} class="accent-gold"> ${cst('family.childSettings.moodSlider')}
        </label>
        <label class="flex items-center gap-2 text-sm text-navy dark:text-white cursor-pointer">
          <input type="radio" name="mood_input_mode" value="cards" ${moodMode === 'cards' ? 'checked' : ''} class="accent-gold"> ${cst('family.childSettings.moodCards')}
        </label>
        <label class="flex items-center gap-2 text-sm text-navy dark:text-white cursor-pointer">
          <input type="radio" name="mood_input_mode" value="off" ${moodMode === 'off' ? 'checked' : ''} class="accent-gold"> ${cst('family.childSettings.moodOff')}
        </label>
      </div>
    </div>
  </div>

  ${hasTransitionSupportAccess ? `
  <!-- 4b. Övergångsstöd (Extra stöd) -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childProfile.setup.transition.title')}</div>
    <p class="text-xs text-text-soft mb-3">${cst('family.childProfile.setup.transition.body')}</p>
    <div class="flex flex-col gap-2" id="transitionLeadGroup">
      ${[5, 3, 1].map((m) => `
        <label class="flex items-center gap-2 text-sm text-navy dark:text-white cursor-pointer">
          <input type="checkbox" class="transition-lead-cb accent-gold" data-minutes="${m}" ${leadMins.includes(m) ? 'checked' : ''}>
          ${m === 1 ? cst('family.childProfile.setup.transition.leadOne', { minutes: m }) : cst('family.childProfile.setup.transition.leadMany', { minutes: m })}
        </label>`).join('')}
    </div>
    <p class="text-xs text-text-soft mt-3">${cst('family.childProfile.setup.transition.hint')}</p>
  </div>
  ` : ''}

  <!-- 5. PIN -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.pinTitle')}</div>

    <!-- Lockout warning banner (shown if child is currently locked out) -->
    <div id="lockoutBanner" class="hidden mb-4 p-3 bg-lavender rounded-xl border border-purple-300">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">🔒</span>
          <div>
            <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childSettings.lockedOut', { name: escHtml(child.name) })}</p>
            <p class="text-xs text-text-soft" id="lockoutBannerText">${cst('family.childSettings.lockoutAttempts')}</p>
          </div>
        </div>
        <button id="unlockBtn" onclick="unlockChild()"
          class="flex-shrink-0 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-heading font-bold text-xs transition-colors">
          ${cst('family.childSettings.unlock')}
        </button>
      </div>
    </div>

    <p class="text-xs text-text-soft mb-4">${cst('family.childSettings.pinLead', { name: escHtml(child.name) })}</p>
    <div class="pin-dots">
      <div class="pin-dot"></div>
      <div class="pin-dot"></div>
      <div class="pin-dot"></div>
      <div class="pin-dot"></div>
    </div>
    <div class="pin-numpad" id="pinNumpad">
      <button class="pin-key" data-digit="1">1</button>
      <button class="pin-key" data-digit="2">2</button>
      <button class="pin-key" data-digit="3">3</button>
      <button class="pin-key" data-digit="4">4</button>
      <button class="pin-key" data-digit="5">5</button>
      <button class="pin-key" data-digit="6">6</button>
      <button class="pin-key" data-digit="7">7</button>
      <button class="pin-key" data-digit="8">8</button>
      <button class="pin-key" data-digit="9">9</button>
      <button class="pin-key empty" disabled></button>
      <button class="pin-key" data-digit="0">0</button>
      <button class="pin-key delete" id="pinDelBtn">⌫</button>
    </div>
    <button id="pinSaveBtn" onclick="submitPin()" disabled
      class="w-full mt-4 py-3 bg-navy hover:bg-navy-soft dark:bg-gold dark:hover:bg-yellow-500 text-white rounded-xl font-heading font-bold text-sm transition-colors disabled:opacity-40">
      ${cst('family.childProfile.pinSave')}
    </button>
  </div>

  <!-- 6. Avancerade inställningar -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.advancedTitle')}</div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.nnl.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childSettings.nnlHint')}</p>
      </div>
      <div class="toggle-track ${isNnlModeEnabled(child) ? 'on' : ''}" id="toggle-show_now_next">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.reorder.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.reorder.hint')}</p>
      </div>
      <div class="toggle-track ${child.allow_child_reorder ? 'on' : ''}" id="toggle-allow_child_reorder">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.hideClock.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.hideClock.hint')}</p>
      </div>
      <div class="toggle-track ${child.hide_clock ? 'on' : ''}" id="toggle-hide_clock">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.lockSchedule.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.lockSchedule.hint')}</p>
      </div>
      <div class="toggle-track ${child.lock_schedule ? 'on' : ''}" id="toggle-lock_schedule">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.dopamin.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.dopamin.hint')}</p>
      </div>
      <div class="toggle-track ${child.dopamin_animation !== false ? 'on' : ''}" id="toggle-dopamin_animation">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row" id="hapticsToggleRow">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.haptics.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.haptics.hint')}</p>
      </div>
      <div class="toggle-track on" id="toggle-haptics_enabled" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.activityTimers.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.activityTimers.hint')}</p>
      </div>
      <div class="toggle-track ${child.activity_timers_enabled === true ? 'on' : ''}" id="toggle-activity_timers_enabled">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.visualTimer.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.visualTimer.hint')}</p>
      </div>
      <div class="toggle-track ${child.visual_timer !== false ? 'on' : ''}" id="toggle-visual_timer">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">${cst('family.childProfile.setup.toggles.colorCoding.label')}</p>
        <p class="text-xs text-text-soft mt-0.5">${cst('family.childProfile.setup.toggles.colorCoding.hint')}</p>
      </div>
      <div class="toggle-track ${child.color_coding !== false ? 'on' : ''}" id="toggle-color_coding">
        <div class="toggle-thumb"></div>
      </div>
    </div>
  </div>

  <!-- 7. Schema -->
  <div class="section-card fade-in">
    <div class="section-title">${cst('family.childSettings.scheduleTitle')}</div>
    <a href="/schedule?child=${childId}"
      class="flex items-center justify-between gap-3 w-full px-4 py-3.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">
      <div class="flex items-center gap-2">
        <span class="text-lg">✏️</span>
        <div>
          <div class="font-heading font-bold text-sm">${cst('family.childSettings.editSchedule')}</div>
          <div class="text-xs opacity-80">${cst('family.childSettings.editScheduleHint')}</div>
        </div>
      </div>
      <span>→</span>
    </a>
  </div>

  <!-- Bottom spacer -->
  <div class="section-card fade-in" style="border: 1px solid rgba(239,68,68,0.25);">
    <div class="section-title text-red-700">${cst('family.childSettings.dangerZone')}</div>
    <button type="button" id="deleteChildBtn"
      class="w-full px-4 py-3 bg-coral hover:bg-red-100 text-red-700 rounded-xl text-sm font-semibold transition-colors min-h-[44px]">
      ${cst('family.childProfile.setup.delete.button')}
    </button>
    <p class="text-xs text-text-soft mt-2 text-center">${cst('family.childSettings.deleteHint')}</p>
  </div>

  <div class="h-8"></div>
  `;

  document.getElementById('mainContent').innerHTML = html;
  document.getElementById('loadingState')?.remove();

  // Init all interactive bits
  initViewToggle(currentViewType);
  initEmojiPicker(child.emoji);
  initBirthdayPicker('bd');
  setBirthdayValue(child.birthday, 'bd');
  initPinPad();
  loadRewards();

  // Wire boolean toggles
  const toggles = [
    ['toggle-show_mood_rating', 'show_mood_rating', child.show_mood_rating !== false],
    ['toggle-allow_child_reorder', 'allow_child_reorder', !!child.allow_child_reorder],
    ['toggle-hide_clock', 'hide_clock', !!child.hide_clock],
    ['toggle-lock_schedule', 'lock_schedule', !!child.lock_schedule],
    ['toggle-dopamin_animation', 'dopamin_animation', child.dopamin_animation !== false],
    ['toggle-visual_timer', 'visual_timer', child.visual_timer !== false],
    ['toggle-activity_timers_enabled', 'activity_timers_enabled', child.activity_timers_enabled === true],
    ['toggle-color_coding', 'color_coding', child.color_coding !== false],
  ];
  toggles.forEach(([id, field, val]) => makeToggle(id, field, val));

  const nnlTrack = document.getElementById('toggle-show_now_next');
  if (nnlTrack) {
    nnlTrack.onclick = async () => {
      const newVal = !nnlTrack.classList.contains('on');
      nnlTrack.classList.toggle('on');
      try {
        await saveNnlMode(newVal);
        showSuccessToast(newVal ? cst('family.childProfile.setup.toggles.nnl.on') : cst('family.childProfile.setup.toggles.nnl.off'));
      } catch (_) {
        nnlTrack.classList.toggle('on');
      }
    };
  }

  document.querySelectorAll('input[name="mood_input_mode"]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      if (!radio.checked) return;
      try {
        await saveSetting('mood_input_mode', radio.value);
        showSuccessToast(cst('family.childSettings.moodSaved'));
      } catch (_) { /* reverted by saveSetting */ }
    });
  });

  document.querySelectorAll('.transition-lead-cb').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const selected = [...document.querySelectorAll('.transition-lead-cb:checked')]
        .map((el) => parseInt(el.dataset.minutes, 10))
        .filter((n) => !Number.isNaN(n));
      if (selected.length === 0) {
        showToast(cst('family.childProfile.setup.transition.selectAtLeastOne'), true);
        cb.checked = true;
        return;
      }
      try {
        await saveSetting('transition_lead_minutes', selected);
        showSuccessToast(cst('family.childProfile.setup.transition.saved'));
      } catch (_) {
        cb.checked = !cb.checked;
      }
    });
  });

  initDeleteChild(child);
}

function initDeleteChild(child) {
  const btn = document.getElementById('deleteChildBtn');
  if (!btn) return;
  if (!child || child.role !== 'primary') {
    const zone = btn.closest('.section-card');
    if (zone) zone.classList.add('hidden');
    else btn.classList.add('hidden');
    return;
  }

  btn.addEventListener('click', () => {
    const name = child.name || cst('family.childProfile.deleteChildDefaultName');
    const ok = window.confirm(
      cst('family.childSettings.deleteConfirm', { name: name })
    );
    if (!ok) return;

    btn.disabled = true;
    Auth.api('/api/family/children/' + childId, { method: 'DELETE' })
      .then(() => {
        showSuccessToast(cst('family.childProfile.deleteChildSuccess'));
        window.location.href = '/family';
      })
      .catch((err) => {
        showToast(apiErr(err, 'family.childProfile.deleteChildFailed'), true);
        btn.disabled = false;
      });
  });
}

function updateViewExplanation(type) {
  const el = document.getElementById('viewExplainText');
  if (!el) return;
  if (type === 'day_sections') {
    el.textContent = cst('family.childSettings.viewExplainDay');
  } else {
    el.textContent = cst('family.childSettings.viewExplainTimeline');
  }
}

function calcAge(birthday) {
  if (!birthday) return null;
  const bday = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - bday.getFullYear();
  const m = today.getMonth() - bday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
  if (age <= 0) return cst('family.childSettings.ageUnderOne');
  if (age === 1) return cst('family.child.yearsOne', { count: age });
  return cst('family.child.yearsMany', { count: age });
}

// ── PIN lockout management ───────────────────────────────
async function checkPinLockout() {
  try {
    const status = await Auth.api(`/api/children/${childId}/pin-status`);
    const banner = document.getElementById('lockoutBanner');
    if (!banner) return;
    if (status.locked) {
      const until = new Date(status.locked_until);
      const mins = Math.ceil((until - Date.now()) / 60_000);
      document.getElementById('lockoutBannerText').textContent =
        mins > 1
          ? cst('family.childSettings.lockoutMinutes', { minutes: mins })
          : cst('family.childSettings.lockoutOneMinute');
      banner.classList.remove('hidden');
    } else if (status.attempt_count >= 3) {
      // Warn parent that child has had failed attempts (but not locked)
      document.getElementById('lockoutBannerText').textContent =
        cst('family.childSettings.failedAttempts', {
          count: status.attempt_count,
          remaining: status.max_attempts - status.attempt_count,
        });
      banner.classList.remove('hidden');
      // Hide unlock button since not locked
      const unlockBtn = document.getElementById('unlockBtn');
      if (unlockBtn) unlockBtn.classList.add('hidden');
    } else {
      banner.classList.add('hidden');
    }
  } catch {
    // Non-critical — don't block page load
  }
}

async function unlockChild() {
  const btn = document.getElementById('unlockBtn');
  if (btn) { btn.disabled = true; btn.textContent = cst('family.childSettings.unlocking'); }
  try {
    await Auth.api(`/api/children/${childId}/unlock-pin`, { method: 'POST' });
    showSuccessToast(cst('family.childSettings.unlocked'));
    document.getElementById('lockoutBanner')?.classList.add('hidden');
  } catch (err) {
    showToast(apiErr(err, 'family.childSettings.unlockFailed'), true);
    if (btn) { btn.disabled = false; btn.textContent = cst('family.childSettings.unlock'); }
  }
}

// ── Load child data ──────────────────────────────────────
async function init() {
  try {
    await Promise.all([
      loadViewConfig(),
      (async () => {
        try {
          const res = await fetch('/api/subscription/access', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            hasTransitionSupportAccess = !!(data.features && data.features.transition_support);
          }
        } catch { hasTransitionSupportAccess = false; }
      })(),
    ]);
    const children = await Auth.api('/api/children');
    childData = children.find(c => c.id === childId);
    if (!childData) {
      // Child not found or no access
      window.location.href = '/family';
      return;
    }
    // Update header
    document.getElementById('pageTitle').textContent = childData.name || cst('family.childSettings.heading');
    document.getElementById('pageEmoji').textContent = childData.emoji || '⭐';
    renderPage(childData);
    initViewConfigPanel();
    // Check lockout status after rendering (so the banner element exists)
    checkPinLockout();

    // Wire vibration toggle (client-only, no server field needed)
    initHapticsToggle();
  } catch (err) {
    document.getElementById('loadingState').innerHTML = `
      <div class="text-center py-12">
        <p class="text-4xl mb-3">😕</p>
        <p class="text-text-soft text-sm">${cst('family.childSettings.loadFailed', { detail: apiErr(err, 'family.childProfile.errors.generic') })}</p>
        <a href="/family" class="mt-4 inline-block px-6 py-2 bg-gold text-white rounded-xl font-semibold text-sm">${cst('family.childSettings.back')}</a>
      </div>`;
  }
}

async function boot() {
  if (typeof window.initParentAppI18n === 'function') {
    await initParentAppI18n();
  } else if (window.I18n && typeof I18n.init === 'function') {
    await I18n.init();
    if (window.I18n.apply) I18n.apply();
  }
  await init();
}

boot();
