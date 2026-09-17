/**
 * Shared Sign in with Apple client session helpers.
 * SIWA-INVARIANT-1: never discard a successful Authentication Services credential.
 * Tokens stay in process memory only — never URL, localStorage, or sessionStorage.
 */
(function appleAuthSessionModule() {
  'use strict';

  let _pending = null;

  function t(key, fallback) {
    try {
      if (window.authT) {
        const fromAuth = window.authT(key);
        if (fromAuth && fromAuth !== key) return fromAuth;
      }
      if (window.I18n && typeof window.I18n.tOrLiteral === 'function') {
        return window.I18n.tOrLiteral(key, fallback);
      }
      if (window.I18n && typeof window.I18n.t === 'function') {
        const fromI18n = window.I18n.t(key);
        if (fromI18n && fromI18n !== key) return fromI18n;
        if (typeof window.I18n.literalFallback === 'function') {
          return window.I18n.literalFallback(key, fallback);
        }
      }
    } catch (_) { /* keep fallback */ }
    if (window.I18n && typeof window.I18n.literalFallback === 'function') {
      return window.I18n.literalFallback(key, fallback);
    }
    return fallback || key;
  }

  function readName(result) {
    if (!result || typeof result !== 'object') return null;
    if (typeof result.name === 'string' && result.name.trim()) return result.name.trim();
    const given = result.givenName || result.firstName || '';
    const family = result.familyName || result.lastName || '';
    const combined = (String(given) + ' ' + String(family)).trim();
    return combined || null;
  }

  function fromAuthorizeResult(result) {
    if (!result || typeof result !== 'object') return null;
    if (!result.idToken || typeof result.idToken !== 'string') return null;
    return {
      idToken: result.idToken,
      authorizationCode: typeof result.authorizationCode === 'string' ? result.authorizationCode : null,
      name: readName(result),
      givenName: result.givenName || result.firstName || null,
      familyName: result.familyName || result.lastName || null,
    };
  }

  function remember(credential) {
    if (!credential || !credential.idToken) return;
    _pending = {
      idToken: credential.idToken,
      authorizationCode: credential.authorizationCode || null,
      name: credential.name || null,
      givenName: credential.givenName || null,
      familyName: credential.familyName || null,
    };
  }

  function current() {
    return _pending;
  }

  function clear() {
    _pending = null;
  }

  function isCompletionRequired(status, data) {
    return status === 409 && data && data.code === 'APPLE_ACCOUNT_COMPLETION_REQUIRED';
  }

  function isEmailConflict(status, data) {
    return status === 409 && data && (data.error === 'email_conflict' || data.code === 'email_conflict');
  }

  function buildRequestBody(credential, extra) {
    let body = {
      idToken: credential.idToken,
      name: credential.name || undefined,
      firstName: credential.givenName || undefined,
      lastName: credential.familyName || undefined,
      authorizationCode: credential.authorizationCode || undefined,
      apple_client: (window.Platform && typeof Platform.isNative === 'function' && Platform.isNative())
        ? 'native'
        : 'web',
    };
    if (window.OAuthRegistrationPayload && typeof OAuthRegistrationPayload.withOAuthRegistrationFields === 'function') {
      body = OAuthRegistrationPayload.withOAuthRegistrationFields(body);
    } else if (window.LoginLocale && typeof LoginLocale.withLoginLocale === 'function') {
      body = LoginLocale.withLoginLocale(body);
    }
    extra = extra || {};
    Object.keys(extra).forEach(function (key) {
      if (extra[key] !== undefined) body[key] = extra[key];
    });
    return body;
  }

  function applyAuthenticatedSession(data) {
    if (!data || !data.user) return false;
    if (window.Auth && typeof Auth.setAuth === 'function') {
      Auth.setAuth(null, data.user, data.csrfToken, data.expiresAt);
    }
    clear();
    return true;
  }

  function redirectAfterAppleAuth(data) {
    if (!data || !data.user) return;
    if (data.user.onboarding_completed === false) {
      window.location.href = '/onboarding';
      return;
    }
    if (window.Auth && typeof Auth.redirectToDashboard === 'function') {
      Auth.redirectToDashboard();
      return;
    }
    window.location.href = '/home';
  }

  function cancelledMessage() {
    return t('auth.login.apple.cancelled', 'Avbröts');
  }

  function incompleteMessage() {
    return t('auth.login.apple.incomplete', 'Apple-inloggningen kunde inte slutföras');
  }

  window.AppleAuthSession = {
    fromAuthorizeResult: fromAuthorizeResult,
    remember: remember,
    current: current,
    clear: clear,
    isCompletionRequired: isCompletionRequired,
    isEmailConflict: isEmailConflict,
    buildRequestBody: buildRequestBody,
    applyAuthenticatedSession: applyAuthenticatedSession,
    redirectAfterAppleAuth: redirectAfterAppleAuth,
    cancelledMessage: cancelledMessage,
    incompleteMessage: incompleteMessage,
  };
})();
