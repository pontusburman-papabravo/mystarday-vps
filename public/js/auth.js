/**
 * App auth helpers.
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
    const staleKeys = ['stjarndag_token', 'token', 'authToken'];
    for (let i = 0; i < staleKeys.length; i++) {
      localStorage.removeItem(staleKeys[i]);
    }
  } catch (_e) { /* localStorage unavailable — not a problem */ }
})();

const SILENT_REFRESH_TIMEOUT_MS = 12000;
const AUTH_ME_TIMEOUT_MS = 12000;
const AUTH_ME_HANDOFF_TOTAL_TIMEOUT_MS = 12000;
const AUTH_ME_HANDOFF_REQUEST_TIMEOUT_MS = 2500;
const AUTH_ME_HANDOFF_POLL_ATTEMPTS = 8;
const AUTH_ME_HANDOFF_POLL_DELAY_MS = 250;

/** Native WebView: cookie auth + skip refresh round-trips (Android Play + iOS parity). */
function isNativeClient() {
  if (document.documentElement.classList.contains('is-native-android')) return true;
  if (document.documentElement.classList.contains('platform-native')) return true;
  if (typeof window.Platform !== 'undefined' && typeof Platform.isNative === 'function' && Platform.isNative()) {
    return true;
  }
  return false;
}

const Auth = {
  TOKEN_KEY: 'stjarndag_token',
  USER_KEY: 'stjarndag_user',
  CSRF_KEY: 'stjarndag_csrf',
  TOKEN_EXP_KEY: 'stjarndag_token_exp',
  KNOWN_CHILDREN_KEY: 'stjarndag_known_children',

  // Minimum ms before expiry at which we proactively refresh (2 minutes).
  REFRESH_THRESHOLD_MS: 2 * 60 * 1000,

  _refreshPromise: null,
  _refreshTimer: null,
  _csrfFetchPromise: null,
  _parentHandoffRestorePromise: null,

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
   * Read csrf_token from document.cookie (double-submit cookie half).
   */
  _readCsrfCookie() {
    const match = document.cookie.match(/(?:^|;)\s*csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  },

  /**
   * Read CSRF token — cookie is source of truth (must match X-CSRF-Token header).
   * localStorage alone is not enough; without cookie the server returns CSRF_MISSING.
   */
  getCsrfToken() {
    const cookieToken = this._readCsrfCookie();
    if (cookieToken) {
      const cached = localStorage.getItem(this.CSRF_KEY);
      if (cached !== cookieToken) localStorage.setItem(this.CSRF_KEY, cookieToken);
      return cookieToken;
    }
    return null;
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
    localStorage.removeItem(this.CSRF_KEY);
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
    if (typeof window !== 'undefined' && user) {
      const familyId = user.familyId || user.family_id || null;
      window.dispatchEvent(new CustomEvent('stjarndag:auth-login', { detail: { familyId } }));
    }
  },

  clearAuth() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stjarndag:auth-logout'));
    }
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

  /** Redirect target when session is lost — child pages go to child picker, not /login. */
  _sessionLostRedirect() {
    const user = this.getUser();
    const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    const childContext =
      (user && user.type === 'child') ||
      path === '/child-dashboard' ||
      path.indexOf('/child/') === 0 ||
      path === '/child-login';
    const target = childContext ? '/child-login' : '/login';
    if (path === target) return;
    window.location.replace(target);
  },

  /**
   * Child picker: family children + whether a parent session exists (cookie).
   * Supports legacy array responses for backwards compatibility.
   */
  async fetchLoginPickerContext() {
    try {
      const res = await fetch('/api/auth/login-picker-children', { credentials: 'include' });
      if (!res.ok) return { hasSession: false, children: [], parent: null };
      const data = await res.json();
      if (Array.isArray(data)) {
        return {
          hasSession: data.length > 0,
          children: data,
          parent: null,
        };
      }
      return {
        hasSession: !!data.hasSession,
        children: data.children || [],
        parent: data.parent || null,
      };
    } catch {
      return { hasSession: false, children: [], parent: null };
    }
  },

  /**
   * Hydrate localStorage parent user from child picker (stjarndag_parent_session / parent JWT).
   * Used for flow=add-child onboarding when Auth was cleared (e.g. after "Byt barn").
   */
  async hydrateUserFromLoginPicker() {
    if (this.isLoggedIn()) {
      const u = this.getUser();
      if (u && u.type === 'parent') return true;
    }
    const ctx = await this.fetchLoginPickerContext();
    if (!ctx.hasSession || !ctx.parent) return false;
    this.setAuth(null, ctx.parent);
    await this.ensureCsrfToken();
    return true;
  },

  isParentUser(user) {
    return !!(user && user.type === 'parent');
  },

  /**
   * Swap child httpOnly cookies for saved parent session (no PIN families only).
   */
  async activateSavedParentSession() {
    try {
      await this.ensureCsrfToken();
      const csrf = this.getCsrfToken();
      const headers = { 'Content-Type': 'application/json' };
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const res = await fetch('/api/family/activate-saved-parent-session', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      let data = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          code: data.code,
          error: data.error,
        };
      }
      if (data.parent) {
        this.setAuth(null, data.parent, data.csrfToken || csrf);
      }
      if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
        DeviceMode.enterParent();
      }
      return { ok: true, user: data.parent, alreadyParent: !!data.alreadyParent };
    } catch (err) {
      return { ok: false, error: err && err.message };
    }
  },

  /**
   * Silent restore when child cookie is active but a saved parent session exists (no PIN).
   */
  async tryActivateSavedParentSession() {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (meRes.ok) {
      const me = await meRes.json();
      if (this.isParentUser(me)) {
        const csrf = this.getCsrfToken();
        const expMs = this._getExpiryMs();
        this.setAuth(null, me, csrf, expMs);
        return { ok: true, user: me };
      }
    }
    const ctx = await this.fetchLoginPickerContext();
    if (!ctx.hasSession) {
      return { ok: false, code: 'NO_SAVED_PARENT_SESSION' };
    }
    return this.activateSavedParentSession();
  },

  /**
   * UI flow: child session active, user chose parent — PIN gate or cookie swap.
   */
  ensureParentAccessFromChild(onSuccess, onCancel) {
    const self = this;
    return this.fetchLoginPickerContext().then(function (ctx) {
      if (!ctx.hasSession) {
        self.clearAuth();
        if (onCancel) onCancel({ code: 'NO_SAVED_PARENT_SESSION' });
        return false;
      }
      return fetch('/api/family/parent-pin-status-picker', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : { has_pin: true }; })
        .then(function (pinData) {
          if (pinData.has_pin) {
            self._showParentPinGateOverlay(function () {
              self.activateSavedParentSession().then(function (result) {
                if (result.ok && onSuccess) onSuccess(result.user);
                else if (onCancel) onCancel(result);
              });
            }, function () {
              if (onCancel) onCancel({ code: 'PIN_CANCELLED' });
            }, { verifyUrl: '/api/family/verify-pin-picker', applyPickerResponse: true });
            return true;
          }
          return self.activateSavedParentSession().then(function (result) {
            if (result.ok) {
              if (onSuccess) onSuccess(result.user);
              return true;
            }
            if (onCancel) onCancel(result);
            return false;
          });
        });
    });
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
    if (this._refreshPromise) {
      return Promise.race([
        this._refreshPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), SILENT_REFRESH_TIMEOUT_MS)),
      ]);
    }

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
                  this._sessionLostRedirect();
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
            this._sessionLostRedirect();
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
      return await Promise.race([
        this._refreshPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), SILENT_REFRESH_TIMEOUT_MS)),
      ]);
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
      const msg = data?.error || (data?.message) || res.statusText || Auth._localizedServerError();
      throw Object.assign(new Error(msg), { status: res.status, body: data });
    }
    return data;
  },

  /**
   * Redirect to appropriate dashboard based on user type.
   */
  redirectToDashboard() {
    const user = this.getUser();
    const diag = typeof window !== 'undefined' ? window.AppleSignInDiagnostics : null;
    if (!user) {
      if (diag && diag.logPost) {
        diag.logPost('step_7_redirect_aborted', { reason: 'no_user_in_localStorage' });
      }
      return;
    }
    let target = '/dashboard';
    if (user.type === 'child' || (!user.email && user.username)) {
      if (window.DeviceMode && typeof DeviceMode.enterChild === 'function') {
        DeviceMode.enterChild();
      }
      target = '/child/today';
    } else if (user.isAdmin || user.is_admin) {
      if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
        DeviceMode.enterParent();
      }
      target = '/admin';
    } else if (user.onboarding_completed === false) {
      if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
        DeviceMode.enterParent();
      }
      target = '/onboarding';
    } else {
      if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
        DeviceMode.enterParent();
      }
      target = '/dashboard';
    }
    if (diag && diag.logPost) {
      diag.logPost('step_7_dashboard_target', { target });
    }
    window.location.href = target;
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
    const user = this.getUser();
    if (redirectIncompleteOnboarding(user)) return false;
    return true;
  },

  /**
   * End child session and open child picker (keeps known_children + parent session cookie).
   */
  async switchChildMember() {
    if (this._refreshPromise) {
      try { await this._refreshPromise; } catch { /* ignore */ }
    }
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }

    try {
      await this.ensureCsrfToken();
      const csrf = this.getCsrfToken();
      const headers = { 'Content-Type': 'application/json' };
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ switchChild: true }),
      });
      if (!res.ok) {
        console.warn('[AUTH] switchChild logout HTTP', res.status);
      }
    } catch (err) {
      console.warn('[AUTH] switchChild logout failed:', err.message);
    }

    this.clearAuth();
    try {
      localStorage.removeItem('stjarndag_selected_child');
      localStorage.removeItem('stjarndag_child');
      sessionStorage.removeItem('cl_selected_username');
      sessionStorage.removeItem('cl_add_child_pending');
      sessionStorage.removeItem('cl_add_child_next');
      sessionStorage.setItem('cl_force_picker', '1');
    } catch { /* ignore */ }

    if (window.DeviceMode && typeof DeviceMode.enterChild === 'function') {
      DeviceMode.enterChild();
    }

    window.location.replace('/child-login?picker=1');
  },

  _redirectAfterLogoutClear(childFlow) {
    this._fullClear();
    if (childFlow) {
      window.location.href = '/child-login';
      return;
    }
    if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
      DeviceMode.enterParent();
    }
    if (
      (typeof Platform !== 'undefined' && typeof Platform.isNative === 'function' && Platform.isNative()) ||
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
    ) {
      window.location.replace('/login');
    } else {
      window.location.replace('/');
    }
  },

  async logout(options) {
    options = options || {};
    const childFlow = options.childFlow === true;
    let expectedFamilyId = null;
    if (childFlow) {
      expectedFamilyId = await this._resolveExpectedFamilyIdForHandoff();
    }

    if (childFlow && window.DeviceMode) DeviceMode.enterChild();

    await this._persistAuthEntryLocaleContext();

    // Unregister native push token BEFORE hitting the logout API so the
    // correct user is associated with the token at time of deletion.
    // Fire-and-forget — logout must not stall on this.
    if (typeof window !== 'undefined' && typeof window.Platform !== 'undefined' && window.Platform.push) {
      window.Platform.push.unregister().catch(() => {});
    }

    // Keep barnväljare usable after vuxen logout — snapshot family children to device.
    await this.snapshotKnownChildrenBeforeLogout();

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
        if (res.status === 429) {
          this._showLogoutFailureMessage('rateLimit');
          return;
        }
        if (!res.ok && res.status >= 500) {
          this._showLogoutFailureMessage('server');
          return;
        }
        let data;
        try { data = await res.json(); } catch { data = {}; }

        if (res.ok && data.sessionRestored) {
          if (!expectedFamilyId) {
            this._logHandoffRestoreFailure('EXPECTED_FAMILY_ID_MISSING');
            this._showLogoutFailureMessage('contract');
            return;
          }
          const restored = await this._completeHandoffParentSessionRestore(expectedFamilyId);
          if (!restored.ok) {
            this._showLogoutFailureMessage(restored.kind === 'server' ? 'server' : 'contract');
          }
          return;
        }

        if (res.ok && data.needsParentPin) {
          if (!expectedFamilyId) {
            this._logHandoffRestoreFailure('EXPECTED_FAMILY_ID_MISSING');
            this._showLogoutFailureMessage('contract');
            return;
          }
          this._clearChildCookies();
          const cancelUrlPin = childFlow ? '/child-login' : '/login';
          this._showParentPinGateOverlay(function () {
            window.location.replace('/dashboard');
          }, function () {
            window.location.href = cancelUrlPin;
          }, {
            verifyUrl: '/api/family/verify-pin-picker',
            applyPickerResponse: true,
            deferPickerResponseApply: true,
            awaitSuccessBeforeClose: true,
            expectedFamilyId: expectedFamilyId,
          });
          return;
        }

        if (res.status === 409 && data.code === 'PARENT_HANDOFF_INVALID') {
          this._clearChildCookies();
          this._redirectToParentLoginAfterHandoffFailure();
          return;
        }

        if (!res.ok) {
          this._showLogoutFailureMessage('unknown');
          return;
        }

        if (data.loggedOut === true || data.handoffAvailable === false || data.message) {
          this._redirectAfterLogoutClear(childFlow);
          return;
        }

        this._showLogoutFailureMessage('contract');
        return;
      } catch {
        // Network error — break and fall through
        break;
      }
    }
    this._redirectAfterLogoutClear(childFlow);
  },

  /** Persist family locale for auth entry (login/register/child-login) after session ends. */
  async _persistAuthEntryLocaleContext() {
    const storageKey = (window.I18n && I18n.STORAGE_KEY) || 'sd_preferred_locale';
    try {
      // Always fetch fresh — Settings locale switch updates DB but stjarndag_user cache can lag.
      let me = null;
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) me = await res.json();
      } catch { /* ignore */ }
      if (!me) me = this.getUser();

      if (me && me.type === 'parent') {
        let locale = me.preferred_locale;
        if (window.I18n && typeof I18n.getCurrentLang === 'function') {
          const active = I18n.getCurrentLang();
          if (active) locale = active;
        }
        if (locale) {
          sessionStorage.setItem(storageKey, locale);
          try { localStorage.setItem(storageKey, locale); } catch { /* ignore */ }
          // Do not set sd_locale_explicit_choice here — that flag means the user
          // clicked the switcher on this login/register page. Logout only seeds the
          // login UI language; it must not override the next account's family locale.
        }
        if (typeof me.english_child_experience_enabled === 'boolean') {
          const flag = me.english_child_experience_enabled ? '1' : '0';
          sessionStorage.setItem('sd_english_child_experience', flag);
          try { localStorage.setItem('sd_english_child_experience', flag); } catch { /* ignore */ }
        }
        return;
      }
      if (me && me.type === 'child') {
        const locale = me.child_ui_locale || me.preferred_locale;
        if (locale) {
          sessionStorage.setItem(storageKey, locale);
          try { localStorage.setItem(storageKey, locale); } catch { /* ignore */ }
        }
        if (typeof me.english_child_experience_enabled === 'boolean') {
          const flag = me.english_child_experience_enabled ? '1' : '0';
          sessionStorage.setItem('sd_english_child_experience', flag);
          try { localStorage.setItem('sd_english_child_experience', flag); } catch { /* ignore */ }
        }
        if (me.child_ui_locale) {
          try {
            sessionStorage.setItem('sd_child_ui_locale', me.child_ui_locale);
            localStorage.setItem('sd_child_ui_locale', me.child_ui_locale);
          } catch { /* ignore */ }
        }
        return;
      }
      const current = window.I18n && typeof I18n.getCurrentLang === 'function'
        ? I18n.getCurrentLang()
        : null;
      if (current) {
        sessionStorage.setItem(storageKey, current);
        try { localStorage.setItem(storageKey, current); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  },

  /** @deprecated alias — use _persistAuthEntryLocaleContext */
  async _persistChildLoginHandoffContext() {
    return this._persistAuthEntryLocaleContext();
  },

  /**
   * Merge family children into stjarndag_known_children (device child-picker cache).
   * Preserves lastLoginAt for entries that already logged in on this device.
   */
  persistKnownChildrenFromSession(children, familyId) {
    if (!children || !children.length) return;
    try {
      const raw = localStorage.getItem(this.KNOWN_CHILDREN_KEY);
      let known = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(known)) known = [];

      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        if (!c || !c.username) continue;
        var entry = {
          username: c.username,
          name: c.name || c.username,
          emoji: c.emoji || '⭐',
          has_avatar: !!c.has_avatar,
          avatar_src: c.avatar_src || null,
          familyId: c.familyId || c.family_id || familyId || null,
        };
        const idx = known.findIndex(function (k) { return k.username === entry.username; });
        if (idx >= 0) {
          entry.lastLoginAt = known[idx].lastLoginAt || null;
          known[idx] = Object.assign({}, known[idx], entry);
        } else {
          known.unshift(entry);
        }
      }
      if (known.length > 10) known.splice(10);
      localStorage.setItem(this.KNOWN_CHILDREN_KEY, JSON.stringify(known));
    } catch { /* ignore */ }
  },

  /** Before parent logout: save child list so child picker works without session. */
  async snapshotKnownChildrenBeforeLogout() {
    try {
      const user = this.getUser();
      if (user && user.type === 'parent' && user.children && user.children.length) {
        this.persistKnownChildrenFromSession(user.children, user.familyId);
        return;
      }
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return;
      const me = await res.json();
      if (me.type === 'parent' && me.children && me.children.length) {
        this.persistKnownChildrenFromSession(me.children, me.familyId || me.family_id);
      }
    } catch { /* ignore */ }
  },

  /**
   * Full localStorage + cookie cleanup on logout.
   * Clears auth keys; keeps stjarndag_known_children so barn can log in after vuxen logout.
   */
  _fullClear() {
    this.clearAuth();
    if (typeof window !== 'undefined' && window.OfflineQueue && typeof window.OfflineQueue.clear === 'function') {
      window.OfflineQueue.clear().catch(() => {});
    }
    try {
      localStorage.removeItem('stjarndag_selected_child');
      localStorage.removeItem('stjarndag_theme');
    } catch {}
  },

  /**
   * Clear child-specific localStorage state (keep parent session if present).
   * Child tokens (httpOnly cookies) are revoked server-side.
   */
  _clearChildCookies: function () {
    if (typeof window !== 'undefined' && window.OfflineQueue && typeof window.OfflineQueue.clear === 'function') {
      window.OfflineQueue.clear().catch(() => {});
    }
    try {
      localStorage.removeItem('stjarndag_selected_child');
      localStorage.removeItem('stjarndag_theme');
    } catch {}
  },

  _logHandoffRestoreFailure(code) {
    const safe = String(code || 'HANDOFF_RESTORE_FAILED').replace(/[^\w_]/g, '').slice(0, 64);
    console.error('[AUTH] parent handoff restore:', safe);
  },

  async _fetchAuthMeForHandoff(requestTimeoutMs) {
    const timeoutMs = Math.max(
      1,
      Math.min(
        AUTH_ME_HANDOFF_REQUEST_TIMEOUT_MS,
        typeof requestTimeoutMs === 'number' ? requestTimeoutMs : AUTH_ME_HANDOFF_REQUEST_TIMEOUT_MS
      )
    );
    const controller = new AbortController();
    let abortTimer = null;
    abortTimer = window.setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) {
        return { ok: false, status: res.status, me: null };
      }
      const me = await res.json();
      return { ok: true, status: res.status, me };
    } catch (error) {
      const aborted = error && error.name === 'AbortError';
      return {
        ok: false,
        status: aborted ? 408 : 0,
        me: null,
        aborted,
        network: true,
      };
    } finally {
      if (abortTimer != null) {
        window.clearTimeout(abortTimer);
        abortTimer = null;
      }
    }
  },

  async _resolveExpectedFamilyIdForHandoff() {
    const user = this.getUser();
    if (user) {
      const fromUser = user.familyId || user.family_id || null;
      if (fromUser) return fromUser;
    }
    const fetched = await this._fetchAuthMeForHandoff();
    if (fetched.ok && fetched.me) {
      return fetched.me.familyId || fetched.me.family_id || null;
    }
    return null;
  },

  /**
   * Poll server until parent session cookies are active (post handoff PIN / consume).
   * @param {string} expectedFamilyId
   * @param {{ attempts?: number, delayMs?: number }} [options]
   * @returns {Promise<{ ok: true, user: object, familyId: string|null }|{ ok: false, kind: string, code?: string }>}
   */
  async _syncParentSessionFromServer(expectedFamilyId, options = {}) {
    if (!expectedFamilyId) {
      return { ok: false, kind: 'contract', code: 'EXPECTED_FAMILY_ID_MISSING' };
    }
    const delayMs = options.delayMs || AUTH_ME_HANDOFF_POLL_DELAY_MS;
    const maxAttempts = options.attempts || AUTH_ME_HANDOFF_POLL_ATTEMPTS;
    const deadlineAt = Date.now() + (options.totalTimeoutMs || AUTH_ME_HANDOFF_TOTAL_TIMEOUT_MS);
    let lastResult = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) {
        return {
          ok: false,
          kind: 'contract',
          code: 'AUTH_ME_HANDOFF_TOTAL_TIMEOUT',
        };
      }

      const requestTimeoutMs = Math.min(AUTH_ME_HANDOFF_REQUEST_TIMEOUT_MS, remainingMs);
      const fetched = await this._fetchAuthMeForHandoff(requestTimeoutMs);

      if (fetched.ok && fetched.me) {
        const me = fetched.me;
        const actualFamilyId = me.familyId || me.family_id || null;

        if (this.isParentUser(me) && actualFamilyId === expectedFamilyId) {
          this._clearStaleChildLocalState();
          await this.ensureCsrfToken();
          const csrf = this.getCsrfToken();
          const expMs = this._getExpiryMs();
          this.setAuth(null, me, csrf, expMs);
          if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
            DeviceMode.enterParent();
          }
          return {
            ok: true,
            user: me,
            familyId: actualFamilyId,
          };
        }

        if (this.isParentUser(me) && actualFamilyId !== expectedFamilyId) {
          return {
            ok: false,
            kind: 'contract',
            status: fetched.status,
            type: me.type,
            familyId: actualFamilyId,
            code: 'AUTH_ME_FAMILY_MISMATCH',
          };
        }

        lastResult = {
          ok: false,
          kind: 'contract',
          status: fetched.status,
          type: me.type,
          familyId: actualFamilyId,
          code: 'AUTH_ME_NOT_PARENT',
        };
      } else if (fetched.status === 401 || fetched.status === 403) {
        return {
          ok: false,
          kind: 'contract',
          status: fetched.status,
          code: 'AUTH_ME_HTTP_' + fetched.status,
        };
      } else if (fetched.status >= 500) {
        lastResult = {
          ok: false,
          kind: 'server',
          status: fetched.status,
          code: 'AUTH_ME_HTTP_' + fetched.status,
        };
      } else if (fetched.aborted || fetched.network) {
        lastResult = {
          ok: false,
          kind: 'contract',
          code: fetched.aborted ? 'AUTH_ME_ABORT' : 'AUTH_ME_NETWORK',
        };
      } else {
        lastResult = {
          ok: false,
          kind: 'contract',
          status: fetched.status,
          code: fetched.status ? 'AUTH_ME_HTTP_' + fetched.status : 'AUTH_ME_HTTP_UNKNOWN',
        };
      }

      const remainingAfter = deadlineAt - Date.now();
      if (remainingAfter <= 0) {
        return Object.assign(
          { ok: false, kind: lastResult.kind || 'contract', code: 'AUTH_ME_HANDOFF_TOTAL_TIMEOUT' },
          lastResult || {}
        );
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, remainingAfter)));
      }
    }

    if (!lastResult) {
      return { ok: false, kind: 'contract', code: 'AUTH_ME_NOT_PARENT_TIMEOUT' };
    }
    return Object.assign({ ok: false, kind: lastResult.kind || 'contract' }, lastResult);
  },

  async _finishParentHandoffRestoreThen(onReady, expectedFamilyId) {
    if (!expectedFamilyId) {
      return { ok: false, kind: 'contract', code: 'EXPECTED_FAMILY_ID_MISSING' };
    }
    if (this._parentHandoffRestorePromise) {
      return this._parentHandoffRestorePromise;
    }

    const self = this;
    let onReadyCalled = false;
    this._parentHandoffRestorePromise = (async function () {
      try {
        const result = await self._syncParentSessionFromServer(expectedFamilyId);
        if (!result.ok) {
          return result;
        }
        if (typeof onReady === 'function' && !onReadyCalled) {
          onReadyCalled = true;
          onReady(result.user);
        }
        return result;
      } finally {
        self._parentHandoffRestorePromise = null;
      }
    })();

    return this._parentHandoffRestorePromise;
  },

  /**
   * After child logout with handoff consume (no PIN): sync client to parent session
   * before leaving child device mode — SessionGate stays unchanged globally.
   */
  async _completeHandoffParentSessionRestore(expectedFamilyId) {
    return this._finishParentHandoffRestoreThen(function () {
      window.location.replace('/dashboard');
    }, expectedFamilyId);
  },

  _clearStaleChildLocalState() {
    this._clearChildCookies();
    try {
      localStorage.removeItem('stjarndag_child');
      sessionStorage.removeItem('cl_selected_username');
      sessionStorage.removeItem('cl_add_child_pending');
      sessionStorage.removeItem('cl_add_child_next');
      sessionStorage.removeItem('cl_force_picker');
      const keys = Object.keys(localStorage);
      for (let i = 0; i < keys.length; i += 1) {
        if (keys[i].indexOf('stjarndag_child_ui_view_') === 0) {
          localStorage.removeItem(keys[i]);
        }
      }
    } catch { /* ignore */ }
  },

  _localizedServerError() {
    if (window.I18n) {
      const text = I18n.t('auth.errors.serverError');
      if (text && text !== 'auth.errors.serverError') return text;
    }
    return '';
  },

  _showLogoutFailureMessage(kind) {
    var msg = '';
    if (window.I18n) {
      if (kind === 'rateLimit') {
        msg = I18n.t('auth.errors.logoutRateLimited');
      } else if (kind === 'server') {
        msg = I18n.t('auth.errors.serverError');
      } else {
        msg = I18n.t('auth.errors.logoutFailed');
      }
      if (msg && msg.indexOf('auth.errors.') !== 0) {
        if (typeof showToast === 'function') showToast(msg, 'error');
        else if (typeof window.alert === 'function') window.alert(msg);
      }
    }
  },

  _redirectToParentLoginAfterHandoffFailure() {
    if (window.I18n && typeof I18n.t === 'function') {
      const msg = I18n.t('auth.errors.handoffInvalid');
      if (msg && msg.indexOf('auth.errors.') !== 0 && typeof showToast === 'function') {
        showToast(msg, 'error');
      }
    }
    window.location.replace('/login');
  },

  /**
   * Show the parent PIN gate overlay after child logout.
   * Verifies PIN, stores gateToken on window._ppinGateToken, then calls onSuccess.
   */
  _showParentPinGateOverlay: function (onSuccess, onCancel, opts) {
    opts = opts || {};
    const verifyUrl = opts.verifyUrl || '/api/family/verify-pin';
    const applyPickerResponse = opts.applyPickerResponse === true;
    const deferPickerResponseApply = opts.deferPickerResponseApply === true;
    const awaitSuccessBeforeClose = opts.awaitSuccessBeforeClose === true;
    let overlayRestorePending = false;
    function pgT(key, params) {
      if (typeof window.childT === 'function') {
        const fromChild = childT(key, params);
        if (fromChild) return fromChild;
      }
      if (window.I18n) {
        const authKey = 'auth.' + key;
        const localized = I18n.t(authKey, params);
        if (localized && localized !== authKey) return localized;
      }
      return '';
    }

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
      '<h3 style="font-family:Outfit,sans-serif;font-weight:700;color:#1B2340;margin-bottom:4px;">' +
        pgT('parentGate.title') + '</h3>',
      '<p style="font-size:0.875rem;color:#5A6178;margin-bottom:20px;">' +
        pgT('parentGate.hint') + '</p>',
      '<div style="display:flex;justify-content:center;gap:12px;margin-bottom:20px;">',
        '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
        '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
        '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
        '<div class="ppgo-dot" style="width:16px;height:16px;border-radius:50%;background:#EDE7F6;"></div>',
      '</div>',
      '<div id="ppgo-keypad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;" role="group" aria-label="' +
        pgT('parentGate.keypadAria') + '"></div>',
      '<div id="ppgo-err" style="font-size:0.8rem;color:#ef4444;min-height:1.2em;margin-bottom:8px;"></div>',
      '<button id="ppgo-cancel" style="font-size:0.8rem;color:#5A6178;text-decoration:underline;background:none;border:none;cursor:pointer;padding:8px;">' +
        pgT('parentGate.cancel') + '</button>',
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

    function setOverlayRestorePending(pending) {
      overlayRestorePending = pending === true;
      const kbd = document.getElementById('ppgo-keypad');
      const cancelBtn = document.getElementById('ppgo-cancel');
      if (kbd) {
        kbd.querySelectorAll('button').forEach(function (btn) {
          btn.disabled = overlayRestorePending;
          btn.style.opacity = overlayRestorePending ? '0.45' : '';
          btn.style.pointerEvents = overlayRestorePending ? 'none' : '';
        });
      }
      if (cancelBtn) {
        cancelBtn.disabled = overlayRestorePending;
        cancelBtn.style.opacity = overlayRestorePending ? '0.45' : '';
      }
      if (overlayRestorePending) {
        msgEl.style.color = '#5A6178';
        msgEl.textContent = pgT('parentGate.restoringParentMode') || pgT('common.loading');
      }
    }

    function resetOverlayAfterHandoffFailure() {
      setOverlayRestorePending(false);
      entered = '';
      updateDots();
      buildKeypad();
      msgEl.style.color = '#ef4444';
      msgEl.textContent =
        pgT('errors.handoffRestoreFailed') ||
        pgT('errors.serverError');
    }

    function buildKeypad() {
      const kbd = document.getElementById('ppgo-keypad');
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
          if (overlayRestorePending) return;
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
      fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ pin: pin }),
      }).then(function (r) {
        if (r.status === 429) {
          msgEl.textContent = pgT('errors.logoutRateLimited') || pgT('errors.serverError');
          entered = '';
          updateDots();
          buildKeypad();
          return null;
        }
        if (!r.ok && r.status >= 500) {
          msgEl.textContent = pgT('errors.serverError');
          entered = '';
          updateDots();
          buildKeypad();
          return null;
        }
        return r.json().then(function (res) { return { httpOk: r.ok, httpStatus: r.status, body: res }; });
      }).then(function (wrapped) {
        if (!wrapped) return;
        var res = wrapped.body;
        if (!wrapped.httpOk) {
          if (res && res.code === 'PARENT_PIN_INVALID') {
            msgEl.textContent = pgT('errors.parentPinInvalid');
          } else if (res && res.code && res.code.indexOf('HANDOFF') !== -1) {
            document.body.removeChild(overlay);
            Auth._redirectToParentLoginAfterHandoffFailure();
            return;
          } else {
            msgEl.textContent = pgT('errors.serverError');
          }
          entered = '';
          updateDots();
          buildKeypad();
          return;
        }
        if (applyPickerResponse && res.ok && res.parent) {
          if (!deferPickerResponseApply) {
            Auth.setAuth(null, res.parent, res.csrfToken || csrf);
            if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
              DeviceMode.enterParent();
            }
            document.body.removeChild(overlay);
            onSuccess(res);
            return;
          }
          if (awaitSuccessBeforeClose) {
            setOverlayRestorePending(true);
            void (async function () {
              let handoffRestoreSucceeded = false;
              try {
                const restored = await Auth._finishParentHandoffRestoreThen(
                  onSuccess,
                  opts.expectedFamilyId
                );
                if (restored.ok) {
                  handoffRestoreSucceeded = true;
                  document.body.removeChild(overlay);
                  return;
                }
                Auth._logHandoffRestoreFailure(restored.code);
              } catch (_err) {
                Auth._logHandoffRestoreFailure('AUTH_HANDOFF_RESTORE_EXCEPTION');
              } finally {
                if (!handoffRestoreSucceeded) {
                  resetOverlayAfterHandoffFailure();
                }
              }
            })();
            return;
          }
          document.body.removeChild(overlay);
          void Auth._finishParentHandoffRestoreThen(onSuccess, opts.expectedFamilyId).then(function (restored) {
            if (!restored.ok) {
              Auth._logHandoffRestoreFailure(restored.code);
              Auth._showLogoutFailureMessage(restored.kind === 'server' ? 'server' : 'contract');
            }
          });
          return;
        }
        if (res.ok && res.gateToken) {
          window._ppinGateToken = res.gateToken;
          document.body.removeChild(overlay);
          onSuccess();
        } else {
          msgEl.textContent = pgT('errors.parentPinInvalid');
          entered = '';
          updateDots();
          buildKeypad();
        }
      }).catch(function () {
        msgEl.textContent = pgT('errors.serverError');
        entered = '';
        updateDots();
        buildKeypad();
      });
    }

    document.getElementById('ppgo-cancel').addEventListener('click', function () {
      if (overlayRestorePending) return;
      document.body.removeChild(overlay);
      onCancel();
    });

    buildKeypad();
    updateDots();
  },
};

window.Auth = Auth;

// Re-schedule refresh on page load (skip on native — defer until after first paint).
(function () {
  if (isNativeClient()) return;
  if (!Auth.isLoggedIn()) return;
  const expMs = Auth._getExpiryMs();
  if (expMs) {
    if (Date.now() < expMs) {
      Auth._scheduleRefresh(expMs);
    } else {
      Auth.silentRefresh();
    }
  }
})();

// Proactively fetch CSRF token on page load (skip on native safe mode).
(function () {
  if (!Auth.isLoggedIn()) return;
  if (isNativeClient()) return;
  Auth.ensureCsrfToken();
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
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  // Native read path: skip silentRefresh round-trip — authGuard already verified cookies.
  if (isNativeClient() && !isMutation) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, headers, credentials: 'include' });
  }

  await Auth._ensureFreshToken();

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

  const diag = typeof window !== 'undefined' ? window.AppleSignInDiagnostics : null;
  if (diag && diag.isPostLoginTraceActive && diag.isPostLoginTraceActive() && String(url).indexOf('/api/auth/me') !== -1) {
    diag.logPost('step_8b_auth_me_response', { status: res.status, ok: res.ok });
  }

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
function isOnboardingExemptPath() {
  const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
  if (path === '/onboarding' || path === '/login' || path === '/register') return true;
  if (path.startsWith('/child/') || path === '/child-login' || path === '/child-dashboard') return true;
  return false;
}

function redirectIncompleteOnboarding(user) {
  if (!user || user.is_admin || user.isAdmin) return false;
  if (user.onboarding_completed !== false) return false;
  if (isOnboardingExemptPath()) return false;
  window.location.href = '/onboarding';
  return true;
}

window.authGuard = async function() {
  const diag = typeof window !== 'undefined' ? window.AppleSignInDiagnostics : null;
  const stabilityLog = function (step, detail) {
    if (typeof window.androidStabilityLog === 'function') {
      window.androidStabilityLog(step, detail);
    }
  };
  try {
    let res;
    if (isNativeClient()) {
      stabilityLog('auth_me_fetch_start');
      const controller = new AbortController();
      const abortTimer = window.setTimeout(function () { controller.abort(); }, AUTH_ME_TIMEOUT_MS);
      try {
        res = await fetch('/api/auth/me', { credentials: 'include', signal: controller.signal });
      } finally {
        window.clearTimeout(abortTimer);
      }
      stabilityLog('auth_me_fetch_done', { status: res.status, ok: res.ok });
    } else {
      res = await window.apiFetch('/api/auth/me');
    }
    if (!res.ok) {
      stabilityLog('auth_me_failed', { status: res.status });
      if (diag && diag.traceLoginBounce) {
        diag.traceLoginBounce('auth_me_failed', { status: res.status, path: window.location.pathname });
      }
      // Only a genuine auth failure (401/403) should end the session. A
      // transient backend error (500/503) or a deploy restart must NOT log the
      // user out — otherwise a single hiccup bounces everyone to /login.
      if (res.status === 401 || res.status === 403) {
        Auth.clearAuth();
        window.location.href = '/login';
        return null;
      }
      return Auth.getUser();
    }
    const user = await res.json();
    stabilityLog('auth_me_json_ok', { type: user && user.type });
    if (user && user.type === 'parent') {
      const csrf = Auth.getCsrfToken();
      const expMs = Auth._getExpiryMs();
      Auth.setAuth(null, user, csrf, expMs);
    } else if (user && user.type === 'child') {
      Auth.setAuth(null, user);
      const restored = await Auth.tryActivateSavedParentSession();
      if (restored.ok && restored.user) {
        stabilityLog('auth_parent_restored_from_child', null);
        return restored.user;
      }
      if (restored.code === 'PARENT_PIN_REQUIRED') {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = '/login?parent=1&next=' + next;
        return null;
      }
      if (restored.code === 'NO_SAVED_PARENT_SESSION') {
        Auth.clearAuth();
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = '/login?next=' + next;
        return null;
      }
      Auth.clearAuth();
      window.location.href = '/login?parent=1&next=' + encodeURIComponent(window.location.pathname + window.location.search);
      return null;
    }
    if (redirectIncompleteOnboarding(user)) return null;
    return user;
  } catch (err) {
    const isTimeout = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
    stabilityLog(isTimeout ? 'auth_me_timeout' : 'auth_me_error', { message: err && err.message });
    if (diag && diag.traceLoginBounce) {
      diag.traceLoginBounce('auth_me_error', { message: err && err.message, path: window.location.pathname });
    }
    // Network error (offline, app resuming, server restarting) — keep the
    // session and let the page retry rather than forcing a logout.
    return Auth.getUser();
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