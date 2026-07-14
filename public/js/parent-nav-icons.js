/**
 * parent-nav-icons.js — Header chrome icons (Notiser, Inställningar, Tipsa).
 * Assets: public/img/parent-header/*.svg
 */
(function () {
  'use strict';

  const BASE = '/img/parent-header/';

  function img(name, alt) {
    return (
      '<img src="' + BASE + name + '.svg" class="parent-hub-icon-img" width="28" height="28" alt="' + (alt || '') + '" decoding="async">'
    );
  }

  const NOTISER = img('notiser', '');
  const SETTINGS = img('installningar', '');
  const TIPSA = img('tipsa', '');

  window.ParentNavIcons = {
    notiser: NOTISER,
    settings: SETTINGS,
    tipsa: TIPSA,
    share: TIPSA,
  };
})();
