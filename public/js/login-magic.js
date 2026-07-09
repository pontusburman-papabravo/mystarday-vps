/**
 * login-magic.js — Role selector logic for the "magisk natt" login redesign.
 * WHAT: role card interaction, parent form reveal, back navigation, show/hide helpers.
 * WHAT NOT: auth POST/Apple sign-in — handled by inline scripts in login.html.
 */

(function () {
  'use strict';

  /* ── Star generation ────────────────────────────────────────────────────── */
  function generateStars(count) {
    const container = document.getElementById('stars-container');
    if (!container) return;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star-particle';
      const size = Math.random() < 0.7 ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 7) + 6;
      star.style.cssText = [
        'width:' + size + 'px',
        'height:' + size + 'px',
        'background:rgba(255,255,255,' + (Math.random() * 0.6 + 0.2).toFixed(2) + ')',
        'left:' + (Math.random() * 100).toFixed(1) + '%',
        'top:'  + (Math.random() * 100).toFixed(1) + '%',
        '--float-dur:'    + (Math.random() * 5 + 3).toFixed(1) + 's',
        '--float-delay:'  + (Math.random() * 4).toFixed(1) + 's',
        '--twinkle-dur:'  + (Math.random() * 3 + 1.5).toFixed(1) + 's',
        '--twinkle-delay:'+ (Math.random() * 3).toFixed(1) + 's',
      ].join(';');

      if (Math.random() < 0.35) star.classList.add('lit');
      if (Math.random() < 0.2)  star.classList.add('fast');
      if (Math.random() < 0.15) star.classList.add('slow');

      container.appendChild(star);
    }
  }

  /* ── Cloud generation ────────────────────────────────────────────────────── */
  function generateClouds(count) {
    const container = document.getElementById('clouds-container');
    if (!container) return;
    for (let i = 0; i < count; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud';
      const w = Math.floor(Math.random() * 180 + 80);
      const h = Math.floor(w * (0.4 + Math.random() * 0.3));
      cloud.style.cssText = [
        'width:' + w + 'px',
        'height:' + h + 'px',
        'left:' + (Math.random() * 100).toFixed(1) + '%',
        'top:'  + (Math.random() * 70).toFixed(1) + '%',
        '--drift-dur:'   + (Math.random() * 15 + 10).toFixed(0) + 's',
        '--drift-delay:' + (Math.random() * 8).toFixed(1) + 's',
      ].join(';');
      container.appendChild(cloud);
    }
  }

  /* ── Add-child return mode (?next=…addChild…) ───────────────────────────── */
  let _addChildReturnMode = false;

  function isAddChildLoginReturn() {
    try {
      const next = new URLSearchParams(window.location.search).get('next') || '';
      return next.indexOf('addChild') !== -1;
    } catch {
      return false;
    }
  }

  function setAddChildReturnMode(on) {
    _addChildReturnMode = !!on;
    const kidCard = document.getElementById('kid-role-card');
    if (kidCard && _addChildReturnMode) {
      kidCard.style.opacity = '0.45';
      kidCard.style.pointerEvents = 'none';
      kidCard.setAttribute('aria-disabled', 'true');
    }
  }

  function redirectAfterParentCardLogin() {
    try {
      const pending = sessionStorage.getItem('cl_add_child_pending');
      if (pending === 'new') {
        sessionStorage.removeItem('cl_add_child_pending');
        sessionStorage.removeItem('cl_add_child_next');
        if (window.DeviceMode) DeviceMode.enterParent();
        window.location.href = '/onboarding?flow=add-child';
        return;
      }
    } catch { /* fall through */ }
    if (isAddChildLoginReturn()) {
      try {
        const next = new URLSearchParams(window.location.search).get('next');
        if (next && next.startsWith('/') && !next.startsWith('//')) {
          if (window.DeviceMode) DeviceMode.enterParent();
          window.location.href = next;
          return;
        }
      } catch { /* fall through */ }
    }
    if (window.DeviceMode) DeviceMode.enterParent();
    if (window.NativeDebug) NativeDebug.log('login_redirect_dashboard', {});
    window.location.href = '/dashboard';
  }

  /* ── Role card interaction ──────────────────────────────────────────────── */
  function initRoleCards() {
    const kidCard   = document.getElementById('kid-role-card');
    const parentCard = document.getElementById('parent-role-card');

    if (!kidCard || !parentCard) return;

    if (isAddChildLoginReturn()) setAddChildReturnMode(true);

    kidCard.addEventListener('click', function (e) {
      e.preventDefault();
      if (_addChildReturnMode || isAddChildLoginReturn()) {
        showParentLogin();
        const banner = document.getElementById('addChildLoginBanner');
        if (banner) banner.classList.remove('hidden');
        return;
      }
      // User chose child login — do not resume add-child parent gate on barnväljare.
      try {
        sessionStorage.removeItem('cl_add_child_pending');
        sessionStorage.removeItem('cl_add_child_next');
      } catch { /* ignore */ }
      if (window.AppEntry && typeof AppEntry.goToChildLogin === 'function' && AppEntry.isFullEntryFlow()) {
        AppEntry.goToChildLogin();
        return;
      }
      if (window.DeviceMode) DeviceMode.enterChild();
      window.location.href = '/child-login';
    });

    parentCard.addEventListener('click', function (e) {
      e.preventDefault();
      // Barnläge + aktiv session → PIN-gate. Utloggad → vuxenstart eller login.
      if (
        window.ParentalGate && window.DeviceMode && DeviceMode.isChildMode() &&
        window.Auth && Auth.isLoggedIn()
      ) {
        ParentalGate.requireParentMode(function () {
          if (window.AppEntry && AppEntry.isFullEntryFlow()) {
            AppEntry.goToAdultStart();
          } else {
            showParentLogin();
          }
        });
        return;
      }
      if (window.DeviceMode && DeviceMode.isChildMode()) {
        DeviceMode.enterParent();
      }
      // If parent already has an active session, skip login form → go to dashboard.
      if (window.Auth && Auth.isLoggedIn()) {
        parentCard.disabled = true;
        parentCard.style.opacity = '0.7';
        window.apiFetch('/api/auth/me').then(function (res) {
          if (res.ok) {
            // Session valid → check if parent PIN is required
            window.apiFetch('/api/family/parent-pin-status').then(function (pinRes) {
              if (pinRes.ok) {
                return pinRes.json();
              }
              return { has_pin: false };
            }).then(function (pinData) {
              if (pinData.has_pin) {
                // PIN is set → show PIN overlay to gate parent access
                showParentPinGateOverlay(function (gateToken) {
                  redirectAfterParentCardLogin();
                }, function () {
                  // PIN failed or cancelled → go back
                  parentCard.disabled = false;
                  parentCard.style.opacity = '';
                });
              } else {
                redirectAfterParentCardLogin();
              }
            }).catch(function () {
              redirectAfterParentCardLogin();
            });
          } else {
            Auth.clearAuth();
            if (window.AppEntry && AppEntry.isFullEntryFlow()) {
              AppEntry.goToAdultStart();
            } else {
              showParentLogin();
            }
            parentCard.disabled = false;
            parentCard.style.opacity = '';
          }
        }).catch(function () {
          if (window.AppEntry && AppEntry.isFullEntryFlow()) {
            AppEntry.goToAdultStart();
          } else {
            showParentLogin();
          }
          parentCard.disabled = false;
          parentCard.style.opacity = '';
        });
        return;
      }
      if (window.AppEntry && typeof AppEntry.goToAdultStart === 'function' && AppEntry.isFullEntryFlow()) {
        AppEntry.goToAdultStart();
        return;
      }
      showParentLogin();
    });
  }

  /* ── Parent PIN gate overlay (global for parental-gate.js on /login) ─ */
  function showParentPinGateOverlay(onSuccess, onCancel) {
    const overlay = document.createElement('div');
    overlay.id = 'ppin-overlay';
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
      '<h3 style="font-family:Outfit,sans-serif;font-weight:700;color:#1B2340;margin-bottom:4px;">Föräldralås</h3>',
      '<p style="font-size:0.875rem;color:#5A6178;margin-bottom:20px;">Ange din PIN-kod för att fortsätta</p>',
      '<div id="ppin-dots" style="display:flex;justify-content:center;gap:12px;margin-bottom:20px;">',
        '<div class="ppin-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;transition:background 0.15s;"></div>',
        '<div class="ppin-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;transition:background 0.15s;"></div>',
        '<div class="ppin-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;transition:background 0.15s;"></div>',
        '<div class="ppin-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;transition:background 0.15s;"></div>',
      '</div>',
      '<div id="ppin-keypad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;" role="group" aria-label="PIN-tavla"></div>',
      '<div id="ppin-err" style="font-size:0.8rem;color:#ef4444;min-height:1.2em;margin-bottom:8px;"></div>',
      '<button id="ppin-cancel" style="font-size:0.8rem;color:#5A6178;text-decoration:underline;background:none;border:none;cursor:pointer;padding:8px;">Avbryt</button>',
    ].join('');

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let entered = '';
    const msgEl = document.getElementById('ppin-err');
    const dots = document.querySelectorAll('.ppin-dot');

    function updateDots() {
      dots.forEach(function (d, i) {
        d.style.background = i < entered.length ? '#F5A623' : '#EDE7F6';
      });
    }

    function buildKeypad() {
      const kbd = document.getElementById('ppin-keypad');
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
      const csrf = window.Auth ? Auth.getCsrfToken() : '';
      fetch('/api/family/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ pin: pin }),
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res.ok && res.gateToken) {
          document.body.removeChild(overlay);
          onSuccess(res.gateToken);
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

    document.getElementById('ppin-cancel').addEventListener('click', function () {
      document.body.removeChild(overlay);
      onCancel();
    });

    buildKeypad();
    updateDots();
  }
  window.showParentPinGateOverlay = showParentPinGateOverlay;

  /* ── Show parent login form ─────────────────────────────────────────────── */
  function showParentLogin() {
    if (window.AppEntry && typeof AppEntry.showScreen === 'function' && AppEntry.isFullEntryFlow()) {
      AppEntry.showScreen('ENTRY_ADULT_LOGIN');
      return;
    }

    const roleSection = document.getElementById('role-selection');
    const parentSection = document.getElementById('parent-login-section');

    if (!roleSection || !parentSection) return;

    roleSection.classList.add('card-transition');
    roleSection.style.display = 'none';
    parentSection.classList.add('card-transition');
    parentSection.style.display = 'flex';
  }

  /* ── Back to role selection ─────────────────────────────────────────────── */
  function backToRoleSelection() {
    if (window.AppEntry && typeof AppEntry.goBack === 'function' && AppEntry.isFullEntryFlow()) {
      AppEntry.goBack();
      return;
    }

    const roleSection = document.getElementById('role-selection');
    const parentSection = document.getElementById('parent-login-section');

    if (!roleSection || !parentSection) return;

    parentSection.classList.remove('card-transition');
    parentSection.style.display = 'none';
    roleSection.classList.add('card-transition');
    roleSection.style.display = 'flex';
  }

  /* ── Error helpers (called by inline login.html scripts) ───────────────── */
  window.LoginMagic = {
    showError: function (msg) {
      const el = document.getElementById('magic-login-error');
      if (el) {
        el.textContent = msg;
        el.style.display = '';
        el.classList.add('magic-error-box');
      }
    },
    hideError: function () {
      const el = document.getElementById('magic-login-error');
      if (el) {
        el.style.display = 'none';
        el.classList.remove('magic-error-box');
      }
    },
    setLoading: function (btn, on) {
      if (!btn) return;
      btn.disabled = on;
      btn.textContent = on ? 'Loggar in…' : 'Logga in';
    },
    showParentLogin: showParentLogin,
    backToRoleSelection: backToRoleSelection,
    setAddChildReturnMode: setAddChildReturnMode,
    isAddChildLoginReturn: isAddChildLoginReturn,
  };

  /* ── Init ──────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    generateStars(50);
    generateClouds(5);
    initRoleCards();
  });

})();