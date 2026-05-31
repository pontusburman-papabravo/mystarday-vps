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
let MAX_ATTEMPTS = 5;
let lockoutEndTime = null;
let countdownInterval = null;

// ── Avatar rendering helper (same as dom-utils.js) ──────────────────────────
function renderChildAvatar(child, size) {
  if (child.avatar_url) {
    return `<img src="${child.avatar_url}" alt="${child.name}" />`;
  }
  return `<span>${child.emoji || '⭐'}</span>`;
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
  fetchMeChildren().then(parentChildren => {
    if (parentChildren && parentChildren.length > 0) {
      // Deduplicate by username: prefer richer data from parent session
      const seen = new Set();
      merged = parentChildren.map(pc => {
        seen.add(pc.username);
        return pc;
      });
      // Append known children not already in parent list
      for (const kc of known) {
        if (!seen.has(kc.username)) merged.push(kc);
      }
    }

    if (merged.length === 0) {
      list.innerHTML = '';
      // No children at all — check if we have a parent session.
      // Without a session there's no family to add children to.
      const hasSession = Auth.isLoggedIn();
      if (!hasSession && noSession) {
        // No session, no known children → show manual name input form
        if (empty) empty.classList.add('hidden');
        noSession.classList.remove('hidden');
      } else {
        // Parent is logged in but has no children yet → show original empty state
        if (noSession) noSession.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
      }
      return;
    }

    if (empty) empty.classList.add('hidden');
    if (noSession) noSession.classList.add('hidden');
    list.innerHTML = merged.map(child => `
      <a href="#" class="cl-child-card" data-username="${escapeHtml(child.username)}" onclick="selectChild('${escapeJs(child.username)}'); return false;">
        <div class="cl-avatar-ring">${renderChildAvatar(child, 52)}</div>
        <div class="cl-child-info">
          <div class="cl-child-name">${escapeHtml(child.name)}</div>
          <div class="cl-child-sub">${escapeHtml(child.username)}</div>
        </div>
        <div class="cl-child-arrow">›</div>
      </a>
    `).join('');
  });
}

function fetchMeChildren() {
  return window.apiFetch('/api/auth/me')
    .then(r => r.ok ? r.json() : null)
    .then(me => {
      if (!me || !me.children || me.children.length === 0) return null;
      return me.children.map(c => ({
        username: c.username || c.name?.toLowerCase().replace(/\b\//g, '') || c.name,
        name: c.name || c.username,
        emoji: c.emoji || '⭐',
        avatar_url: c.avatar_url || null,
        familyId: c.family_id || me.familyId || null,
        lastLoginAt: null,
      }));
    })
    .catch(() => null);
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
  const known = loadKnownChildren();
  const parentChildren = []; // will be set if we have them

  // Find in known
  let child = known.find(k => k.username === username);

  // Fallback: construct from username for parent children
  if (!child) {
    child = { username, name: username, emoji: '⭐', avatar_url: null };
  }

  selectedChild = child;
  sessionStorage.setItem('cl_selected_username', username);

  // Show PIN step
  document.getElementById('clStepProfiles').classList.remove('active');
  document.getElementById('clStepPin').classList.add('active');

  // Update greeting + avatar
  document.getElementById('clPinGreeting').textContent = `Hej ${child.name}!`;
  document.getElementById('clPinAvatar').innerHTML = renderChildAvatar(child, 100);

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
window.clBackToProfiles = function() {
  selectedChild = null;
  sessionStorage.removeItem('cl_selected_username');
  pinDigits = [];
  document.getElementById('clStepPin').classList.remove('active');
  document.getElementById('clStepProfiles').classList.add('active');
  hideError();
  hideLockout();
  clearCountdown();
};

// ── Add child: redirect to onboarding ─────────────────────────────────────────
window.openAddChild = function() {
  if (Auth.isLoggedIn()) {
    window.location.href = '/onboarding?flow=add-child';
  } else {
    // Save intended destination, redirect to login
    sessionStorage.setItem('cl_add_child_next', '/onboarding?flow=add-child');
    window.location.href = '/login?next=' + encodeURIComponent('/onboarding?flow=add-child');
  }
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
      // Haptic feedback
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

    // Success
    Auth.setAuth(null, data.user, data.csrfToken, data.expiresAt);
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
          window.location.href = '/dashboard';
        }, function () {
          // cancelled — stay on child login screen
        });
      } else {
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
// Shown when child is logged in and taps "Jag är vuxen" with parent session saved.
function showParentPinGateOverlay(onSuccess, onCancel) {
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
    '<p style="font-size:0.875rem;color:#5A6178;margin-bottom:20px;">Ange din PIN-kod för att fortsätta</p>',
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
    fetch('/api/family/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      credentials: 'include',
      body: JSON.stringify({ pin: pin }),
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.ok && res.gateToken) {
        window._ppinGateToken = res.gateToken;
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

  // Check if returning with a preselected child
  const preselected = sessionStorage.getItem('cl_selected_username');
  if (preselected) {
    // Restore selected child from known_children
    const known = loadKnownChildren();
    const child = known.find(k => k.username === preselected);
    if (child) {
      window.selectChild(preselected);
    } else {
      sessionStorage.removeItem('cl_selected_username');
    }
  }

  // Render child list
  renderChildList();

  // Handle login redirect with next param
  const url = new URL(window.location.href);
  const next = url.searchParams.get('next');
  if (next) sessionStorage.setItem('cl_add_child_next', next);

  // Check for pending add-child redirect after parent login
  const savedNext = sessionStorage.getItem('cl_add_child_next');
  if (savedNext) {
    // If parent just logged in, redirect to add-child
    if (Auth.isLoggedIn()) {
      sessionStorage.removeItem('cl_add_child_next');
      window.location.href = savedNext;
    }
  }
});