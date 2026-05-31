// child-settings.js — Child settings page logic
// Owns: profile editing, view type toggle, emoji picker, PIN numpad, rewards visibility,
//       toggle settings (mood rating, now/next, reorder, clock, schedule lock, animations),
//       PIN lockout display and unlock.
// Does NOT own: auth (auth.js), birthday picker (birthday-picker.js), toast (toast.js)

if (!Auth.requireAuth()) { /* redirected */ }

const urlParams = new URLSearchParams(window.location.search);
const childId = urlParams.get('child');
if (!childId) { window.location.href = '/family'; }

let childData = null;
let pinBuffer = '';
let selectedEmoji = '';
let selectedAvatarUrl = null;   // set when iOS parent picks a new photo
let rewardsData = [];

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
    showToast('Kunde inte spara: ' + err.message, true);
    throw err;
  }
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
      showSuccessToast(newVal ? 'Inställningar aktiverade!' : 'Inställningar inaktiverade!');
      if (onChange) onChange(newVal);
    } catch(e) {
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
    showToast('Kunde inte spara: ' + err.message, true);
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
          showSuccessToast('Klassisk vy sparad!');
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
          showSuccessToast('Ny vy sparad!');
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
        showSuccessToast(newVal ? 'Visas i ny vy!' : 'Doldt i ny vy!');
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
        showSuccessToast(newVal ? 'Distraktionsfri vy aktiverad!' : 'Distraktionsfri vy avaktiverad');
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
      showSuccessToast('Dagsvy sparad!');
    } catch(e) { setActive('now_next_later'); }
  };
  tlBtn.onclick = async () => {
    if (currentViewType === 'now_next_later') return;
    setActive('now_next_later');
    try {
      await saveSetting('view_type', 'now_next_later');
      showSuccessToast('Nu/Nästa/Sedan sparat!');
    } catch(e) { setActive('day_sections'); }
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

// ── Profile save ────────────────────────────────────────
async function saveProfile(e) {
  e.preventDefault();
  const nameVal = document.getElementById('profileName').value.trim();
  if (!nameVal) { showToast('Namn krävs', true); return; }
  const bdYear = document.getElementById('bdYear').value;
  const bdMonth = document.getElementById('bdMonth').value;
  const bdDay = document.getElementById('bdDay').value;
  const birthday = (bdYear && bdMonth && bdDay) ? `${bdYear}-${bdMonth}-${bdDay}` : undefined;
  const body = { name: nameVal, emoji: selectedEmoji };
  if (birthday) body.birthday = birthday;
  // Include avatar_url if parent picked a new photo
  if (selectedAvatarUrl) body.avatar_url = selectedAvatarUrl;
  try {
    const updated = await Auth.api(`/api/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    childData = { ...childData, ...updated };
    document.getElementById('pageTitle').textContent = updated.name || 'Inställningar';
    document.getElementById('pageEmoji').textContent = updated.emoji || '⭐';
    // Update header avatar image if it changed
    const hdrImg = document.getElementById('headerAvatarImg');
    if (hdrImg && updated.avatar_url) hdrImg.src = updated.avatar_url;
    showSuccessToast('Inställningar sparade!');
  } catch (err) {
    showToast('Kunde inte spara: ' + err.message, true);
  }
}

// ── iOS Avatar Photo Picker ───────────────────────────
async function changeChildPhoto() {
  const btn = document.getElementById('changePhotoBtn');
  if (!btn) return;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Laddar…';
  try {
    const result = await Platform.camera.pick({ source: 'library', quality: 'medium' });
    if (!result) { btn.disabled = false; btn.textContent = orig; return; }
    btn.textContent = 'Laddar upp…';
    const url = await Platform.camera.upload(result.dataUrl);
    selectedAvatarUrl = url;
    // Update header image immediately
    const hdrImg = document.getElementById('headerAvatarImg');
    if (hdrImg) { hdrImg.src = url; hdrImg.classList.add('ring-2', 'ring-gold'); }
    btn.textContent = '✓ Bild vald';
    btn.classList.remove('text-gold'); btn.classList.add('text-green-600');
    setTimeout(() => { btn.textContent = '🔄 Byt bild'; btn.classList.remove('text-green-600'); btn.classList.add('text-gold'); }, 2000);
  } catch (err) {
    console.error('[child-settings] photo change failed:', err.message);
    showToast('Kunde inte byta bild. Försök igen.', true);
  } finally {
    btn.disabled = false;
    if (btn.textContent === 'Laddar upp…') btn.textContent = orig;
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
    showSuccessToast(newVal ? 'Vibration påslagen!' : 'Vibration avstängd');
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
  if (btn) { btn.disabled = true; btn.textContent = 'Sparar…'; }
  try {
    await Auth.api(`/api/children/${childId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pin: pinBuffer }),
    });
    showSuccessToast('PIN sparad!');
    pinBuffer = '';
    renderPinDots();
  } catch (err) {
    showToast('Kunde inte spara PIN: ' + err.message, true);
    pinBuffer = '';
    renderPinDots();
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Spara PIN'; }
}

// ── Rewards ─────────────────────────────────────────────
async function loadRewards() {
  const container = document.getElementById('rewardsList');
  if (!container) return;
  try {
    const resp = await Auth.api('/api/rewards');
    // API returns { rewards: [...], children: [...] } or just array
    rewardsData = Array.isArray(resp) ? resp : (resp.rewards || []);
    if (rewardsData.length === 0) {
      container.innerHTML = '<p class="text-sm text-text-soft italic">Inga belöningar. <a href="/library" class="text-gold underline">Skapa i Biblioteket.</a></p>';
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
          showSuccessToast(wasOn ? 'Dold för barnet!' : 'Synlig för barnet!');
        } catch (err) {
          track.classList.toggle('on'); // revert
          showToast('Kunde inte uppdatera: ' + err.message, true);
        }
      };
    });
  } catch (err) {
    if (container) container.innerHTML = '<p class="text-sm text-red-500">Kunde inte ladda belöningar.</p>';
  }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Main render ─────────────────────────────────────────
function renderPage(child) {
  const currentViewType = child.view_type || 'day_sections';
  const ageText = child.birthday ? calcAge(child.birthday) : null;
  const avatarUrl = selectedAvatarUrl || child.avatar_url || null;

  const html = `
  <!-- Child header card -->
  <div class="section-card fade-in" style="background: linear-gradient(135deg, #FFF9EE, #FFF0D0); border: 2px solid rgba(245,166,35,0.3);">
    <div class="flex items-center gap-4">
      ${avatarUrl
        ? `<img src="${escHtml(avatarUrl)}" class="w-16 h-16 rounded-full object-cover flex-shrink-0" alt="${escHtml(child.name)}" id="headerAvatarImg" />`
        : `<span class="text-5xl flex-shrink-0">${child.emoji || '👤'}</span>`
      }
      <div>
        <h2 class="text-xl font-heading font-bold text-navy">${escHtml(child.name)}</h2>
        <p class="text-sm text-text-soft">${ageText ? ageText : 'Ålder okänd'}</p>
        <!-- iOS: "Byt bild" button shown only on native iOS -->
        ${window.Platform && Platform.isNative() ? `
        <button id="changePhotoBtn" onclick="changeChildPhoto()" class="mt-1.5 text-xs text-gold font-semibold hover:text-gold-dark transition-colors">
          📷 Byt bild
        </button>` : ''}
      </div>
    </div>
  </div>

  <!-- 1. Profil -->
  <div class="section-card fade-in">
    <div class="section-title">👤 Profil</div>
    <form id="profileForm" onsubmit="saveProfile(event)" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-text-soft mb-1.5">Namn</label>
        <input id="profileName" type="text" value="${escHtml(child.name)}" required
          class="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none transition-colors"
          placeholder="Barnets namn" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-text-soft mb-1.5">Födelsedag</label>
        <div class="grid sm:grid-cols-3 grid-cols-1 gap-2">
          <select id="bdYear" onchange="updateBirthdayDays('bd')" class="px-2 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none">
            <option value="">År</option>
          </select>
          <select id="bdMonth" onchange="updateBirthdayDays('bd')" class="px-2 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none">
            <option value="">Månad</option>
          </select>
          <select id="bdDay" class="px-2 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body text-sm focus:border-gold focus:outline-none">
            <option value="">Dag</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-text-soft mb-1.5">Emoji</label>
        <div class="flex flex-wrap gap-2">
          ${['👧','👦','🧒','👶','🌟','🦄','🐱','🐶','🐻','🦊','🌈','🎀'].map(em =>
            `<button type="button" class="emoji-opt" data-emoji="${em}">${em}</button>`
          ).join('')}
        </div>
      </div>
      <button type="submit"
        class="w-full py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-heading font-bold text-sm transition-colors">
        Spara profil
      </button>
    </form>
  </div>

  <!-- 2. Vy -->
  <div class="section-card fade-in">
    <div class="section-title">👁 Vy – hur barnet ser sin dag</div>
    <p class="text-xs text-text-soft mb-4">Välj hur aktiviteterna presenteras i barnets dagvy. Standardvy är Dagsvy.</p>
    <div class="view-toggle" id="viewToggle">
      <button class="view-btn" id="viewBtnDay" type="button">
        🌅 Dagsvy<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">Morgon/Dag/Kväll</span>
      </button>
      <button class="view-btn" id="viewBtnTimeline" type="button">
        ⚡ Tidslinje<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">NU/NÄSTA/SEDAN</span>
      </button>
    </div>
    <div class="mt-4 p-3 rounded-xl" id="viewExplanation"
      style="background:rgba(245,166,35,0.08); border: 1px solid rgba(245,166,35,0.2);">
      <p class="text-xs text-text-soft" id="viewExplainText"></p>
    </div>
  </div>

  <!-- 2b. Barnvy-inställningar -->
  <div class="section-card fade-in">
    <div class="section-title">🎨 Barnvy-inställningar</div>
    <p class="text-xs text-text-soft mb-4">Hur ser <strong>${escHtml(child.name)}</strong> appen?</p>
    <div class="view-toggle mb-4" id="childViewToggle">
      <button class="view-btn" id="viewModeClassic" type="button">
        ○ Klassisk vy<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">Nuvarande</span>
      </button>
      <button class="view-btn" id="viewModeNew" type="button">
        ● Ny vy<br>
        <span style="font-size:0.7rem;font-weight:500;opacity:0.7">Ny design</span>
      </button>
    </div>
    <!-- Element visibility — only shown when new view is selected -->
    <div id="viewConfigElements" class="hidden mt-4">
      <p class="text-xs font-semibold text-text-soft mb-3">Vilka element ska synas?</p>
      <div class="space-y-1">
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">⏱ Nedräkningstimer</p>
            <p class="text-xs text-text-soft mt-0.5">Visar återstående tid till nästa aktivitet</p>
          </div>
          <div class="toggle-track on" id="viewCfgTimer" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">🕐 Tidslinje-pipeline</p>
            <p class="text-xs text-text-soft mt-0.5">Klockikoner som visar aktivitetsflödet</p>
          </div>
          <div class="toggle-track on" id="viewCfgTimeline" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">👤 Barnprofil-kort</p>
            <p class="text-xs text-text-soft mt-0.5">Visar barnets namn och emoji nere på sidan</p>
          </div>
          <div class="toggle-track on" id="viewCfgCard" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">⭐ Progress-ring</p>
            <p class="text-xs text-text-soft mt-0.5">Omgivande cirkel runt barnets emoji</p>
          </div>
          <div class="toggle-track on" id="viewCfgRing" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-row py-2" style="border-bottom:none;">
          <div class="flex-1 pr-4">
            <p class="text-sm font-semibold text-navy dark:text-white">🌟 Stjärnmål</p>
            <p class="text-xs text-text-soft mt-0.5">Långsiktigt belöningsmål och stjärnsamling</p>
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
          <p class="text-sm font-semibold text-navy dark:text-white">Distraktionsfri vy</p>
          <p class="text-xs text-text-soft mt-0.5 mb-3">Rekommenderas för barn med ADHD eller autism. Döljer extra knappar och ersätter vuxentext med enklare instruktioner.</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-soft">${childViewConfig && childViewConfig.minimal_ui ? 'Aktiverad' : 'Avaktiverad'}</span>
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
    <div class="section-title">🏆 Belöningar</div>
    <p class="text-xs text-text-soft mb-4">Välj vilka belöningar som är synliga för ${escHtml(child.name)}.</p>
    <div id="rewardsList">
      <p class="text-sm text-text-soft italic">Laddar belöningar…</p>
    </div>
    <a href="/library" class="block mt-4 text-center text-xs text-gold hover:underline">
      Skapa fler belöningar i Biblioteket →
    </a>
  </div>

  <!-- 4. Känslor -->
  <div class="section-card fade-in">
    <div class="section-title">💛 Känslor</div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Känsloregistrering</p>
        <p class="text-xs text-text-soft mt-0.5">Barnet drar en slider (ledsen → glad) efter varje avbockning</p>
      </div>
      <div class="toggle-track ${child.show_mood_rating !== false ? 'on' : ''}" id="toggle-show_mood_rating">
        <div class="toggle-thumb"></div>
      </div>
    </div>
  </div>

  <!-- 5. PIN -->
  <div class="section-card fade-in">
    <div class="section-title">🔑 PIN-kod</div>

    <!-- Lockout warning banner (shown if child is currently locked out) -->
    <div id="lockoutBanner" class="hidden mb-4 p-3 bg-lavender rounded-xl border border-purple-300">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">🔒</span>
          <div>
            <p class="text-sm font-semibold text-navy dark:text-white">${escHtml(child.name)} är utlåst</p>
            <p class="text-xs text-text-soft" id="lockoutBannerText">Flera felaktiga PIN-försök</p>
          </div>
        </div>
        <button id="unlockBtn" onclick="unlockChild()"
          class="flex-shrink-0 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-heading font-bold text-xs transition-colors">
          Lås upp 🔓
        </button>
      </div>
    </div>

    <p class="text-xs text-text-soft mb-4">${escHtml(child.name)} loggar in med namn + PIN. Ange en ny 4-siffrig PIN nedan.</p>
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
      Spara PIN
    </button>
  </div>

  <!-- 6. Avancerade inställningar -->
  <div class="section-card fade-in">
    <div class="section-title">⚙️ Avancerade inställningar</div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Visa NU / NÄSTA / SEDAN</p>
        <p class="text-xs text-text-soft mt-0.5">Markerar aktiviteter med tidsstatus</p>
      </div>
      <div class="toggle-track ${child.show_now_next !== false ? 'on' : ''}" id="toggle-show_now_next">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Barnets omsortering</p>
        <p class="text-xs text-text-soft mt-0.5">Barnet kan dra om aktiviteter</p>
      </div>
      <div class="toggle-track ${child.allow_child_reorder ? 'on' : ''}" id="toggle-allow_child_reorder">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Dölj klockslag</p>
        <p class="text-xs text-text-soft mt-0.5">Minskar stress för tidskänsliga barn</p>
      </div>
      <div class="toggle-track ${child.hide_clock ? 'on' : ''}" id="toggle-hide_clock">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Lås schema</p>
        <p class="text-xs text-text-soft mt-0.5">Barnet kan inte bläddra till andra dagar</p>
      </div>
      <div class="toggle-track ${child.lock_schedule ? 'on' : ''}" id="toggle-lock_schedule">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Dopamin-animation</p>
        <p class="text-xs text-text-soft mt-0.5">Stjärnburst vid avbockning</p>
      </div>
      <div class="toggle-track ${child.dopamin_animation !== false ? 'on' : ''}" id="toggle-dopamin_animation">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row" id="hapticsToggleRow">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">📳 Vibration</p>
        <p class="text-xs text-text-soft mt-0.5">Taktil feedback vid stjärnor och belöningar</p>
      </div>
      <div class="toggle-track on" id="toggle-haptics_enabled" style="min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Visuell timer</p>
        <p class="text-xs text-text-soft mt-0.5">Cirkulär klocka vid pågående aktivitet</p>
      </div>
      <div class="toggle-track ${child.visual_timer !== false ? 'on' : ''}" id="toggle-visual_timer">
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <div class="setting-row">
      <div class="flex-1 pr-4">
        <p class="text-sm font-semibold text-navy dark:text-white">Färgkodning</p>
        <p class="text-xs text-text-soft mt-0.5">Färgkodade aktivitetskort</p>
      </div>
      <div class="toggle-track ${child.color_coding !== false ? 'on' : ''}" id="toggle-color_coding">
        <div class="toggle-thumb"></div>
      </div>
    </div>
  </div>

  <!-- 7. Schema -->
  <div class="section-card fade-in">
    <div class="section-title">📅 Schema</div>
    <a href="/schedule?child=${childId}"
      class="flex items-center justify-between gap-3 w-full px-4 py-3.5 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors">
      <div class="flex items-center gap-2">
        <span class="text-lg">✏️</span>
        <div>
          <div class="font-heading font-bold text-sm">Redigera schema</div>
          <div class="text-xs opacity-80">Lägg till, ta bort och ändra aktiviteter</div>
        </div>
      </div>
      <span>→</span>
    </a>
  </div>

  <!-- Bottom spacer -->
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
    ['toggle-show_now_next', 'show_now_next', child.show_now_next !== false],
    ['toggle-allow_child_reorder', 'allow_child_reorder', !!child.allow_child_reorder],
    ['toggle-hide_clock', 'hide_clock', !!child.hide_clock],
    ['toggle-lock_schedule', 'lock_schedule', !!child.lock_schedule],
    ['toggle-dopamin_animation', 'dopamin_animation', child.dopamin_animation !== false],
    ['toggle-visual_timer', 'visual_timer', child.visual_timer !== false],
    ['toggle-color_coding', 'color_coding', child.color_coding !== false],
  ];
  toggles.forEach(([id, field, val]) => makeToggle(id, field, val));
}

function updateViewExplanation(type) {
  const el = document.getElementById('viewExplainText');
  if (!el) return;
  if (type === 'day_sections') {
    el.textContent = '🌅 Dagsvy: Aktiviteterna visas i färgkodade dagdelssektioner — Morgon, Dag, Kväll och Natt. Bra för strukturerad överblick av hela dagen.';
  } else {
    el.textContent = '⚡ Tidslinje: Visar NU (aktiv), NÄSTA (härnäst) och SEDAN (kommande). Fokuserar på vad som gäller just nu.';
  }
}

function calcAge(birthday) {
  if (!birthday) return null;
  const bday = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - bday.getFullYear();
  const m = today.getMonth() - bday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
  if (age <= 0) return 'Under 1 år';
  return `${age} år`;
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
        `Utlåst i ${mins > 1 ? mins + ' minuter' : 'ungefär 1 minut'} till`;
      banner.classList.remove('hidden');
    } else if (status.attempt_count >= 3) {
      // Warn parent that child has had failed attempts (but not locked)
      document.getElementById('lockoutBannerText').textContent =
        `${status.attempt_count} misslyckade försök (${status.max_attempts - status.attempt_count} kvar)`;
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
  if (btn) { btn.disabled = true; btn.textContent = 'Låser upp…'; }
  try {
    await Auth.api(`/api/children/${childId}/unlock-pin`, { method: 'POST' });
    showSuccessToast('Låsning upphävd! Barnet kan logga in igen.');
    document.getElementById('lockoutBanner')?.classList.add('hidden');
  } catch (err) {
    showToast('Kunde inte låsa upp: ' + err.message, true);
    if (btn) { btn.disabled = false; btn.textContent = 'Lås upp 🔓'; }
  }
}

// ── Load child data ──────────────────────────────────────
async function init() {
  try {
    // Load view config and children in parallel
    await loadViewConfig();
    const children = await Auth.api('/api/children');
    childData = children.find(c => c.id === childId);
    if (!childData) {
      // Child not found or no access
      window.location.href = '/family';
      return;
    }
    // Update header
    document.getElementById('pageTitle').textContent = childData.name || 'Inställningar';
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
        <p class="text-text-soft text-sm">Kunde inte ladda: ${err.message}</p>
        <a href="/family" class="mt-4 inline-block px-6 py-2 bg-gold text-white rounded-xl font-semibold text-sm">Tillbaka</a>
      </div>`;
  }
}

init();
