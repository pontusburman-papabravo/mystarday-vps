/**
 * child-login.js — Star Explorer child login (Phase 1)
 * Owns: keypad, PIN dots, child selection list, localStorage known_children,
 *       /api/auth/me merge, POST /api/auth/child-login, lockout UI.
 * Does NOT own: auth.js (Auth.setAuth, Auth.getUser).
 */

'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let pinDigits = [];          // max 4 digits
let selectedChild = null;   // { username, name, emoji, has_avatar, avatar_src, familyId, lastLoginAt }
/** True when exactly one child — skip profile picker and go straight to PIN. */
let directPinMode = false;
/** Last rendered child list (API + known_children) — selectChild must use this. */
let lastMergedChildren = [];
/** True when login-picker-children found a parent session (cookie or JWT). */
let lastPickerHasSession = false;
const ADD_CHILD_ONBOARDING_URL = '/onboarding?flow=add-child';
let MAX_ATTEMPTS = 5;
let lockoutEndTime = null;
let countdownInterval = null;

function tx(key, params) {
  if (typeof window.cpt === 'function' && window.I18n) {
    const fullKey = 'child.' + key;
    const value = I18n.t(fullKey, params || {});
    if (value && value !== fullKey) return value;
  }
  return '';
}

function localizeLoginError(data) {
  if (typeof window.childLoginErrorFromResponse === 'function') {
    return childLoginErrorFromResponse(data || {});
  }
  return (data && data.error) || tx('errors.serverError');
}

async function bootstrapChildLoginI18n() {
  if (typeof window.initChildAppI18n !== 'function') return;
  let preferredLocale = null;
  let englishChildEnabled = false;
  if (typeof window.readPersistedChildLocaleHints === 'function') {
    const stored = readPersistedChildLocaleHints();
    preferredLocale = stored.preferredLocale;
    englishChildEnabled = stored.englishChildEnabled;
  }

  try {
    const res = await fetch('/api/auth/login-picker-children', { credentials: 'same-origin' });
    const ctx = res.ok ? await res.json() : {};
    if (ctx.hasSession) {
      if (ctx.child_ui_locale || ctx.preferred_locale) {
        preferredLocale = ctx.child_ui_locale || ctx.preferred_locale;
      }
      if (typeof ctx.english_child_experience_enabled === 'boolean') {
        englishChildEnabled = ctx.english_child_experience_enabled;
      }
    }
  } catch (_) {
    /* offline / logged out */
  }

  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.child_ui_locale || me.preferred_locale) {
        preferredLocale = me.child_ui_locale || me.preferred_locale;
      }
      if (typeof me.english_child_experience_enabled === 'boolean') {
        englishChildEnabled = me.english_child_experience_enabled;
      }
    }
  } catch (_) {
    /* no session */
  }

  await initChildAppI18n({
    preferredLocale,
    englishChildEnabled,
  });
}

function applyChildLoginStaticCopy() {
  updateProfileStepCopy(lastMergedChildren.length || 1);
  const lockMsg = document.querySelector('.cl-lockout-msg');
  if (lockMsg) lockMsg.textContent = tx('login.lockoutWait');
  const pinSub = document.querySelector('.cl-pin-sub');
  if (pinSub) pinSub.textContent = tx('login.pinSub');
  const successMsg = document.querySelector('.cl-success-msg');
  if (successMsg) successMsg.textContent = tx('login.welcome');
  const pinDots = document.getElementById('clPinDots');
  if (pinDots) pinDots.setAttribute('aria-label', tx('login.pinDotsAria'));
  const keypad = document.getElementById('clKeypad');
  if (keypad) keypad.setAttribute('aria-label', tx('login.keypadAria'));
  const manualInput = document.getElementById('clManualNameInput');
  if (manualInput) manualInput.placeholder = tx('login.namePlaceholder');
  const noSession = document.getElementById('clNoSessionState');
  if (noSession && !noSession.classList.contains('hidden')) {
    const hint = noSession.querySelector('p');
    if (hint) {
      hint.textContent = loadKnownChildren().length > 0
        ? tx('login.siblingNameHint')
        : tx('login.nameHint');
    }
  }
  const continueBtn = noSession && noSession.querySelector('button[type="submit"]');
  if (continueBtn) continueBtn.textContent = tx('login.continue');
}

// ── Avatar rendering helper (same as dom-utils.js) ──────────────────────────
function renderClChildAvatar(child, size) {
  if (typeof window.renderChildAvatar === 'function') {
    return window.renderChildAvatar(child, size || 52);
  }
  size = size || 52;
  if (child && (child.avatar_src || child.has_avatar)) {
    const src = child.avatar_src || '';
    if (src) {
      return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(child.name || '') + '" ' +
        'style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;" />';
    }
  }
  const emoji = (child && child.emoji) || '⭐';
  return '<span style="font-size:' + Math.round(size * 0.85) + 'px;">' + escapeHtml(emoji) + '</span>';
}

function mergeKnownIntoApiChild(apiChild, knownEntry) {
  if (!knownEntry) return apiChild;
  return {
    username: apiChild.username || knownEntry.username,
    name: apiChild.name || knownEntry.name,
    emoji: apiChild.emoji || knownEntry.emoji || '⭐',
    has_avatar: apiChild.has_avatar || knownEntry.has_avatar || false,
    avatar_src: apiChild.avatar_src || knownEntry.avatar_src || null,
    familyId: apiChild.familyId || knownEntry.familyId || null,
    lastLoginAt: knownEntry.lastLoginAt || null,
  };
}

// ── Render child selection list (Step 1) ─────────────────────────────────────
function paintChildListCards(merged) {
  const list = document.getElementById('clChildList');
  if (!list) return;
  list.innerHTML = merged.map(function (child) {
    return [
      '<button type="button" class="cl-child-card" data-username="', escapeHtml(child.username),
      '" onclick="selectChild(\'', escapeJs(child.username), '\')">',
      '<div class="cl-avatar-ring">', renderClChildAvatar(child, 56), '</div>',
      '<div class="cl-child-info">',
      '<div class="cl-child-name">', escapeHtml(child.name), '</div>',
      '</div>',
      '<div class="cl-child-arrow" aria-hidden="true">›</div>',
      '</button>',
    ].join('');
  }).join('');
}

function updateProfileStepCopy(childCount) {
  const title = document.getElementById('clSelectTitle');
  const sub = document.getElementById('clSelectSub');
  if (!title || !sub) return;
  if (childCount > 1) {
    title.textContent = tx('login.whoAreYou');
    sub.textContent = tx('login.selectProfile');
  } else {
    title.textContent = tx('login.whoAreYouSingle');
    sub.textContent = tx('login.selectProfile');
  }
  const notMeRow = document.getElementById('clNotMeRow');
  if (notMeRow) notMeRow.classList.toggle('hidden', childCount === 0);
}

function trackChildEntry(eventName, props) {
  if (window.EntryAnalytics && typeof EntryAnalytics.track === 'function') {
    EntryAnalytics.track(eventName, props);
  }
}

function trackChildLoginModeViewed(profileCount) {
  if (trackChildLoginModeViewed._sent) return;
  trackChildLoginModeViewed._sent = true;
  let mode = profileCount > 0 ? 'profile_picker' : 'name_pin';
  try {
    if (sessionStorage.getItem('child_login_mode') === 'name_pin') mode = 'name_pin';
  } catch (_) { /* ignore */ }
  trackChildEntry('child_login_mode_viewed', {
    mode: mode,
    profiles_count: profileCount,
  });
}

window.handleChildLoginBack = function () {
  try {
    if (sessionStorage.getItem('entry_version') === 'v2_1') {
      sessionStorage.setItem('entry_restore', 'ENTRY_ROLE_PICK');
    }
  } catch (_) { /* ignore */ }
  window.location.href = '/login';
};

window.showNotMeProfile = function () {
  const list = document.getElementById('clChildList');
  if (list) list.innerHTML = '';
  const addRow = document.getElementById('clAddChildRow');
  if (addRow) addRow.classList.add('hidden');
  const notMeRow = document.getElementById('clNotMeRow');
  if (notMeRow) notMeRow.classList.add('hidden');
  const title = document.getElementById('clSelectTitle');
  const sub = document.getElementById('clSelectSub');
  if (title) title.textContent = tx('login.loginAsChild');
  if (sub) sub.textContent = tx('login.namePinLead');
  showExistingChildForm();
  try { sessionStorage.setItem('child_login_mode', 'name_pin'); } catch (_) { /* ignore */ }
  trackChildEntry('child_profile_not_found_clicked');
};

function updatePinBackButtons() {
  const swapBtn = document.getElementById('clPinBackProfiles');
  const loginBtn = document.getElementById('clPinBackLogin');
  if (swapBtn) swapBtn.classList.toggle('hidden', directPinMode);
  if (loginBtn) loginBtn.classList.toggle('hidden', !directPinMode);
}

function maybeAutoSelectOnlyChild(opts) {
  opts = opts || {};
  if (opts.forcePicker || opts.resumeAddChild) return;
  if (lastMergedChildren.length !== 1) return;
  const only = lastMergedChildren[0];
  if (!only || !only.username) return;
  selectChild(only.username, { directPin: true });
}

function renderChildList(initOpts) {
  initOpts = initOpts || {};
  const list = document.getElementById('clChildList');
  const empty = document.getElementById('clEmptyState');
  const noSession = document.getElementById('clNoSessionState');

  // Merge localStorage known_children + /api/auth/me children
  const known = loadKnownChildren();
  let merged = [...known];

  // Show cached device children immediately (survives vuxen logout)
  if (known.length > 0) {
    lastMergedChildren = known;
    if (empty) empty.classList.add('hidden');
    if (noSession) noSession.classList.add('hidden');
    const addRowEarly = document.getElementById('clAddChildRow');
    if (addRowEarly) addRowEarly.classList.remove('hidden');
    paintChildListCards(known);
  }

  // If parent is logged in, fetch their children too
  fetchMeChildren().then(function (result) {
    const parentChildren = result && result.list;
    const hasSession = result && result.hasSession;

    if (parentChildren && parentChildren.length > 0) {
      const knownByUser = {};
      for (let i = 0; i < known.length; i++) {
        knownByUser[known[i].username] = known[i];
      }
      const seen = new Set();
      merged = parentChildren.map(function (pc) {
        seen.add(pc.username);
        return mergeKnownIntoApiChild(pc, knownByUser[pc.username]);
      });
      // R4.3: when server lists children (parent session), never add stale local-only profiles.
      if (!hasSession) {
        for (let j = 0; j < known.length; j++) {
          if (!seen.has(known[j].username)) merged.push(known[j]);
        }
      }
      if (typeof Auth.persistKnownChildrenFromSession === 'function') {
        const familyId = merged[0] && merged[0].familyId;
        Auth.persistKnownChildrenFromSession(merged, familyId);
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
        applyChildLoginStaticCopy();
      } else {
        if (noSession) noSession.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
        if (addRow) addRow.classList.remove('hidden');
      }
      trackChildLoginModeViewed(0);
      return;
    }

    if (empty) empty.classList.add('hidden');
    if (noSession) noSession.classList.add('hidden');

    // Always show add-child when at least one child is listed — openAddChild() routes
    // to parent login if no session (stjarndag_parent_session / Auth).
    var addRow = document.getElementById('clAddChildRow');
    if (addRow) addRow.classList.remove('hidden');

    paintChildListCards(merged);
    updateProfileStepCopy(merged.length);
    trackChildLoginModeViewed(merged.length);
    maybeAutoSelectOnlyChild({
      forcePicker: !!initOpts.forcePicker,
      resumeAddChild: !!initOpts.resumeAddChild,
    });
  });
}

function mapPickerChild(c, familyIdFallback) {
  return {
    username: c.username || (c.name && String(c.name).toLowerCase().replace(/\s+/g, '')) || c.name,
    name: c.name || c.username,
    emoji: c.emoji || '⭐',
    has_avatar: !!c.has_avatar,
    avatar_src: c.avatar_src || null,
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
window.selectChild = function(username, opts) {
  opts = opts || {};
  if (opts.directPin === true) {
    directPinMode = true;
  } else if (opts.directPin === false) {
    directPinMode = false;
  } else if (lastMergedChildren.length > 1) {
    directPinMode = false;
  }

  let child = lastMergedChildren.find(function (k) { return k.username === username; });
  if (!child) {
    const known = loadKnownChildren();
    child = known.find(function (k) { return k.username === username; });
  }
  if (!child) {
    child = { username: username, name: username, emoji: '⭐', has_avatar: false, avatar_src: null, familyId: null };
  }

  selectedChild = child;
  sessionStorage.setItem('cl_selected_username', username);
  trackChildEntry('child_profile_selected', { username: username });

  // Show PIN step
  document.getElementById('clStepProfiles').classList.remove('active');
  document.getElementById('clStepPin').classList.add('active');

  // Update greeting + avatar
  document.getElementById('clPinGreeting').textContent = tx('login.pinGreeting', { name: child.name });
  document.getElementById('clPinAvatar').innerHTML = renderClChildAvatar(child, 100);

  // Clear PIN
  pinDigits = [];
  renderPinDots();
  syncPinInput();
  hideError();
  hideLockout();
  hideSuccess();
  updatePinBackButtons();

  // Focus first key (mobile: keyboard stays hidden anyway)
  document.getElementById('clKey0')?.focus();
};

// ── Back to child selection ────────────────────────────────────────────────────
window.clBackToProfiles = function () {
  if (directPinMode) {
    handleChildLoginBack();
    return;
  }
  selectedChild = null;
  sessionStorage.removeItem('cl_selected_username');
  pinDigits = [];
  syncPinInput();
  document.getElementById('clStepPin').classList.remove('active');
  document.getElementById('clStepProfiles').classList.add('active');
  hideError();
  hideLockout();
  clearCountdown();
  updatePinBackButtons();
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
  const el = document.getElementById('cl-add-child-choice');
  if (el) el.remove();
}

function showAddChildChoiceOverlay() {
  closeAddChildChoiceOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'cl-add-child-choice';
  overlay.className = 'cl-modal-overlay';
  overlay.innerHTML = [
    '<div class="cl-modal-card" role="dialog" aria-labelledby="clAddChildTitle">',
      '<div style="font-size:2rem;margin-bottom:8px;">👶</div>',
      '<h3 id="clAddChildTitle" class="cl-modal-title">' + tx('modals.addChildTitle') + '</h3>',
      '<p class="cl-modal-sub">' + tx('modals.addChildSub') + '</p>',
      '<button type="button" class="cl-modal-btn cl-modal-btn-primary" id="clAddNewBtn">' + tx('modals.newChild') + '</button>',
      '<button type="button" class="cl-modal-btn cl-modal-btn-secondary" id="clAddExistingBtn">' + tx('modals.existingChild') + '</button>',
      '<button type="button" class="cl-modal-btn-cancel" id="clAddChildCancel">' + tx('common.cancel') + '</button>',
    '</div>',
  ].join('');

  document.body.appendChild(overlay);

  document.getElementById('clAddNewBtn').addEventListener('click', async function () {
    closeAddChildChoiceOverlay();
    await runNewChildWithParentGate();
  });
  document.getElementById('clAddExistingBtn').addEventListener('click', async function () {
    closeAddChildChoiceOverlay();
    if (await deviceHasFamilyContext()) {
      showExistingChildForm();
      return;
    }
    await runAddChildWithParentGate(showExistingChildForm);
  });
  document.getElementById('clAddChildCancel').addEventListener('click', closeAddChildChoiceOverlay);
}

function showExistingChildForm() {
  const noSession = document.getElementById('clNoSessionState');
  const empty = document.getElementById('clEmptyState');
  if (empty) empty.classList.add('hidden');
  if (noSession) {
    noSession.classList.remove('hidden');
    const hint = noSession.querySelector('p');
    if (hint) {
      hint.textContent = loadKnownChildren().length > 0
        ? tx('login.siblingNameHint')
        : tx('login.nameHint');
    }
    const input = document.getElementById('clManualNameInput');
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

/** Device already used for this family (known child, parent cookie, or active session). */
async function deviceHasFamilyContext() {
  if (loadKnownChildren().length > 0) return true;

  try {
    const ctx = await Auth.fetchLoginPickerContext();
    if (ctx.hasSession) return true;
  } catch { /* ignore */ }

  if (Auth.isLoggedIn()) {
    const u = Auth.getUser();
    if (u && (u.familyId || u.type === 'child')) return true;
  }

  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.familyId) return true;
    }
  } catch { /* ignore */ }

  return false;
}

function getDeviceFamilyId() {
  const known = loadKnownChildren();
  for (let i = 0; i < known.length; i++) {
    if (known[i].familyId) return known[i].familyId;
  }
  return null;
}

function showAddChildNeedsParentOverlay(reason) {
  const existing = document.getElementById('cl-add-child-needs-parent');
  if (existing) existing.remove();

  const message = reason === 'new_child'
    ? tx('login.addChildNeedsParent')
    : tx('login.noFamilyYet');

  const overlay = document.createElement('div');
  overlay.id = 'cl-add-child-needs-parent';
  overlay.className = 'cl-modal-overlay';
  overlay.innerHTML = [
    '<div class="cl-modal-card" role="dialog">',
      '<div style="font-size:2rem;margin-bottom:8px;">👤</div>',
      '<h3 class="cl-modal-title">' + tx('modals.adultNeededTitle') + '</h3>',
      '<p class="cl-modal-sub">' + message + '</p>',
      '<button type="button" class="cl-modal-btn cl-modal-btn-primary" id="clAddChildGoParentBtn">' + tx('login.loginAsAdult') + '</button>',
      '<button type="button" class="cl-modal-btn-cancel" id="clAddChildNeedsParentCancel">' + tx('common.cancel') + '</button>',
    '</div>',
  ].join('');
  document.body.appendChild(overlay);

  document.getElementById('clAddChildGoParentBtn').addEventListener('click', function () {
    redirectToLoginForAddChild(reason === 'new_child' ? 'new' : 'choice');
  });
  document.getElementById('clAddChildNeedsParentCancel').addEventListener('click', function () {
    overlay.remove();
  });
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

/** Active parent JWT (email/password) — not only saved child-picker session. */
async function resolveActiveParentSession() {
  if (Auth.isLoggedIn() && Auth.getUser()?.type === 'parent') return true;
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

async function runNewChildWithParentGate() {
  if (await resolveActiveParentSession()) {
    await proceedToNewChildWizard();
    return;
  }
  await runAddChildWithParentGate(async function () {
    const ready = await ensureParentReadyForOnboarding();
    if (!ready) {
      await redirectToLoginForAddChild('new');
      return;
    }
    await proceedToNewChildWizard();
  });
}

async function runAddChildWithParentGate(onAuthorized) {
  await ensureChildSessionEndedForParentAction();

  // Nyligen inloggad vuxen (mail/lösenord) — hoppa över PIN-gate
  if (await resolveActiveParentSession()) {
    onAuthorized();
    return;
  }

  const ctx = await Auth.fetchLoginPickerContext();
  const hasSession = Auth.isLoggedIn() || ctx.hasSession || lastPickerHasSession;

  if (!hasSession) {
    showAddChildNeedsParentOverlay('no_family');
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
      showAddChildNeedsParentOverlay('new_child');
      return;
    }
    onAuthorized();
    return;
  }

  showParentPinGateOverlay(async function () {
    await activateParentSessionAfterPinVerify(window._ppinGateVerifyResult);
    onAuthorized();
  }, function () {}, { hint: tx('login.parentGateHint') });
}

window.openAddChild = async function () {
  if (await deviceHasFamilyContext()) {
    showAddChildChoiceOverlay();
    return;
  }
  await runAddChildWithParentGate(showAddChildChoiceOverlay);
};

// ── Keypad ────────────────────────────────────────────────────────────────────
const KEYS = ['1','2','3','4','5','6','7','8','9','clear','0','⌫'];
const KEY_ACTIONS = { clear: 'CLEAR', '⌫': 'BACKSPACE' };
const KEY_COLOR_CLASS = {
  '1': 'col-purple', '4': 'col-purple', '7': 'col-purple',
  '2': 'col-teal', '5': 'col-teal', '8': 'col-teal',
  '3': 'col-pink', '6': 'col-pink', '9': 'col-pink',
  '0': 'col-gold',
};

function applyPinDigit(digit) {
  if (pinDigits.length >= 4) return;
  pinDigits.push(String(digit));
  renderPinDots();
  syncPinInput();
  if (pinDigits.length === 4) setTimeout(submitLogin, 120);
}

function clearPinDigits() {
  pinDigits = [];
  renderPinDots();
  syncPinInput();
}

function backspacePinDigit() {
  pinDigits.pop();
  renderPinDots();
  syncPinInput();
}

function syncPinInput() {
  const input = document.getElementById('clPinInput');
  if (input) input.value = pinDigits.join('');
}

function bindPinInput() {
  const input = document.getElementById('clPinInput');
  if (!input) return;
  input.addEventListener('input', function () {
    const digits = String(input.value || '').replace(/\D/g, '').slice(0, 4);
    pinDigits = digits.split('');
    renderPinDots();
    if (pinDigits.length === 4) setTimeout(submitLogin, 120);
  });
}

function buildKeypad() {
  const container = document.getElementById('clKeypad');
  if (!container) return;
  container.innerHTML = KEYS.map((k, i) => {
    const action = KEY_ACTIONS[k] || null;
    let extra = '';
    if (k === 'clear') extra = '★';
    const colorClass = KEY_COLOR_CLASS[k] || '';
    const digitClass = action ? '' : ' digit ' + colorClass;
    return '<button' +
      ' id="clKey' + i + '"' +
      ' class="cl-key' + digitClass +
      (k === 'clear' ? ' clear' : '') +
      (k === '⌫' ? ' backspace' : '') +
      '"' +
      ' aria-label="' + (action ? (action === 'CLEAR' ? tx('login.keypadClear') : tx('login.keypadBackspace')) : k) + '"' +
      ' data-action="' + (action || k) + '"' +
      ' type="button">' + (extra || k) + '</button>';
  }).join('');

  // Attach events
  KEYS.forEach((k, i) => {
    const btn = document.getElementById('clKey' + i);
    if (!btn) return;

    btn.addEventListener('click', () => {
      const action = KEY_ACTIONS[k] || null;
      if (action === 'CLEAR') {
        clearPinDigits();
      } else if (action === 'BACKSPACE') {
        backspacePinDigit();
      } else {
        applyPinDigit(k);
      }
      if (window.Platform && Platform.haptics && typeof Platform.haptics.light === 'function') {
        Platform.haptics.light();
      }
      btn.classList.add('haptic');
      setTimeout(function () { btn.classList.remove('haptic'); }, 140);
    });

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
      sub.textContent = typeof window.childLockoutCountdownText === 'function'
        ? childLockoutCountdownText(rem)
        : '';
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

/** R0-03: brief success affordance; skip delay when reduced motion (POS MO-03). */
function childLoginPostSuccessRedirectMs() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  } catch (_) { /* ignore */ }
  return 400;
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
  trackChildEntry('child_login_submitted', { username: username });

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
      showError(localizeLoginError(data));
      trackChildEntry('child_login_failed', { reason: data.error || 'invalid_credentials' });
      pinDigits = [];
      renderPinDots();
      shakeDots();
      return;
    }

    // Success — verify httpOnly cookie actually switched to child (parent cookie can shadow).
    Auth.setAuth(null, data.user, data.csrfToken, data.expiresAt);
    if (window.DeviceMode) DeviceMode.enterChild();
    if (window.MetaAppEvents && typeof MetaAppEvents.handleServerMilestones === 'function') {
      MetaAppEvents.handleServerMilestones(data.meta_milestones);
    }

    const deviceFamilyId = getDeviceFamilyId();
    const loginFamilyId = data.user.familyId || null;
    if (deviceFamilyId && loginFamilyId && deviceFamilyId !== loginFamilyId) {
      hideLoading();
      showError(tx('login.wrongFamily'), '⚠️');
      Auth.clearAuth();
      pinDigits = [];
      renderPinDots();
      return;
    }

    try {
      const verifyRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (verifyRes.ok) {
        const me = await verifyRes.json();
        if (me.type !== 'child' || me.id !== data.user.id) {
          hideLoading();
          showError(tx('login.sessionNotSaved'), '⚠️');
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
      has_avatar: !!data.user.has_avatar,
      avatar_src: data.user.avatar_src || null,
      familyId: data.user.familyId || null,
    });
    trackChildEntry('child_login_success', { username: data.user.username });
    try {
      sessionStorage.removeItem('entry_restore');
      sessionStorage.removeItem('child_login_mode');
    } catch (_) { /* ignore */ }
    showSuccess();
    try { performance.mark('child-login-success'); } catch (_) { /* ignore */ }
    const redirectMs = childLoginPostSuccessRedirectMs();
    setTimeout(() => {
      try { performance.mark('child-login-redirect'); } catch (_) { /* ignore */ }
      window.location.href = '/child/today';
    }, redirectMs);

  } catch (err) {
    hideLoading();
    showError(tx('errors.serverError'));
    trackChildEntry('child_login_failed', { reason: 'network' });
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
  if (Auth.isLoggedIn() && Auth.getUser()?.type === 'child') {
    Auth.ensureParentAccessFromChild(function () {
      window.location.href = '/dashboard';
    }, function () {
      window.location.href = '/login?parent=1';
    });
    return;
  }
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
        }, { hint: tx('parentGate.adultPinHint') });
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
  const hint = (opts && opts.hint) || tx('parentGate.hint');
  const old = document.getElementById('ppin-gate-overlay');
  if (old) document.body.removeChild(old);
  window._ppinGateToken = null;

  const overlay = document.createElement('div');
  overlay.id = 'ppin-gate-overlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:9999;background:rgba(27,35,64,0.85);',
    'display:flex;align-items:center;justify-content:center;',
    'backdrop-filter:blur(4px);',
  ].join('');

  const card = document.createElement('div');
  card.style.cssText = [
    'background:#fff;border-radius:24px;padding:32px 24px;max-width:320px;width:100%;',
    'margin:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;',
  ].join('');

  card.innerHTML = [
    '<div style="font-size:2rem;margin-bottom:8px;">🔒</div>',
    '<h3 style="font-family:Outfit,sans-serif;font-weight:700;color:#1B2340;margin-bottom:4px;">' + tx('parentGate.title') + '</h3>',
    '<p style="font-size:0.875rem;color:#5A6178;margin-bottom:20px;">' + hint + '</p>',
    '<div style="display:flex;justify-content:center;gap:12px;margin-bottom:20px;">',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
      '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
    '</div>',
    '<div id="ppgo-keypad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;" role="group" aria-label="' + tx('parentGate.keypadAria') + '"></div>',
    '<div id="ppgo-err" style="font-size:0.8rem;color:#ef4444;min-height:1.2em;margin-bottom:8px;"></div>',
    '<button id="ppgo-cancel" style="font-size:0.8rem;color:#5A6178;text-decoration:underline;background:none;border:none;cursor:pointer;padding:8px;">' + tx('parentGate.cancel') + '</button>',
  ].join('');

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let entered = '';
  const msgEl = document.getElementById('ppgo-err');
  const dots = document.querySelectorAll('.ppgo-dot');

  function updateDots() {
    dots.forEach(function (d, i) {
      d.style.background = i < entered.length ? '#F5A623' : '#EDE7F6';
    });
  }

  function buildKeypad() {
    const kbd = document.getElementById('ppgo-keypad');
    if (!kbd) return;
    kbd.innerHTML = '';
    const digits = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
    digits.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = d;
      btn.style.cssText = [
        d === '⌫' || d === '✓' ?
          'padding:12px;font-size:1.1rem;font-weight:600;background:#EDE7F6;border:none;border-radius:12px;cursor:pointer;color:#5A6178;min-height:52px;' :
          'padding:14px;font-size:1.3rem;font-weight:700;background:#EDE7F6;border:none;border-radius:12px;cursor:pointer;color:#1B2340;min-height:52px;',
        'transition:background 0.1s;touch-action:manipulation;-webkit-tap-highlight-color:transparent;',
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
    const pin = entered;
    const csrf = Auth.getCsrfToken() || '';
    resolvePinVerifyUrl().then(function (verifyUrl) {
      return fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ pin: pin }),
      });
    }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (result) {
        const res = result.data;
        if (result.ok && res.ok && res.gateToken) {
          window._ppinGateToken = res.gateToken;
          window._ppinGateVerifyResult = res;
          document.body.removeChild(overlay);
          onSuccess();
        } else {
          msgEl.textContent = tx('errors.parentPinInvalid');
          entered = '';
          updateDots();
          buildKeypad();
        }
      }).catch(function () {
        msgEl.textContent = tx('errors.serverError');
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
    has_avatar: false,
    avatar_src: null,
    familyId: null,
    lastLoginAt: null,
  };
  selectedChild = synth;
  sessionStorage.setItem('cl_selected_username', synth.username);

  // Show PIN step
  document.getElementById('clStepProfiles').classList.remove('active');
  document.getElementById('clStepPin').classList.add('active');
  document.getElementById('clPinGreeting').textContent = tx('login.pinGreeting', { name: name });
  document.getElementById('clPinAvatar').innerHTML = '<span>⭐</span>';
  pinDigits = [];
  renderPinDots();
  syncPinInput();
  hideError();
  hideLockout();
  hideSuccess();
  directPinMode = false;
  updatePinBackButtons();
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

/**
 * If a valid child JWT/session cookie already exists, skip PIN and open barnvy.
 * Does not weaken auth: still requires a live server-validated child session.
 * Explicit picker/add-child flows are never auto-skipped.
 */
async function resumeActiveChildSessionIfPresent(opts) {
  if (
    window.NativeChildSessionRestore
    && typeof NativeChildSessionRestore.resumeActiveChildSessionIfPresent === 'function'
  ) {
    return NativeChildSessionRestore.resumeActiveChildSessionIfPresent(opts);
  }
  const options = opts || {};
  if (options.forcePicker || options.resumeAddChild) return false;
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (!meRes.ok) return false;
    const me = await meRes.json();
    if (!me || me.type !== 'child') return false;
    if (window.DeviceMode && typeof DeviceMode.enterChild === 'function') {
      DeviceMode.enterChild();
    }
    window.location.replace('/child/today');
    return true;
  } catch (_) {
    return false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await bootstrapChildLoginI18n();
  document.addEventListener('child-i18n-ready', function () {
    if (window.I18n) I18n.apply();
    if (typeof window.authT === 'function' && typeof window.authEntryI18nBootstrapped !== 'undefined') {
      document.querySelectorAll('[data-i18n^="auth.childLogin"]').forEach(function (el) {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        const text = authT(key);
        if (text && text !== key) el.textContent = text;
      });
      document.querySelectorAll('[data-i18n-aria-label^="auth.childLogin"]').forEach(function (el) {
        const key = el.getAttribute('data-i18n-aria-label');
        if (!key) return;
        const text = authT(key);
        if (text && text !== key) el.setAttribute('aria-label', text);
      });
    }
    applyChildLoginStaticCopy();
  });
  applyChildLoginStaticCopy();

  // Fresh load — clear name_pin flag so picker mode is reported correctly on revisit.
  try { sessionStorage.removeItem('child_login_mode'); } catch (_) { /* ignore */ }

  // Build keypad buttons
  buildKeypad();
  bindPinInput();

  // Start on profile step — maybeAutoSelectOnlyChild() may jump to PIN
  document.getElementById('clStepPin')?.classList.remove('active');
  document.getElementById('clStepProfiles')?.classList.add('active');
  selectedChild = null;
  directPinMode = false;
  pinDigits = [];
  renderPinDots();
  syncPinInput();
  updatePinBackButtons();

  const url = new URL(window.location.href);
  const addChildParam = url.searchParams.get('addChild');
  const pendingAddChild = sessionStorage.getItem('cl_add_child_pending');
  const resumeAddChild = addChildParam === '1' || pendingAddChild;
  const forcePicker = url.searchParams.get('picker') === '1' || sessionStorage.getItem('cl_force_picker') === '1';

  if (await resumeActiveChildSessionIfPresent({ forcePicker: forcePicker, resumeAddChild: resumeAddChild })) {
    return;
  }

  if (url.searchParams.get('shared_device') === '1' && window.TrustedDeviceBootstrap) {
    let pickerChildren = null;
    try {
      const raw = sessionStorage.getItem('shared_device_picker_children');
      if (raw) pickerChildren = JSON.parse(raw);
    } catch (_) { /* ignore */ }
    if (pickerChildren && pickerChildren.length && typeof window.showSharedDevicePicker === 'function') {
      showSharedDevicePicker(pickerChildren, { source: 'child_login', bucket: String(pickerChildren.length) });
      return;
    }
  }

  if (!forcePicker && !resumeAddChild && window.TrustedDeviceBootstrap) {
    const cold = await TrustedDeviceBootstrap.tryColdStart({ skipRedirect: true, source: 'child_login' });
    if (cold && cold.code === 'PICKER_SHOWN') return;
    if (cold && cold.ok) return;
  }

  if (forcePicker && window.TrustedDeviceBootstrap) {
    const sharedCold = await TrustedDeviceBootstrap.tryColdStart({
      skipRedirect: true,
      forcePicker: true,
      source: 'switch_child',
    });
    if (sharedCold && (sharedCold.code === 'PICKER_SHOWN' || sharedCold.ok)) return;
  }

  if (forcePicker) {
    sessionStorage.removeItem('cl_force_picker');
    sessionStorage.removeItem('cl_selected_username');
    selectedChild = null;
    pinDigits = [];
    document.getElementById('clStepPin')?.classList.remove('active');
    document.getElementById('clStepProfiles')?.classList.add('active');
    if (url.searchParams.has('picker')) {
      url.searchParams.delete('picker');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
  }

  // Render child list (single-child families may auto-jump to PIN)
  renderChildList({
    forcePicker: forcePicker,
    resumeAddChild: resumeAddChild,
  });

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
        runNewChildWithParentGate();
      } else {
        openAddChild();
      }
    }, 150);
  }
});

let sharedDevicePickerMeta = null;

function txShared(key) {
  return tx('sharedDevice.' + key) || tx('login.' + key);
}

function paintSharedDevicePickerCards(children) {
  const list = document.getElementById('clChildList');
  if (!list) return;
  list.innerHTML = children.map(function (child) {
    const mapped = mapPickerChild(child, child.familyId);
    return [
      '<button type="button" class="cl-child-card cl-shared-device-card" data-child-id="', escapeHtml(child.id),
      '" onclick="pickSharedDeviceChild(\'', escapeJs(child.id), '\')">',
      '<div class="cl-avatar-ring">', renderClChildAvatar(mapped, 72), '</div>',
      '<div class="cl-child-info">',
      '<div class="cl-child-name">', escapeHtml(mapped.name), '</div>',
      '</div>',
      '</button>',
    ].join('');
  }).join('');
}

window.showSharedDevicePicker = function (children, meta) {
  sharedDevicePickerMeta = meta || {};
  const title = document.getElementById('clSelectTitle');
  const sub = document.getElementById('clSelectSub');
  if (title) title.textContent = txShared('whoUsesApp') || tx('login.whoAreYou');
  if (sub) sub.textContent = txShared('pickProfile') || '';
  document.getElementById('clStepPin')?.classList.remove('active');
  document.getElementById('clStepProfiles')?.classList.add('active');
  const empty = document.getElementById('clEmptyState');
  const noSession = document.getElementById('clNoSessionState');
  if (empty) empty.classList.add('hidden');
  if (noSession) noSession.classList.add('hidden');
  const addRow = document.getElementById('clAddChildRow');
  if (addRow) addRow.classList.add('hidden');
  paintSharedDevicePickerCards(children);
  trackChildEntry('shared_device_picker_shown', {
    allowed_count_bucket: sharedDevicePickerMeta.bucket || '2',
  });
};

window.pickSharedDeviceChild = async function (childId) {
  if (!childId || !window.TrustedDeviceBootstrap) return;
  const btn = document.querySelector('[data-child-id="' + childId + '"]');
  if (btn) btn.disabled = true;
  await TrustedDeviceBootstrap.pickSharedChild(childId, sharedDevicePickerMeta);
  if (btn) btn.disabled = false;
};