/**
 * adult-privilege.js — Fas 3A central privilege state (locked → unlocking → active | expired | revoked).
 * Server-valid parent JWT required for parent API; UI unlock alone never grants authority.
 */
(function () {
  'use strict';

  const FLAG_CACHE_KEY = 'stjarndag_adult_privilege_v1';
  const PIN_REQUIRED_KEY = 'stjarndag_entry_pin_required_for_parents';
  const DAILY_UX_KEY = 'stjarndag_family_device_daily_ux_v1';
  const ORCH_ACTIVE_KEY = 'stjarndag_family_device_entry_v1';
  const STATES = {
    LOCKED: 'locked',
    UNLOCKING: 'unlocking',
    ACTIVE: 'active',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
  };

  let state = STATES.LOCKED;
  let unlockInFlight = false;
  let featureEnabled = false;
  let expiresAtMs = null;
  let privilegeLeaseUntilMs = null;
  let devicePolicy = null;
  let expireInFlight = false;

  function track(eventType) {
    if (!window.analytics || typeof window.analytics.track !== 'function') return;
    try {
      window.analytics.track(eventType, {});
    } catch (_) { /* ignore */ }
  }

  function setState(next) {
    state = next;
    if (next === STATES.EXPIRED) track('adult_privilege_expired');
  }

  function getState() {
    return state;
  }

  function isFeatureEnabled() {
    return featureEnabled === true;
  }

  function isPrivilegeActive() {
    return state === STATES.ACTIVE;
  }

  function fetchJson(url, options) {
    const opts = options || {};
    opts.credentials = 'same-origin';
    opts.headers = opts.headers || {};
    if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    if (window.Auth && typeof window.Auth.getCsrfToken === 'function') {
      const csrf = window.Auth.getCsrfToken();
      if (csrf) opts.headers['X-CSRF-Token'] = csrf;
    }
    const doFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : fetch;
    return doFetch(url, opts).then(function (res) {
      return res.text().then(function (text) {
        let body = {};
        try {
          body = text ? JSON.parse(text) : {};
        } catch (_) {
          body = {};
        }
        return { res: res, body: body };
      });
    });
  }

  function refreshStatus() {
    return fetchJson('/api/family/adult-privilege/status', { method: 'GET' })
      .then(function (out) {
        if (out.res.status === 403 && out.body.code === 'ADULT_PRIVILEGE_DISABLED') {
          featureEnabled = false;
          try {
            sessionStorage.removeItem(FLAG_CACHE_KEY);
          } catch (_) { /* ignore */ }
          setState(STATES.LOCKED);
          return { ok: false, disabled: true };
        }
        if (!out.res.ok || !out.body.ok) {
          return { ok: false, body: out.body };
        }
        featureEnabled = true;
        try {
          sessionStorage.setItem(FLAG_CACHE_KEY, '1');
        } catch (_) { /* ignore */ }
        if (out.body.privilegeActive || out.body.state === STATES.ACTIVE) {
          setState(STATES.ACTIVE);
          expiresAtMs = out.body.expiresAt || null;
          privilegeLeaseUntilMs = out.body.privilegeLeaseUntil || out.body.expiresAt || null;
          devicePolicy = out.body.policy || devicePolicy;
        } else if (out.body.state === STATES.EXPIRED) {
          setState(STATES.EXPIRED);
        } else if (out.body.state === STATES.REVOKED) {
          setState(STATES.REVOKED);
        } else {
          setState(STATES.LOCKED);
        }
        if (out.body.policy) {
          devicePolicy = out.body.policy;
          if (window.AdultPrivilegeLifecycle) {
            AdultPrivilegeLifecycle.onPolicyUpdate(devicePolicy, privilegeLeaseUntilMs);
          }
        }
        return { ok: true, body: out.body };
      })
      .catch(function () {
        return { ok: false, network: true };
      });
  }

  function verifyParentAuthority() {
    return fetchJson('/api/auth/me', { method: 'GET' }).then(function (out) {
      if (!out.res.ok || !out.body || out.body.type !== 'parent') {
        return false;
      }
      return true;
    }).catch(function () {
      return false;
    });
  }

  function runPinGate(gateOpts) {
    const opts = gateOpts || { allowBackupLogin: true, backupNext: '/home' };
    if (window.AdultPinGateUI && typeof window.AdultPinGateUI.collectAdultPin === 'function') {
      return window.AdultPinGateUI.collectAdultPin(opts);
    }
    return Promise.resolve({ ok: false, code: 'PIN_UI_UNAVAILABLE' });
  }

  function expirePrivilegeIfDue(reason) {
    if (expireInFlight) return Promise.resolve({ ok: false, code: 'EXPIRE_IN_FLIGHT' });
    if (!featureEnabled) return Promise.resolve({ ok: false, code: 'DISABLED' });
    if (devicePolicy && window.AdultPrivilegeLeasePolicy
      && !AdultPrivilegeLeasePolicy.shouldAutoExpireOnBackground(devicePolicy.deviceMode)
      && reason === 'background') {
      return Promise.resolve({ ok: true, noop: true });
    }
    if (state !== STATES.ACTIVE && reason !== 'lease_timer') {
      return Promise.resolve({ ok: false, code: 'NOT_ACTIVE' });
    }
    if (privilegeLeaseUntilMs && Date.now() < privilegeLeaseUntilMs && reason === 'lease_timer') {
      return Promise.resolve({ ok: false, code: 'LEASE_STILL_VALID' });
    }
    expireInFlight = true;
    return fetchJson('/api/family/adult-privilege/expire', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'policy' }),
    })
      .then(function (out) {
        if (out.body && out.body.noop) {
          return { ok: true, noop: true };
        }
        if (!out.res.ok || !out.body.ok) {
          return { ok: false, code: out.body.code || 'EXPIRE_FAILED' };
        }
        if (out.body.csrfToken && window.Auth && typeof window.Auth.setCsrfToken === 'function') {
          window.Auth.setCsrfToken(out.body.csrfToken);
        }
        setState(STATES.LOCKED);
        privilegeLeaseUntilMs = null;
        expiresAtMs = null;
        if (window.AdultPrivilegeLifecycle) AdultPrivilegeLifecycle.onPrivilegeCleared();
        if (window.DeviceMode && typeof DeviceMode.enterChild === 'function') {
          DeviceMode.enterChild();
        }
        track('adult_privilege_expired');
        return { ok: true, child: out.body.child };
      })
      .catch(function () {
        return { ok: false, code: 'NETWORK' };
      })
      .finally(function () {
        expireInFlight = false;
      });
  }

  function runBiometricGate() {
    if (!window.AdultBiometricClient) {
      return Promise.reject(new Error('BIOMETRIC_UNAVAILABLE'));
    }
    return window.AdultBiometricClient.isAvailable().then(function (avail) {
      if (!avail || !avail.available) {
        return Promise.reject(new Error('BIOMETRIC_UNAVAILABLE'));
      }
      return window.AdultBiometricClient.authenticate({ reason: 'Lås upp vuxenläge' });
    });
  }

  function verifyParentAuthorityWithRetry(attemptsLeft) {
    return verifyParentAuthority().then(function (verified) {
      if (verified) return true;
      if (attemptsLeft <= 1) return false;
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(verifyParentAuthorityWithRetry(attemptsLeft - 1));
        }, 100);
      });
    });
  }

  function hydrateParentFromBody(body) {
    const parentUser = body && (body.parent || body.user);
    const auth = window.Auth;
    if (!parentUser || !auth) return;
    if (body.csrfToken && typeof auth.setCsrfToken === 'function') {
      auth.setCsrfToken(body.csrfToken);
    }
    if (typeof auth.setAuth === 'function') {
      auth.setAuth(null, parentUser, auth.getCsrfToken && auth.getCsrfToken());
    }
  }

  function applyUnlockSuccess(body) {
    hydrateParentFromBody(body);
    const parentUser = body && (body.parent || body.user);
    return verifyParentAuthorityWithRetry(4).then(function (verified) {
      if (!verified && !parentUser) {
        setState(STATES.LOCKED);
        track('adult_privilege_unlock_failed');
        return { ok: false, code: 'ADULT_PRIVILEGE_VERIFY_FAILED' };
      }
      if (!verified && parentUser) {
        hydrateParentFromBody(body);
      }
      setState(STATES.ACTIVE);
      expiresAtMs = body.expiresAt || null;
      privilegeLeaseUntilMs = body.privilegeLeaseUntil || body.expiresAt || null;
      devicePolicy = body.policy || devicePolicy;
      if (window.DeviceMode && typeof DeviceMode.enterParent === 'function') {
        DeviceMode.enterParent();
      }
      if (window.AdultPrivilegeLifecycle) {
        AdultPrivilegeLifecycle.onPrivilegeActivated(devicePolicy, privilegeLeaseUntilMs);
      }
      track('adult_privilege_unlock_success');
      return { ok: true, parent: parentUser || body.parent };
    });
  }

  function postUnlock(pin) {
    const payload = { unlockMethod: 'pin', pin: pin };
    return fetchJson('/api/family/adult-privilege/unlock', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(function (out) {
      if (!out.res.ok || !out.body.ok) {
        const code = out.body.code || 'ADULT_PRIVILEGE_UNLOCK_FAILED';
        if (code === 'PARENT_HANDOFF_EXPIRED') setState(STATES.EXPIRED);
        else if (code === 'PARENT_HANDOFF_INVALID' || code === 'PARENT_HANDOFF_USED') {
          setState(STATES.REVOKED);
        } else {
          setState(STATES.LOCKED);
        }
        track('adult_privilege_unlock_failed');
        return { ok: false, code: code, status: out.res.status };
      }
      return applyUnlockSuccess(out.body);
    });
  }

  function storePickerPinMeta(body) {
    if (!body || typeof body !== 'object') return;
    try {
      if (typeof body.pinRequiredForParents === 'boolean') {
        sessionStorage.setItem(PIN_REQUIRED_KEY, body.pinRequiredForParents ? '1' : '0');
      }
      if (body.dailyUxActive === true) {
        sessionStorage.setItem(DAILY_UX_KEY, '1');
      }
      if (body.orchestratorActive === true) {
        sessionStorage.setItem(ORCH_ACTIVE_KEY, '1');
      }
    } catch (_) { /* ignore */ }
  }

  function isPickerPinConfigured() {
    try {
      return sessionStorage.getItem(PIN_REQUIRED_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function ensurePickerPinMeta() {
    return fetchJson('/api/auth/app-entry', { method: 'GET' }).then(function (out) {
      if (out.body) storePickerPinMeta(out.body);
      return { ok: out.res.ok, body: out.body };
    }).catch(function () {
      return { ok: false };
    });
  }

  function runPickerPinGateOrRejectSetup() {
    return ensurePickerPinMeta().then(function () {
      if (!isPickerPinConfigured()) {
        return Promise.reject(new Error('ADULT_PIN_SETUP_REQUIRED'));
      }
      return runPinGate({ allowBackupLogin: true, backupNext: '/home' });
    }).then(function (pinResult) {
      if (!pinResult.ok || !pinResult.pin) {
        return Promise.reject(new Error(pinResult.code || 'PIN_CANCEL'));
      }
      return pinResult.pin;
    });
  }

  function runPinGateOrRejectSetup() {
    return refreshStatus().then(function (statusResult) {
      if (statusResult.body && statusResult.body.pinRequiredForUnlock === false) {
        return Promise.reject(new Error('ADULT_PIN_SETUP_REQUIRED'));
      }
      const backupNext = (typeof window !== 'undefined' && window.location)
        ? window.location.pathname + window.location.search
        : '/home';
      return runPinGate({ allowBackupLogin: true, backupNext: backupNext });
    }).then(function (pinResult) {
      if (!pinResult.ok || !pinResult.pin) {
        return Promise.reject(new Error(pinResult.code || 'PIN_CANCEL'));
      }
      return pinResult.pin;
    });
  }

  /**
   * Escalate child → parent: adult PIN gate then server unlock + /me verify.
   * @returns {Promise<{ok:boolean, parent?:object, code?:string}>}
   */
  function requestEscalation(options) {
    const opts = options || {};
    if (!featureEnabled) {
      return refreshStatus().then(function () {
        if (!featureEnabled) {
          return { ok: false, code: 'ADULT_PRIVILEGE_DISABLED' };
        }
        return requestEscalation(opts);
      });
    }
    if (state === STATES.ACTIVE) {
      return verifyParentAuthority().then(function (ok) {
        if (ok) return { ok: true, alreadyActive: true };
        setState(STATES.LOCKED);
        return requestEscalation(opts);
      });
    }
    if (unlockInFlight) {
      return Promise.resolve({ ok: false, code: 'ADULT_PRIVILEGE_IN_FLIGHT' });
    }

    unlockInFlight = true;
    setState(STATES.UNLOCKING);
    track('adult_privilege_unlock_started');

    const gatePromise = runPinGateOrRejectSetup().then(function (pin) {
      return postUnlock(pin);
    });

    return gatePromise
      .catch(function (err) {
        const msg = err && err.message ? String(err.message) : String(err || '');
        if (msg.indexOf('PIN_CANCEL') !== -1) {
          setState(STATES.LOCKED);
          track('adult_privilege_unlock_failed');
          return { ok: false, code: 'PIN_CANCEL' };
        }
        if (msg.indexOf('ADULT_PIN_SETUP_REQUIRED') !== -1) {
          setState(STATES.LOCKED);
          track('adult_privilege_unlock_failed');
          return { ok: false, code: 'ADULT_PIN_SETUP_REQUIRED' };
        }
        setState(STATES.LOCKED);
        track('adult_privilege_unlock_failed');
        return { ok: false, code: 'ADULT_PRIVILEGE_NETWORK', error: msg };
      })
      .finally(function () {
        unlockInFlight = false;
      });
  }

  function resetToLocked() {
    setState(STATES.LOCKED);
    expiresAtMs = null;
    privilegeLeaseUntilMs = null;
    if (window.AdultPrivilegeLifecycle) AdultPrivilegeLifecycle.onPrivilegeCleared();
  }

  function initFromSession() {
    try {
      if (sessionStorage.getItem(FLAG_CACHE_KEY) !== '1') return Promise.resolve();
    } catch (_) {
      return Promise.resolve();
    }
    if (window.AdultPrivilegeLifecycle) AdultPrivilegeLifecycle.start();
    return refreshStatus();
  }

  function postSelectParent(pin, parentId) {
    const payload = {
      parent_id: parentId,
      unlock_method: 'pin',
      pin: pin,
    };
    return fetchJson('/api/auth/trusted-device/select-parent', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(function (out) {
      if (!out.res.ok || !out.body.ok) {
        const code = out.body.code || 'TRUSTED_SELECT_PARENT_FAILED';
        setState(STATES.LOCKED);
        track('adult_privilege_unlock_failed');
        return { ok: false, code: code, status: out.res.status };
      }
      if (out.body.csrfToken && window.Auth && typeof window.Auth.setCsrfToken === 'function') {
        window.Auth.setCsrfToken(out.body.csrfToken);
      }
      return applyUnlockSuccess({
        csrfToken: out.body.csrfToken,
        parent: out.body.user || out.body.parent,
        expiresAt: out.body.privilegeLeaseUntil,
        privilegeLeaseUntil: out.body.privilegeLeaseUntil,
        policy: out.body.policy,
      }).then(function (result) {
        if (result.ok) {
          return {
            ok: true,
            parent: result.parent,
            redirect: out.body.redirect || '/home',
          };
        }
        return result;
      });
    });
  }

  /**
   * Netflix picker → adult profile: adult PIN gate (server-verifiable).
   * @returns {Promise<{ok:boolean, parent?:object, redirect?:string, code?:string}>}
   */
  function requestTrustedProfileUnlock(options) {
    const opts = options || {};
    const parentId = opts.parentId;
    if (!parentId) {
      return Promise.resolve({ ok: false, code: 'PARENT_ID_REQUIRED' });
    }
    if (unlockInFlight) {
      return Promise.resolve({ ok: false, code: 'ADULT_PRIVILEGE_IN_FLIGHT' });
    }

    unlockInFlight = true;
    setState(STATES.UNLOCKING);
    track('adult_privilege_unlock_started');

    const gatePromise = runPickerPinGateOrRejectSetup().then(function (pin) {
      return postSelectParent(pin, parentId);
    });

    return gatePromise
      .catch(function (err) {
        const msg = err && err.message ? String(err.message) : String(err || '');
        if (msg.indexOf('PIN_CANCEL') !== -1) {
          setState(STATES.LOCKED);
          track('adult_privilege_unlock_failed');
          return { ok: false, code: 'PIN_CANCEL' };
        }
        if (msg.indexOf('ADULT_PIN_SETUP_REQUIRED') !== -1) {
          setState(STATES.LOCKED);
          track('adult_privilege_unlock_failed');
          return { ok: false, code: 'ADULT_PIN_SETUP_REQUIRED' };
        }
        setState(STATES.LOCKED);
        track('adult_privilege_unlock_failed');
        return { ok: false, code: 'ADULT_PRIVILEGE_NETWORK', error: msg };
      })
      .finally(function () {
        unlockInFlight = false;
      });
  }

  window.AdultPrivilege = {
    STATES: STATES,
    getState: getState,
    isFeatureEnabled: isFeatureEnabled,
    isPrivilegeActive: isPrivilegeActive,
    refreshStatus: refreshStatus,
    requestEscalation: requestEscalation,
    requestTrustedProfileUnlock: requestTrustedProfileUnlock,
    storePickerPinMeta: storePickerPinMeta,
    expirePrivilegeIfDue: expirePrivilegeIfDue,
    resetToLocked: resetToLocked,
    initFromSession: initFromSession,
  };
})();
