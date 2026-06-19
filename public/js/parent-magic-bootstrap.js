/**
 * parent-magic-bootstrap.js — Auto-init magic view from data-magic-page on <body>.
 * Pages with manual ParentMagicShell.init() (dashboard, schedule, …) omit the attribute.
 */
(function () {
  'use strict';

  var _started = false;

  function boot() {
    if (_started) return;
    var page = document.body && document.body.getAttribute('data-magic-page');
    if (!page || !window.ParentMagicShell) return;
    _started = true;
    ParentMagicShell.init(page);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
