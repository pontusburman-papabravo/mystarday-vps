/**
 * widget-bridge-bootstrap.js — wire WidgetBridge to auth, SSE, completion, revoke (R4.5c).
 */
(function (global) {
  'use strict';

  function onLogout() {
    if (global.WidgetBridgeProvision && typeof WidgetBridgeProvision.invalidateBindingIntents === 'function') {
      WidgetBridgeProvision.invalidateBindingIntents();
    }
    if (global.WidgetBridgeClient) {
      WidgetBridgeClient.clearBindings().then(function () {
        return WidgetBridgeClient.refreshAll();
      });
    }
  }

  function onCompletion() {
    if (global.WidgetBridgeClient) {
      WidgetBridgeClient.refreshAll();
    }
  }

  function onSessionReady() {
    if (global.WidgetBridgeProvision) {
      WidgetBridgeProvision.syncBinding().catch(function () {});
    }
    if (global.WidgetInstallPrompt) {
      setTimeout(function () {
        WidgetInstallPrompt.tryShow().catch(function () {});
      }, 1200);
    }
  }

  function installAuthHooks() {
    if (global.Auth && typeof Auth.setAuth === 'function' && !Auth.setAuth.__widgetBridgePatched) {
      const orig = Auth.setAuth.bind(Auth);
      Auth.setAuth = function (token, user, csrfToken, expMs) {
        const out = orig(token, user, csrfToken, expMs);
        if (user) {
          setTimeout(onSessionReady, 0);
        }
        return out;
      };
      Auth.setAuth.__widgetBridgePatched = true;
    }

    if (global.Auth && typeof Auth._fullClear === 'function' && !Auth._fullClear.__widgetBridgePatched) {
      const origClear = Auth._fullClear.bind(Auth);
      Auth._fullClear = function () {
        onLogout();
        return origClear();
      };
      Auth._fullClear.__widgetBridgePatched = true;
    }
  }

  global.addEventListener('stjarndag:auth-logout', onLogout);
  global.addEventListener('sse:DAILY_LOG_ITEM_COMPLETED', onCompletion);
  global.addEventListener('stjarndag:widget-privacy-changed', function () {
    if (global.WidgetBridgeClient) {
      WidgetBridgeClient.refreshAll();
    }
  });

  installAuthHooks();
  if (global.document) {
    global.document.addEventListener('DOMContentLoaded', installAuthHooks);
  }

  global.WidgetBridgeBootstrap = {
    onLogout: onLogout,
    onCompletion: onCompletion,
    onSessionReady: onSessionReady,
    onChildChanged: function (childId) {
      if (global.WidgetBridgeClient) {
        WidgetBridgeClient.refreshAll();
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
