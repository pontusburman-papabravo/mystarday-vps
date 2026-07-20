/**
 * parent-nav-icons.js — Back-compat alias; icons live in icon-system.js.
 */
(function () {
  'use strict';
  if (window.ParentNavIcons || !window.IconSystem) return;
  window.ParentNavIcons = {
    notiser: IconSystem.header('notiser'),
    settings: IconSystem.header('installningar'),
    tipsa: IconSystem.header('tipsa'),
    share: IconSystem.header('tipsa'),
    renderNotiser: function (active) {
      return IconSystem.header('notiser', undefined, active);
    },
  };
})();
