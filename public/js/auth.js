/**
 * Min Stjärndag auth helpers.
 * Handles token storage, silent refresh, API calls, and redirects.
 *
 * Auth flow:
 *   - Access token: short-lived JWT (15 min), stored in httpOnly cookie (XSS-safe).
 *   - Refresh token: 7-day httpOnly cookie (managed by server, never readable by JS).
 *   - Silent refresh: access token is renewed transparently 2 min before expiry.
 *   - CSRF: double-submit cookie. Token in csrf_token cookie (readable by JS)
 *     and sent as X-CSRF-Token header on all state-changing requests.
 *   - Token expiry tracked in non-httpOnly cookie so JS can schedule proactive refresh.
 *
 * Cookie-only auth (v22+):
 *   - Access token is ONLY in httpOnly cookie. Never in localStorage.
 *   - getToken() always returns null. Authorization header is never set.
 *   - Server auth middleware reads the cookie directly.
 */

// ─── One-time migration: purge stale localStorage auth data ────────
// Why: before the httpOnly cookie migration (commit cd9b175), the access token
// was stored in localStorage as 'stjarndag_token'. Old tokens sitting in localStorage
// cause a login loop: getToken() returned the expired token → Authorization header
// sent → server rejected it (header has priority over cookie) → 401 → redirect to login.
// This cleanup runs once on page load and removes the stale token permanently.
(function _purgeStaleLocalStorageAuth() {
  try {
    var staleKeys = ['stjarndag_token', 'token', 'authToken'];
    for (var i = 0; i < staleKeys.length; i++) {
      localStorage.removeItem(staleKeys[i]);
    }
  } catch (e) { /* localStorage unavailable — not a problem */ }
})();

const Auth = {
  TOKEN_KEY: 'stjarndag_token',
  USER_KEY: 'stjarndag_user',
  CSRF_KEY: 'stjarndag_csrf',
  TOKEN_EXP_KEY: 'stjarndag_token_exp',

  // Minimum ms before expiry at which we proactively refresh (2 minutes).
  REFRESH_THRESHOLD_MS: 2 * 60 * 1000,

  _refreshPromise: null,
  _refreshTimer: null,
  _csrfFetchPromise: null,

  /**
   * Get the stored access token.
   * Always returns null — access token lives in httpOnly cookie only.
   * Browser sends the cookie automatically with credentials: 'include'.
   * No Authorization header is needed or sent.
   */
  getToken() {
    // Cookie-only auth: token is in httpOnly cookie, never in localStorage.
    // Return null so api()/apiFetch() don't set Authorization header.
    return null;
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch {
      return null;
    }
  },

  /**
   * Read CSRF token from cookie (set by server on login/csrf-token endpoint).
   * The cookie is NOT httpOnly so JS can read it for the double-submit pattern.
   */
  getCsrfToken() {
    const cached = localStorage.getItem(this.CSRF_KEY);
    if (cached) return cached;

    const match = document.cookie.match(/(?:^|;\u0020)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  },

  /**
   * Get the current family ID from the stored user object.
   */
  getFamilyId() {
    const user = this.getUser();
    return user ? user.familyId : null;
  },

  /**
   * Read access token expiry (ms) from non-httpOnly cookie or localStorage.
   */
  _getExpiryMs() {
    const lsExp = localStorage.getItem(this.TOKEN_EXP_KEY);
    if (lsExp) return parseInt(lsExp, 10);

    const match = document.cookie.match(/(?:^|;\u0020)stjarndag_token_exp=([^;]+)/);
    if (!match) return null;
    return parseInt(decodeURIComponent(match[1]), 10);
  },

  /**
   * Ensure a CSRF token is available. If not cached, fetch one from the server.
   * Deduplicates concurrent calls — only one fetch in flight at a time.
   */
  async ensureCsrfToken() {
    if (this.getCsrfToken()) return this.getCsrfToken();
    if (this._csrfFetchPromise) return this._csrfFetchPromise;

    this._csrfFetchPromise = (async () => {
      try {
        const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.csrfToken) {
            localStorage.setItem(this.CSRF_KEY, data.csrfToken);
            return data.csrfToken;
          }
        }
      } catch {}
      return null;
    })();

    try {
      return await this._csrfFetchPromise;
    } finally {
      this._csrfFetchPromise = null;
    }
  },

  /**
   * Store auth session data. Access token goes to httpOnly cookie (set by server).
   * Only user and csrf are stored in localStorage.
   * @param {string|null} token - Access token (may be null for cookie-based logins)
   * @param {object} user - User object
   * @param {string} csrfToken - CSRF token
   * @param {number} [expMs] - Token expiry timestamp in ms (for scheduling silent refresh)
   */
  setAuth(token, user, csrfToken, expMs) {
    // Token goes to httpOnly cookie (set by server). Never store in localStorage.
    // Explicitly remove any stale token that might have been left by old code.
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    if (csrfToken) {
      localStorage.setItem(this.CSRF_KEY, csrfToken);
    }

    if (expMs) {
      localStorage.setItem(this.TOKEN_EXP_KEY, String(expMs));
      // Also set as cookie so expiry tracking survives PWA restarts/installs.
      // Cookie maxAge = 30 days matches access token cookie and refresh token.
      // Read by _getExpiryMs() as fallback when localStorage is cleared.
      document.cookie = `${this.TOKEN_EXP_KEY}=${expMs}; max-age=${30 * 24 * 60 * 60}; path=/; samesite=lax`;
      this._scheduleRefresh(expMs);
    }
  },

  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_EXP_KEY);
    localStorage.removeItem(this.CSRF_KEY);
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    // Clear both localStorage and cookie expiry tracking
    document.cookie = 'stjarndag_token_exp=; max-age=0; path=/; samesite=lax';
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  /**
   * Schedule a silent refresh 2 min before token expiry.
   */
  _scheduleRefresh(expMs) {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    const delay = expMs - Date.now() - this.REFRESH_THRESHOLD_MS;
    if (delay > 0) {
      this._refreshTimer = setTimeout(() => this.silentRefresh(), delay);
    }
  },

  /**
   * Silently renew the access token using the httpOnly refresh token cookie.
   * Deduplicates concurrent calls — only one refresh in flight at a time.
   * Retries once on server errors (5xx).
   * 401 = refresh token expired/revoked — clear session and redirect to login.
   *
   * Shared-device guard: after refresh, verify user type via /api/auth/me
   * to catch child refresh cookie overwriting parent session.
   */
  async silentRefresh() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (res.ok) {
            const data = await res.json();

            // Shared-device guard: verify user type after refresh.
            // The access token is now in an httpOnly cookie — we can't decode it in JS.
            // Use /api/auth/me to verify the session user type matches.
            try {
              const meRes = await fetch('/api/auth/me', { credentials: 'include' });
              if (meRes.ok) {
                const meData = await meRes.json();
                const currentUser = this.getUser();
                if (currentUser && meData.type && meData.type !== currentUser.type) {
                  console.warn('[AUTH] User type mismatch after refresh: expected', currentUser.type, 'got', meData.type, '— forcing re-login');
                  this.clearAuth();
                  window.location.href = '/login';
                  return null;
                }
              }
            } catch {}

            // Update CSRF token if the server included a fresh one
            if (data.csrfToken) {
              localStorage.setItem(this.CSRF_KEY, data.csrfToken);
            }

            // Re-schedule next silent refresh with the new expiry
            if (data.expiresAt) {
              localStorage.setItem(this.TOKEN_EXP_KEY, String(data.expiresAt));
              this._scheduleRefresh(data.expiresAt);
            }

            // Notify SSE client to reconnect with fresh token
            if (window._sseClient && window._sseClient.reconnect) {
              try { window._sseClient.reconnect(); } catch {}
            }
            return true;
          }

          // 401 = refresh token genuinely expired/revoked — always to /login (role selection)
          if (res.status === 401) {
            this.clearAuth();
            window.location.href = '/login';
            return null;
          }

          // 5xx = transient server error — retry once
          if (res.status >= 500 && attempt === 0) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }

          return null;
        } catch {
          return null;
        }
      }
      return null;
    })();

    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  },

  /**
   * Check if access token is near expiry and refresh proactively.
   * Called before every API request.
   */
  async _ensureFreshToken() {
    const expMs = this._getExpiryMs();
    if (!expMs) return;
    if (Date.now() >= expMs - this.REFRESH_THRESHOLD_MS) {
      await this.silentRefresh();
    }
  },

  /**
   * Make an authenticated API request with CSRF protection.
   */
  async api(url, options = {}) {
    await this._ensureFreshToken();

    const method = (options.method || 'GET').toUpperCase();
    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    if (isMutation) await this.ensureCsrfToken();

    const _doRequest = async () => {
      const token = this.getToken();
      const headers = { 'Content-Type': 'application/json', ...options.headers };
      // Cookie-only auth for normal users (getToken() returns null).
      // Impersonation override sets getToken() to return a real token — send it as header.
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (isMutation) {
        const csrf = this.getCsrfToken();
        if (csrf) headers['X-CSRF-Token'] = csrf;
      }

      return fetch(url, { ...options, headers, credentials: 'include' });
    };

    let res = await _doRequest();
    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (res.status === 403 && isMutation && (data.code === 'CSRF_MISSING' || data.code === 'CSRF_INVALID')) {
      localStorage.removeItem(this.CSRF_KEY);
      await this.ensureCsrfToken();
      res = await _doRequest();
      try { data = await res.json(); } catch { data = {}; }
    }

    if (!res.ok) {
      // Surface detailed backend message; fallback to status text if body is empty
      const msg = data?.error || (data?.message) || res.statusText || 'Något gick fel';
      throw Object.assign(new Error(msg), { status: res.status, body: data });
    }
    return data;
  },

  /**
   * Redirect to appropriate dashboard based on user type.
   */
  redirectToDashboard() {
    const user = this.getUser();
    if (!user) return;
    if (user.type === 'child' || (!user.email && user.username)) {
      window.location.href = '/child-dashboard';
    } else if (user.isAdmin || user.is_admin) {
      window.location.href = '/admin';
    } else if (user.onboarding_completed === false) {
      window.location.href = '/onboarding';
    } else {
      window.location.href = '/dashboard';
    }
  },

  requireAuth(type = null) {
    // NOTE: localStorage check only — used by pages that follow with API verification.
    // Pages needing strict check should use authGuard() instead.
    if (!this.isLoggedIn()) {
      // localStorage may be cleared (privacy mode, mobile Safari) while httpOnly
      // cookies are still valid. Try to recover the session from the API before
      // redirecting. If both localStorage and cookies are gone, redirect follows.
      if (!document.cookie.includes('access_token')) {
        window.location.href = '/login';
        return false;
      }
      // Has access_token cookie — let the next API call succeed or redirect
      return true;
    }
    return true;
  },

  async logout() {
    // Unregister native push token BEFORE hitting the logout API so the
    // correct user is associated with the token at time of deletion.
    // Fire-and-forget — logout must not stall on this.
    if (typeof window !== 'undefined' && typeof window.Platform !== 'undefined' && window.Platform.push) {
      window.Platform.push.unregister().catch(() => {});
    }

    // Retry once on CSRF mismatch — cookie clearing is the critical path.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const csrf = this.getCsrfToken();
        const headers = { 'Content-Type': 'application/json' };
        if (csrf) headers['X-CSRF-Token'] = csrf;
        const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers });
        if (res.status === 403) {
          localStorage.removeItem(this.CSRF_KEY);
          await this.ensureCsrfToken();
          continue; // retry with fresh CSRF
        }
        let data;
        try { data = await res.json(); } catch { data = {}; }

        if (data.sessionRestored) {
          // No parent PIN → parent session restored → go to dashboard
          window.location.href = '/dashboard';
          return;
        }

        if (data.needsParentPin) {
          // Parent PIN required — clear child tokens, show PIN overlay, then restore
          this._clearChildCookies();
          this._showParentPinGateOverlay(function () {
            // PIN verified → call restore-parent-session endpoint
            Auth.api('/api/family/restore-parent-session', {
              method: 'POST',
              body: JSON.stringify({ gateToken: window._ppinGateToken }),
            }).then(function () {
              window.location.href = '/dashboard';
            }).catch(function () {
              window.location.href = '/login';
            });
          }, function () {
            // PIN cancelled → go to login
            window.location.href = '/login';
          });
          return;
        }

        // No session to restore → go to / (web) or /login (app)
        this._fullClear();
        if (
          (typeof Platform !== 'undefined' && typeof Platform.isNative === 'function' && Platform.isNative()) ||
          (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
        ) {
          window.location.href = '/login';
        } else {
          window.location.href = '/';
        }
        return;
      } catch {
        // Network error — break and fall through
        break;
      }
    }
    // Fetch failed after retries: clear state, go to / (web) or /login (app).
    this._fullClear();
    if (
      (typeof Platform !== 'undefined' && typeof Platform.isNative === 'function' && Platform.isNative()) ||
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
    ) {
      window.location.href = '/login';
    } else {
      window.location.href = '/';
    }
  },

  /**
   * Full localStorage + cookie cleanup on logout.
   * Clears auth keys AND all app-specific data (known_children, etc.)
   * so the next user on a shared device starts clean.
   */
  _fullClear() {
    this.clearAuth();
    try {
      localStorage.removeItem('stjarndag_known_children');
      localStorage.removeItem('stjarndag_selected_child');
      localStorage.removeItem('stjarndag_theme');
    } catch {}
  },

  /**
   * Clear child-specific localStorage state (keep parent session if present).
   * Child tokens (httpOnly cookies) are revoked server-side.
   */
  _clearChildCookies: function () {
    try {
      localStorage.removeItem('stjarndag_selected_child');
      localStorage.removeItem('stjarndag_theme');
    } catch {}
  },

  /**
   * Show the parent PIN gate overlay after child logout.
   * Verifies PIN, stores gateToken on window._ppinGateToken, then calls onSuccess.
   */
  _showParentPinGateOverlay: function (onSuccess, onCancel) {
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
  },
};

// Re-schedule refresh on page load.
(function () {
  const expMs = Auth._getExpiryMs();
  if (expMs) {
    if (Date.now() < expMs) {
      Auth._scheduleRefresh(expMs);
    } else {
      Auth.silentRefresh();
    }
  }
})();

// Proactively fetch CSRF token on page load for authenticated users.
(function () {
  if (!Auth.isLoggedIn()) return;
  if (!Auth.getCsrfToken()) {
    Auth.ensureCsrfToken();
  }
})();

// Visibility change handler — refresh token when app/tab comes back to foreground.
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'visible') return;
  if (!Auth.isLoggedIn()) return;

  const expMs = Auth._getExpiryMs();
  if (!expMs) return;

  if (Date.now() >= expMs - Auth.REFRESH_THRESHOLD_MS) {
    Auth.silentRefresh();
  } else {
    Auth._scheduleRefresh(expMs);
  }
});

/**
 * Show/hide helpers for form messages.
 */
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = message; el.classList.remove('hidden'); }
}
function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add('hidden');
}
function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = message; el.classList.remove('hidden'); }
}
function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Laddar...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}

/**
 * Authenticated fetch — includes Bearer token + CSRF header automatically.
 * Returns raw Response (does NOT throw on non-2xx).
 */
window.apiFetch = async function(url, options = {}) {
  await Auth._ensureFreshToken();

  const method = (options.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (isMutation) await Auth.ensureCsrfToken();

  const _doRequest = async () => {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    // Cookie-only auth for normal users (getToken() returns null).
    // Impersonation override sets getToken() to return a real token — send it as header.
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (isMutation) {
      const csrf = Auth.getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  const res = await _doRequest();

  if (res.status === 403 && isMutation) {
    try {
      const data = await res.clone().json();
      if (data.code === 'CSRF_MISSING' || data.code === 'CSRF_INVALID') {
        localStorage.removeItem(Auth.CSRF_KEY);
        await Auth.ensureCsrfToken();
        return _doRequest();
      }
    } catch {}
  }

  return res;
};

/**
 * Auth guard for parent-only pages.
 */
window.authGuard = async function() {
  // Always verify with API — localStorage may be cleared (privacy mode, mobile Safari)
  // while httpOnly cookies are still valid. Do NOT redirect based on localStorage alone.
  try {
    const res = await window.apiFetch('/api/auth/me');
    if (!res.ok) {
      Auth.clearAuth();
      window.location.href = '/login';
      return null;
    }
    return await res.json();
  } catch {
    Auth.clearAuth();
    window.location.href = '/login';
    return null;
  }
};

/**
 * Logout helper for inline onclick handlers.
 */
window.logout = function() { Auth.logout(); };

/**
 * Check auth + fetch current user for admin pages.
 * Returns user object with isAdmin flag, or null on failure.
 * Usage: const user = await checkAuth();
 */
window.checkAuth = async function() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};