/**
 * child-login.js — Stjärnutforskare child login (Phase 1)
 * Owns: keypad, PIN dots, child selection list, localStorage known_children,
 *       /api/auth/me merge, POST /api/auth/child-login, lockout UI.
 * Does NOT own: auth.js (Auth.setAuth, Auth.getUser).
 */

'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let pinDigits = [];          // max 4 digits
let selectedChild = null;   // { username, name, emoji, avatar_url, familyId, lastLoginAt }
/** Senast renderad barnlista (API + known_children) — selectChild måste använda denna. */
let lastMergedChildren = [];
/** True when login-picker-children found a parent session (cookie or JWT). */
let lastPickerHasSession = false;
const ADD_CHILD_ONBOARDING_URL = '/onboarding?flow=add-child';
let MAX_ATTEMPTS = 5;
let lockoutEndTime = null;
let countdownInterval = null;

// ── Avatar rendering helper (same as dom-utils.js) ──────────────────────────
function renderClChildAvatar(child, size) {
  if (typeof window.renderChildAvatar === 'function') {
    return window.renderChildAvatar(child, size || 52);
  }
  size = size || 52;
  if (child && child.avatar_url) {
    return '<img src="' + escapeHtml(child.avatar_url) + '" alt="' + escapeHtml(child.name || '') + '" ' +
      'style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;" />';
  }
  var emoji = (child && child.emoji) || '⭐';
  return '<span style="font-size:' + Math.round(size * 0.85) + 'px;">' + escapeHtml(emoji) + '</span>';
}

function mergeKnownIntoApiChild(apiChild, knownEntry) {
  if (!knownEntry) return apiChild;
  return {
    username: apiChild.username || knownEntry.username,
    name: apiChild.name || knownEntry.name,
    emoji: apiChild.emoji || knownEntry.emoji || '⭐',
    avatar_url: apiChild.avatar_url || knownEntry.avatar_url || null,
    familyId: apiChild.familyId || knownEntry.familyId || null,
    lastLoginAt: knownEntry.lastLoginAt || null,
  };
}

// ── Render child selection list (Step 1) ─────────────────────────────────────
function renderChildList() {
  const list = document.getElementById('clChildList');
  const empty = document.getElementById('clEmptyState');
  const noSession = document.getElementById('clNoSessionState');

  // Merge localStorage known_children + /api/auth/me children
  const known = loadKnownChildren();
  let merged = [...known];

  // If parent is logged in, fetch their children too
  fetchMeChildren().then(function (result) {
    const parentChildren = result && result.list;
    const hasSession = result && result.hasSession;
    const canAddChild = Auth.isLoggedIn() || hasSession;

    if (parentChildren && parentChildren.length > 0) {
      var knownByUser = {};
      for (var i = 0; i < known.length; i++) {
        knownByUser[known[i].username] = known[i];
      }
      var seen = new Set();
      merged = parentChildren.map(function (pc) {
        seen.add(pc.username);
        return mergeKnownIntoApiChild(pc, knownByUser[pc.username]);
      });
      for (var j = 0; j < known.length; j++) {
        if (!seen.has(known[j].username)) merged.push(known[j]);
      }
    }

    lastMergedChildren = merged;

    if (merged.length === 0) {
      list.innerHTML = '';
      var addRow = document.getElementById('clAddChildRow');
      // No children at all — check if we have a parent session.
      const hasFamilySession = Auth.isLoggedIn() || hasSession;
      if (!hasFamilySession && noSession) {
        if (empty) empty.classList.add('hidden');
        if (addRow) addRow.classList.remove('hidden');
        noSession.classList.remove('hidden');
      } else {
        if (noSession) noSession.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
        if (addRow) addRow.classList.remove('hidden');
      }
      return;
    }

    if (empty) empty.classList.add('hidden');
    if (noSession) noSession.classList.add('hidden');

    // Always show add-child when at least one child is listed — openAddChild() routes
    // to parent login if no session (stjarndag_parent_session / Auth).
    var addRow = document.getElementById('clAddChildRow');
    if (addRow) addRow.classList.remove('hidden');

    list.innerHTML = merged.map(child => `
      <a href="#" class="cl-child-card" data-username="${escapeHtml(child.username)}" onclick="selectChild('${escapeJs(child.username)}'); return false;">
        <div class="cl-avatar-ring">${renderClChildAvatar(child, 52)}</div>
        <div class="cl-child-info">
          <div class="cl-child-name">${escapeHtml(child.name)}</div>
          <div class="cl-child-sub">${escapeHtml(child.username)}</div>
        </div>
        <div class="cl-child-arrow">›</div>
      </a>
    `).join('');
  });
}

function mapPickerChild(c, familyIdFallback) {
  return {
    username: c.username || (c.name && String(c.name).toLowerCase().replace(/\s+/g, '')) || c.name,
    name: c.name || c.username,
    emoji: c.emoji || '⭐',
    avatar_url: c.avatar_url || null,
    familyId: c.familyId || c.family_id || familyIdFallback || null,
    lastLoginAt: null,
  };
}

function fetchMeChildren() {
  const loadCtx = window.Auth && Auth.fetchLoginPickerContext
    ? function () { return Auth.fetchLoginPickerContext(); }
    : function () {
        return fetch('/api/auth/login-picker-children', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : { hasSession: false, children: [] }; })
          .then(function (data) {
            if (Array.isArray(data)) {
              return { hasSession: data.length > 0, children: data, parent: null };
            }
            return data;
          })
          .catch(function () { return { hasSession: false, children: [], parent: null }; });
      };

  return loadCtx().then(function (ctx) {
    lastPickerHasSession = !!ctx.hasSession;
    const fromPicker = (ctx.children || []).map(function (c) {
      return mapPickerChild(c, null);
    });
    if (fromPicker.length > 0) {
      return { list: fromPicker, hasSession: ctx.hasSession };
    }
    if (ctx.hasSession) {
      return { list: [], hasSession: true };
    }
    return window.apiFetch('/api/auth/me')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (me) {
        if (!me || !me.children || me.children.length === 0) {
          return { list: null, hasSession: Auth.isLoggedIn() };
        }
        return {
          hasSession: true,
          list: me.children.map(function (c) {
            return mapPickerChild(c, me.familyId);
          }),
        };
      })
      .catch(function () { return { list: null, hasSession: false }; });
  });
}

// ── localStorage: stjarndag_known_children ────────────────────────────────────
function loadKnownChildren() {
  try {
    const raw = localStorage.getItem('stjarndag_known_children');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveKnownChildren(children) {
  try {
    localStorage.setItem('stjarndag_known_children', JSON.stringify(children));
  } catch { /* ignore */ }
}

function upsertKnownChild(child) {
  const known = loadKnownChildren();
  const idx = known.findIndex(k => k.username === child.username);
  const entry = {
    ...child,
    lastLoginAt: Date.now(),
  };
  if (idx >= 0) known[idx] = entry;
  else known.unshift(entry);
  // Keep at most 10 entries
  if (known.length > 10) known.splice(10);
  saveKnownChildren(known);
}

// ── Select child → show PIN step ─────────────────────────────────────────────
window.selectChild = function(username) {
  var child = lastMergedChildren.find(function (k) { return k.username === username; });
  if (!child) {
    var known = loadKnownChildren();
    child = known.find(function (k) { return k.username === username; });
  }
  if (!child) {
    child = { username: username, name: username, emoji: '⭐', avatar_url: null, familyId: null };
  }

  selectedChild = child;
  sessionStorage.setItem('cl_selected_username', username);

  // Show PIN step
  document.getElementById('clStepProfiles').classList.remove('active');
  document.getElementById('clStepPin').classList.add('active');

  // Update greeting + avatar
  document.getElementById('clPinGreeting').textContent = `Hej ${child.name}!`;
  document.getElementById('clPinAvatar').innerHTML = renderClChildAvatar(child, 100);

  // Clear PIN
  pinDigits = [];
  renderPinDots();
  hideError();
  hideLockout();
  hideSuccess();

  // Focus first key (mobile: keyboard stays hidden anyway)
  document.getElementById('clKey0')?.focus();
};

// ── Back to child selection ────────────────────────────────────────────────────
window.clBackToProfiles = function () {
  selectedChild = null;
  sessionStorage.removeItem('cl_selected_username');
  pinDigits = [];
  document.getElementById('clStepPin').classList.remove('active');
  document.getElementById('clStepProfiles').classList.add('active');
  hideError();
  hideLockout();
  clearCountdown();
};

// ── Add child: choice (nytt/befintligt) + parent PIN gate ────────────────────

async function fetchParentPinStatusForAddChild() {
  if (Auth.isLoggedIn()) {
    try {
      const res = await window.apiFetch('/api/family/parent-pin-status');
      if (res.ok) {
        const data = await res.json();
        return { has_session: true, has_pin: !!data.has_pin };
      }
    } catch { /* fall through */ }
  }
  try {
    const res = await fetch('/api/family/parent-pin-status-picker', { credentials: 'same-origin' });
    if (res.ok) return res.json();
  } catch { /* ignore */ }
  return { has_session: false, has_pin: false };
}

async function hasActiveAuthSession() {
  if (Auth.isLoggedIn()) return true;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    return res.ok;
  } catch {
    return false;
  }
}

async function resolvePinVerifyUrl() {
  if (await hasActiveAuthSession()) return '/api/family/verify-pin';
  const ctx = await Auth.fetchLoginPickerContext();
  if (ctx.hasSession) return '/api/family/verify-pin-picker';
  return '/api/family/verify-pin';
}

async function activateParentSessionAfterPinVerify(resData) {
  if (resData && resData.parent) {
    Auth.setAuth(null, resData.parent);
  }
  if (resData && resData.csrfToken) {
    localStorage.setItem(Auth.CSRF_KEY, resData.csrfToken);
  }
  if (Auth.isLoggedIn() && Auth.getUser()?.type === 'parent') return true;
  if (typeof Auth.hydrateUserFromLoginPicker === 'function') {
    if (await Auth.hydrateUserFromLoginPicker()) return true;
  }
  const gateToken = window._ppinGateToken;
  if (!gateToken) return false;
  try {
    const csrf = Auth.getCsrfToken() || '';
    const res = await fetch('/api/family/restore-parent-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      credentials: 'include',
      body: JSON.stringify({ gateToken }),
    });
    if (!res.ok) return false;
    await Auth.ensureCsrfToken();
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (meRes.ok) Auth.setAuth(null, await meRes.json());
    return true;
  } catch {
    return false;
  }
}

function closeAddChildChoiceOverlay() {
  var el = document.getElementById('cl-add-child-choice');
  if (el) el.remove();
}

function showAddChildChoiceOverlay() {
  closeAddChildChoiceOverlay();

  var overlay = document.createElement('div');
  overlay.id = 'cl-add-child-choice';
  overlay.className = 'cl-modal-overlay';
  overlay.innerHTML = [
    '<div class="cl-modal-card" role="dialog" aria-labelledby="clAddChildTitle">',
      '<div style="font-size:2rem;margin-bottom:8px;">👶</div>',
      '<h3 id="clAddChildTitle" class="cl-modal-title">Lägg till ett barn</h3>',
      '<p class="cl-modal-sub">Välj om barnet redan finns i familjen eller ska skapas som nytt.</p>',
      '<button type="button" class="cl-modal-btn cl-modal-btn-primary" id="clAddNewBtn">Nytt barn</button>',
      '<button type="button" class="cl-modal-btn cl-modal-btn-secondary" id="clAddExistingBtn">Befintligt barn</button>',
      '<button type="button" class="cl-modal-btn-cancel" id="clAddChildCancel">Avbryt</button>',
    '</div>',
  ].join('');

  document.body.appendChild(overlay);

  document.getElementById('clAddNewBtn').addEventListener('click', async function () {
    closeAddChildChoiceOverlay();
    const ready = await ensureParentReadyForOnboarding();
    if (!ready) {
      await redirectToLoginForAddChild('new');
      return;
    }
    await proceedToNewChildWizard();
  });
  document.getElementById('clAddExistingBtn').addEventListener('click', function () {
    closeAddChildChoiceOverlay();
    showExistingChildForm();
  });
  document.getElementById('clAddChildCancel').addEventListener('click', closeAddChildChoiceOverlay);
}

function showExistingChildForm() {
  var noSession = document.getElementById('clNoSessionState');
  var empty = document.getElementById('clEmptyState');
  if (empty) empty.classList.add('hidden');
  if (noSession) {
    noSession.classList.remove('hidden');
    var input = document.getElementById('clManualNameInput');
    if (input) setTimeout(function () { input.focus(); }, 80);
  }
}

async function proceedToNewChildWizard() {
  await ensureParentReadyForOnboarding();
  window.location.href = ADD_CHILD_ONBOARDING_URL;
}

/** Restore vuxensession (cookie/localStorage) before add-child onboarding. */
async function ensureParentReadyForOnboarding() {
  if (Auth.isLoggedIn() && Auth.getUser()?.type === 'parent') return true;
  if (window.Auth && typeof Auth.hydrateUserFromLoginPicker === 'function') {
    if (await Auth.hydrateUserFromLoginPicker()) return true;
  }
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.type === 'parent') {
        Auth.setAuth(null, me);
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

async function redirectToLoginForAddChild(pending) {
  sessionStorage.setItem('cl_add_child_pending', pending);
  window.location.href = '/login?next=' + encodeURIComponent('/child-login?addChild=1');
}

/** End active child JWT before vuxen-gated actions (add child). Keeps parent session cookie. */
async function ensureChildSessionEndedForParentAction() {
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (!meRes.ok) return;
    const me = await meRes.json();
    if (me.type !== 'child') return;

    await Auth.ensureCsrfToken().catch(function () {});
    const csrf = Auth.getCsrfToken() || '';
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ switchChild: true }),
    });
    Auth.clearAuth();
    sessionStorage.removeItem('cl_selected_username');
    selectedChild = null;
    pinDigits = [];
    document.getElementById('clStepPin')?.classList.remove('active');
    document.getElementById('clStepProfiles')?.classList.add('active');
  } catch { /* ignore */ }
}

async function runAddChildWithParentGate(onAuthorized) {
  await ensureChildSessionEndedForParentAction();
  const ctx = await Auth.fetchLoginPickerContext();
  const hasSession = Auth.isLoggedIn() || ctx.hasSession || lastPickerHasSession;

  if (!hasSession) {
    await redirectToLoginForAddChild('choice');
    return;
  }

  const pinStatus = await fetchParentPinStatusForAddChild();

  if (!pinStatus.has_pin) {
    if (!Auth.isLoggedIn() || Auth.getUser()?.type !== 'parent') {
      await Auth.hydrateUserFromLoginPicker();
    }
    if (!Auth.isLoggedIn() || Auth.getUser()?.type !== 'parent') {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' }).catch(function () { return null; });
      if (meRes && meRes.ok) {
        const me = await meRes.json();
        if (me.type === 'parent') Auth.setAuth(null, me);
      }
    }
    if (!Auth.isLoggedIn() || Auth.getUser()?.type !== 'parent') {
      await redirectToLoginForAddChild('choice');
      return;
    }
    onAuthorized();
    return;
  }

  showParentPinGateOverlay(async function () {
    await activateParentSessionAfterPinVerify(window._ppinGateVerifyResult);
    onAuthorized();
  }, function () {}, { hint: 'Ange din PIN-kod för att fortsätta' });
}

window.openAddChild = async function () {
  await runAddChildWithParentGate(function () {
    showAddChildChoiceOverlay();
  });
};

// ── Keypad ────────────────────────────────────────────────────────────────────
const KEYS = ['1','2','3','4','5','6','7','8','9','clear','0','⌫'];
const KEY_ACTIONS = { clear: 'CLEAR', '⌫': 'BACKSPACE' };

function buildKeypad() {
  const container = document.getElementById('clKeypad');
  if (!container) return;
  container.innerHTML = KEYS.map((k, i) => {
    const action = KEY_ACTIONS[k] || null;
    let extra = '';
    if (k === 'clear') extra = '★';
    return `<button
      id="clKey${i}"
      class="cl-key ${k === 'clear' ? 'clear' : k === '⌫' ? 'backspace' : ''} ${k === '' ? 'ghost' : ''}"
      aria-label="${action ? (action === 'CLEAR' ? 'Rensa PIN' : 'Radera') : k}"
      data-action="${action || k}"
      type="button">${extra || k}</button>`;
  }).join('');

  // Attach events
  KEYS.forEach((k, i) => {
    const btn = document.getElementById(`clKey${i}`);
    if (!btn) return;

    btn.addEventListener('click', () => {
      const action = KEY_ACTIONS[k] || null;
      if (action === 'CLEAR') {
        pinDigits = [];
      } else if (action === 'BACKSPACE') {
        pinDigits.pop();
      } else {
        if (pinDigits.length < 4) pinDigits.push(k);
      }
      if (window.Platform && Platform.haptics && typeof Platform.haptics.light === 'function') {
        Platform.haptics.light();
      }
      btn.classList.add('haptic');
      setTimeout(() => btn.classList.remove('haptic'), 140);

      renderPinDots();

      // Auto-submit when 4 digits entered
      if (pinDigits.length === 4) {
        setTimeout(submitLogin, 120);
      }
    });

    // Keyboard accessibility: Enter submits
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') btn.click();
    });
  });
}

// ── PIN dots ───────────────────────────────────────────────────────────────────
function renderPinDots() {
  const container = document.getElementById('clPinDots');
  if (!container) return;
  container.innerHTML = [0,1,2,3].map(i =>
    `<div class="cl-pin-dot${i < pinDigits.length ? ' filled' : ''}"></div>`
  ).join('');
}

// ── Error / lockout / success ─────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('clErrorBox');
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}
function hideError() {
  const el = document.getElementById('clErrorBox');
  if (el) el.classList.remove('visible');
}
function showLockout(retryAfterSeconds, lockedUntilIso) {
  const panel = document.getElementById('clLockoutPanel');
  if (panel) panel.classList.add('visible');
  lockoutEndTime = lockedUntilIso ? new Date(lockedUntilIso) : new Date(Date.now() + retryAfterSeconds * 1000);
  const totalSecs = Math.ceil((lockoutEndTime - Date.now()) / 1000);
  function tick() {
    const rem = Math.max(0, Math.ceil((lockoutEndTime - Date.now()) / 1000));
    const mins = Math.floor(rem / 60);
    const secs = rem % 60;
    const sub = document.getElementById('clLockoutSub');
    if (sub) {
      sub.textContent = rem > 60
        ? `Försök igen om ${mins} minut${mins !== 1 ? 'er' : ''}`
        : `Bara ${secs} sekunder kvar!`;
    }
    if (rem <= 0) {
      clearCountdown();
      hideLockout();
      pinDigits = [];
      renderPinDots();
      return;
    }
    countdownInterval = setTimeout(tick, 1000);
  }
  tick();
}
function hideLockout() {
  const panel = document.getElementById('clLockoutPanel');
  if (panel) panel.classList.remove('visible');
}
function clearCountdown() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}
function showSuccess() {
  const el = document.getElementById('clSuccessBox');
  if (el) el.classList.add('visible');
}

// Attempt dots
function renderAttemptDots(remaining, max) {
  const container = document.getElementById('clAttemptBar');
  if (!container) return;
  container.innerHTML = Array.from({ length: max }, (_, i) => {
    const used = i >= remaining;
    let cls = 'cl-attempt-dot';
    if (used) {
      if (remaining <= 1) cls += ' danger';
      else if (remaining <= 2) cls += ' warn';
      else cls += ' used';
    }
    return `<div class="${cls}"></div>`;
  }).join('');
  document.getElementById('clAttemptRow')?.classList.remove('hidden');
}

// Shake dots on wrong PIN
function shakeDots() {
  const dots = document.getElementById('clPinDots');
  if (!dots) return;
  dots.classList.remove('cl-dots-shake');
  void dots.offsetWidth;
  dots.classList.add('cl-dots-shake');
  dots.addEventListener('animationend', () => dots.classList.remove('cl-dots-shake'), { once: true });
}

// ── Submit login ──────────────────────────────────────────────────────────────
async function submitLogin() {
  if (!selectedChild) return;
  if (pinDigits.length !== 4) return;

  const pin = pinDigits.join('');
  const username = selectedChild.username;

  hideError();
  showLoading();

  try {
    const res = await fetch('/api/auth/child-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, pin }),
    });

    const data = await res.json();
    hideLoading();

    if (res.status === 429) {
      showLockout(data.retry_after || 60, data.locked_until);
      pinDigits = [];
      renderPinDots();
      return;
    }

    if (!res.ok) {
      if (data.max_attempts && data.attempts_remaining !== undefined) {
        MAX_ATTEMPTS = data.max_attempts;
        renderAttemptDots(data.attempts_remaining, data.max_attempts);
      }
      const icon = data.attempts_remaining === 1 ? '😬' : data.attempts_remaining === 0 ? '🔒' : '⚠️';
      showError(data.error || 'Något gick fel', icon);
      pinDigits = [];
      renderPinDots();
      shakeDots();
      return;
    }

    // Success — verify httpOnly cookie actually switched to child (parent cookie can shadow).
    Auth.setAuth(null, data.user, data.csrfToken, data.expiresAt);
    if (window.DeviceMode) DeviceMode.enterChild();

    try {
      const verifyRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (verifyRes.ok) {
        const me = await verifyRes.json();
        if (me.type !== 'child' || me.id !== data.user.id) {
          hideLoading();
          showError(
            'Inloggningen sparades inte i webbläsaren. Logga ut som vuxen (Jag är vuxen) och försök igen.',
            '⚠️'
          );
          Auth.clearAuth();
          pinDigits = [];
          renderPinDots();
          return;
        }
        Auth.setAuth(null, me, data.csrfToken, data.expiresAt);
      }
    } catch (_) { /* proceed — localStorage session may still work */ }

    upsertKnownChild({
      username: data.user.username,
      name: data.user.name,
      emoji: data.user.emoji || '⭐',
      avatar_url: data.user.avatar_url || null,
      familyId: data.user.familyId || null,
    });
    showSuccess();
    setTimeout(() => { window.location.href = '/child-dashboard'; }, 1200);

  } catch (err) {
    hideLoading();
    showError('Något gick fel. Försök igen.');
    pinDigits = [];
    renderPinDots();
  }
}

function showLoading() {
  document.getElementById('clLoading')?.classList.add('visible');
}
function hideLoading() {
  document.getElementById('clLoading')?.classList.remove('visible');
}

// ── "Jag är vuxen" — switch to parent mode ───────────────────────────────────
// Checks if parent is logged in → if PIN is set, shows overlay before redirect.
// If no session, redirects to login.html (which has its own PIN guard flow).
window.handleParentSwitch = function () {
  if (Auth.isLoggedIn()) {
    window.apiFetch('/api/family/parent-pin-status').then(function (res) {
      if (res && res.ok) {
        return res.json();
      }
      return { has_pin: false };
    }).then(function (pinData) {
      if (pinData.has_pin) {
        showParentPinGateOverlay(function () {
          if (window.DeviceMode) DeviceMode.enterParent();
          window.location.href = '/dashboard';
        }, function () {
          // cancelled — stay on child login screen
        }, { hint: 'Ange en vuxens PIN-kod för att fortsätta' });
      } else {
        if (window.DeviceMode) DeviceMode.enterParent();
        window.location.href = '/dashboard';
      }
    }).catch(function () {
      window.location.href = '/dashboard';
    });
  } else {
    window.location.href = '/login';
  }
};

// ── Parent PIN gate overlay (same pattern as auth.js + login-magic.js) ───────
// Shown for add-child PIN gate and "Jag är vuxen" from child session.
function showParentPinGateOverlay(onSuccess, onCancel, opts) {
  var hint = (opts && opts.hint) || 'Ange din PIN-kod för att fortsätta';
  var old = document.getElementById('ppin-gate-overlay');
  if (old) document.body.removeChild(old);
  window._ppinGateToken = null;

  var overlay = document.createElement('div');
  overlay.id = 'ppin-gate-overlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:9999;background:rgba(27,35,64,0.85);',
    'display:flex;align-items:center;justify-content:center;',
    'backdrop-filter:blur(4px);',
  ].join('');

  var card = document.createElement('div');
  card.style.cssText = [
    'background:#fff;border-radius:24px;padding:32px 24px;max-width:320px;width:100%;',
    'margin:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;',
  ].join('');

  card.innerHTML = [
    '<div style="font-size:2rem;margin-bottom:8px;">🔒</div>',
    '<h3 style="font-family:Outfit,sans-serif;font-weight:700;color:#1B2340;margin-bottom:4px;">Föräldralås</h3>',
    '<p style="font-size:0.875rem;color:#5A6178;margin-bottom:20px;">' + hint + '</p>',
    '<div style="display:flex;justify-content:center;gap:12px;margin-bottom:20px;">',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
    '</div>',
    '<div id="ppgo-keypad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;" role="group" aria-label="PIN-tavla"></div>',
    '<div id="ppgo-err" style="font-size:0.8rem;color:#ef4444;min-height:1.2em;margin-bottom:8px;"></div>',
    '<button id="ppgo-cancel" style="font-size:0.8rem;color:#5A6178;text-decoration:underline;background:none;border:none;cursor:pointer;padding:8px;">Avbryt</button>',
  ].join('');

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  var entered = '';
  var msgEl = document.getElementById('ppgo-err');
  var dots = document.querySelectorAll('.ppgo-dot');

  function updateDots() {
    dots.forEach(function (d, i) {
      d.style.background = i < entered.length ? '#F5A623' : '#EDE7F6';
    });
  }

  function buildKeypad() {
    var kbd = document.getElementById('ppgo-keypad');
    if (!kbd) return;
    kbd.innerHTML = '';
    var digits = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
    digits.forEach(function (d) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = d;
      btn.style.cssText = [
        d === '⌫' || d === '✓' ?
          'padding:12px;font-size:1.1rem;font-weight:600;background:#EDE7F6;border:none;border-radius:12px;cursor:pointer;color:#5A6178;min-height:52px;' :
          'padding:14px;font-size:1.3rem;font-weight:700;background:#EDE7F6;border:none;border-radius:12px;cursor:pointer;color:#1B2340;min-height:52px;',
        'transition:background 0.1s;',
      ].join('');
      btn.addEventListener('mouseenter', function () { btn.style.background = '#D8BFD8'; });
      btn.addEventListener('mouseleave', function () { btn.style.background = '#EDE7F6'; });
      btn.addEventListener('click', function () {
        msgEl.textContent = '';
        if (d === '⌫') {
          entered = entered.slice(0, -1);
        } else if (d === '✓') {
          if (entered.length === 4) submitPin();
          return;
        } else if (entered.length < 4) {
          entered += d;
        }
        updateDots();
      });
      kbd.appendChild(btn);
    });
  }

  function submitPin() {
    var pin = entered;
    var csrf = Auth.getCsrfToken() || '';
    resolvePinVerifyUrl().then(function (verifyUrl) {
      return fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ pin: pin }),
      });
    }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (result) {
        var res = result.data;
        if (result.ok && res.ok && res.gateToken) {
          window._ppinGateToken = res.gateToken;
          window._ppinGateVerifyResult = res;
          document.body.removeChild(overlay);
          onSuccess();
        } else {
          msgEl.textContent = 'Felaktig PIN-kod — försök igen';
          entered = '';
          updateDots();
          buildKeypad();
        }
      }).catch(function () {
        msgEl.textContent = 'Något gick fel — försök igen';
        entered = '';
        updateDots();
        buildKeypad();
      });
  }

  document.getElementById('ppgo-cancel').addEventListener('click', function () {
    document.body.removeChild(overlay);
    onCancel();
  });

  buildKeypad();
  updateDots();
}

// ── Manual name entry (browser fallback when no session/no cached children) ──
window.handleManualName = function(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('clManualNameInput');
  const name = (input ? input.value : '').trim();
  if (!name) {
    input && input.focus();
    return;
  }
  // Create a synthetic child entry from the typed name and go straight to PIN
  const synth = {
    username: name.toLowerCase(),
    name: name,
    emoji: '⭐',
    avatar_url: null,
    familyId: null,
    lastLoginAt: null,
  };
  selectedChild = synth;
  sessionStorage.setItem('cl_selected_username', synth.username);

  // Show PIN step
  document.getElementById('clStepProfiles').classList.remove('active');
  document.getElementById('clStepPin').classList.add('active');
  document.getElementById('clPinGreeting').textContent = 'Hej ' + name + '!';
  document.getElementById('clPinAvatar').innerHTML = '<span>⭐</span>';
  pinDigits = [];
  renderPinDots();
  hideError();
  hideLockout();
  hideSuccess();
  document.getElementById('clKey0')?.focus();
};

function hideSuccess() {
  const el = document.getElementById('clSuccessBox');
  if (el) el.classList.remove('visible');
}

// ── Escape helpers ────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Build keypad buttons
  buildKeypad();

  // Always start on barnväljare (not PIN step) after navigation / byt barn
  document.getElementById('clStepPin')?.classList.remove('active');
  document.getElementById('clStepProfiles')?.classList.add('active');
  selectedChild = null;
  pinDigits = [];
  renderPinDots();

  const url = new URL(window.location.href);
  const addChildParam = url.searchParams.get('addChild');
  const pendingAddChild = sessionStorage.getItem('cl_add_child_pending');
  const resumeAddChild = addChildParam === '1' || pendingAddChild;

  // Only restore PIN step when NOT resuming add-child (avoid jumping to last child's PIN)
  if (!resumeAddChild) {
    const preselected = sessionStorage.getItem('cl_selected_username');
    if (preselected) {
      const known = loadKnownChildren();
      const child = known.find(k => k.username === preselected);
      if (child) {
        window.selectChild(preselected);
      } else {
        sessionStorage.removeItem('cl_selected_username');
      }
    }
  } else {
    sessionStorage.removeItem('cl_selected_username');
  }

  // Render child list
  renderChildList();

  // Resume add-child flow after parent login (?addChild=1)
  if (resumeAddChild) {
    const intent = pendingAddChild || 'choice';
    sessionStorage.removeItem('cl_add_child_pending');
    sessionStorage.removeItem('cl_add_child_next'); // legacy — never skip choice modal
    if (addChildParam === '1') {
      url.searchParams.delete('addChild');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
    setTimeout(function () {
      if (intent === 'new') {
        runAddChildWithParentGate(async function () {
          const ready = await ensureParentReadyForOnboarding();
          if (ready) window.location.href = ADD_CHILD_ONBOARDING_URL;
        });
      } else {
        openAddChild();
      }
    }, 150);
  }
});