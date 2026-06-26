/**
 * parent-magic-bootstrap.js — Auto-init magic view from data-magic-page or URL path.
 */
(function () {
  'use strict';

  let _started = false;

  function boot() {
    if (_started || !window.ParentMagicShell) return;

    let page = document.body && document.body.getAttribute('data-magic-page');
    if (!page && window.ParentMagicAuto) {
      page = ParentMagicAuto.resolvePage();
    }
    if (!page) return;

    if (window.ParentMagicAuto) {
      ParentMagicAuto.prepareDom();
    }

    _started = true;
    ParentMagicShell.init(page).then(function () {
      if (window.ParentMagicPageBoot && ParentMagicPageBoot.run) {
        ParentMagicPageBoot.run(page);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
