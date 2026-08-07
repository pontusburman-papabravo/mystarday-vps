/**
 * widget-deep-link-focus.js — open Today from native widget with signed focus token (R4.5g).
 */
(function (global) {
  'use strict';

  function parseFocus() {
    var params = new URLSearchParams(global.location.search);
    return {
      token: params.get('widget_focus'),
      panel: params.get('panel'),
    };
  }

  function applyAfterLoad() {
    var focus = parseFocus();
    if (!focus.token) return;
    global.__widgetFocusToken = focus.token;
    global.__widgetFocusPanel = focus.panel;
    if (focus.panel === 'substeps' && typeof global.subStepExpanded === 'object') {
      // expanded when item id is resolved after loadDay
      global.__widgetExpandSubsteps = true;
    }
    if (focus.panel === 'timer') {
      global.__widgetOpenTimerPanel = true;
    }
  }

  global.addEventListener('DOMContentLoaded', applyAfterLoad);

  global.WidgetDeepLinkFocus = {
    consumeForItem: function (itemId) {
      if (!global.__widgetFocusToken || !itemId) return false;
      var token = global.__widgetFocusToken;
      global.__widgetFocusToken = null;
      if (global.__widgetExpandSubsteps) {
        global.subStepExpanded = global.subStepExpanded || {};
        global.subStepExpanded[itemId] = true;
        global.__widgetExpandSubsteps = false;
      }
      if (global.__widgetOpenTimerPanel && global.ChildActivityTimer && typeof ChildActivityTimer.openForItem === 'function') {
        ChildActivityTimer.openForItem(itemId);
        global.__widgetOpenTimerPanel = false;
      }
      return true;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
