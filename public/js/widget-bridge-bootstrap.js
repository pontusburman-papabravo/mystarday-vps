/**
 * widget-bridge-bootstrap.js — wire WidgetBridge to auth, SSE, completion, revoke (R4.5c).
 */
(function (global) {
  'use strict';

  function onLogout() {
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
  }

  global.addEventListener('stjarndag:auth-logout', onLogout);
  global.addEventListener('sse:DAILY_LOG_ITEM_COMPLETED', onCompletion);
  global.addEventListener('stjarndag:widget-refresh', onCompletion);

  if (global.Auth && typeof Auth.setAuth === 'function') {
    var orig = Auth.setAuth.bind(Auth);
    Auth.setAuth = function (token, user, csrfToken, expMs) {
      var out = orig(token, user, csrfToken, expMs);
      if (user) {
        setTimeout(onSessionReady, 0);
      }
      return out;
    };
  }

  if (global.Auth && typeof Auth._fullClear === 'function') {
    var origClear = Auth._fullClear.bind(Auth);
    Auth._fullClear = function () {
      onLogout();
      return origClear();
    };
  }

  global.WidgetBridgeBootstrap = {
    onLogout: onLogout,
    onCompletion: onCompletion,
    onSessionReady: onSessionReady,
    onChildChanged: function (childId) {
      if (global.WidgetBridgeProvision && childId) {
        WidgetBridgeProvision.switchBinding(childId).catch(function () {
          if (global.WidgetBridgeClient) {
            WidgetBridgeClient.notifyChildChangedAndRefresh(childId);
          }
        });
      } else if (global.WidgetBridgeClient) {
        WidgetBridgeClient.notifyChildChangedAndRefresh(childId);
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
