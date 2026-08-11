/**
 * adult-privilege.js — Fas 3A central privilege state (locked → unlocking → active | expired | revoked).
 * Server-valid parent JWT required for parent API; UI unlock alone never grants authority.
 */
(function () {
  'use strict';

  const FLAG_CACHE_KEY = 'stjarndag_adult_privilege_v1';
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

  function runPinGate() {
    if (window.AdultPinGateUI && typeof window.AdultPinGateUI.collectAdultPin === 'function') {
      return window.AdultPinGateUI.collectAdultPin();
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

  function applyUnlockSuccess(body) {
    if (body.csrfToken && window.Auth && typeof window.Auth.setCsrfToken === 'function') {
      window.Auth.setCsrfToken(body.csrfToken);
    }
    return verifyParentAuthority().then(function (verified) {
      if (!verified) {
        setState(STATES.LOCKED);
        track('adult_privilege_unlock_failed');
        return { ok: false, code: 'ADULT_PRIVILEGE_VERIFY_FAILED' };
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
      return { ok: true, parent: body.parent };
    });
  }

  function postUnlock(unlockMethod, pin) {
    const payload = { unlockMethod: unlockMethod || 'biometric' };
    if (unlockMethod === 'pin' && pin) payload.pin = pin;
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

  /**
   * Escalate child → parent: biometric (native) then server unlock + /me verify.
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

    const usePin = opts.unlockMethod === 'pin' || opts.preferPin === true;
    const skipBiometric = opts.skipBiometric === true || usePin;

    let gatePromise;
    if (usePin) {
      gatePromise = runPinGate().then(function (pinResult) {
        if (!pinResult.ok || !pinResult.pin) {
          return Promise.reject(new Error(pinResult.code || 'PIN_CANCEL'));
        }
        return postUnlock('pin', pinResult.pin);
      });
    } else {
      const bioPromise = skipBiometric ? Promise.resolve() : runBiometricGate();
      gatePromise = bioPromise
        .then(function () {
          return postUnlock('biometric');
        })
        .catch(function (err) {
          const msg = err && err.message ? String(err.message) : '';
          if (msg.indexOf('BIOMETRIC_UNAVAILABLE') !== -1 && !opts.preferPin) {
            return runPinGate().then(function (pinResult) {
              if (!pinResult.ok || !pinResult.pin) {
                return Promise.reject(new Error(pinResult.code || 'PIN_CANCEL'));
              }
              return postUnlock('pin', pinResult.pin);
            });
          }
          return Promise.reject(err);
        });
    }

    return gatePromise
      .catch(function (err) {
        const msg = err && err.message ? String(err.message) : String(err || '');
        if (msg.indexOf('BIOMETRIC_CANCEL') !== -1 || msg.indexOf('PIN_CANCEL') !== -1) {
          setState(STATES.LOCKED);
          track('adult_privilege_unlock_failed');
          return { ok: false, code: msg.indexOf('PIN') !== -1 ? 'PIN_CANCEL' : 'BIOMETRIC_CANCEL' };
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

  window.AdultPrivilege = {
    STATES: STATES,
    getState: getState,
    isFeatureEnabled: isFeatureEnabled,
    isPrivilegeActive: isPrivilegeActive,
    refreshStatus: refreshStatus,
    requestEscalation: requestEscalation,
    expirePrivilegeIfDue: expirePrivilegeIfDue,
    resetToLocked: resetToLocked,
    initFromSession: initFromSession,
  };
})();
