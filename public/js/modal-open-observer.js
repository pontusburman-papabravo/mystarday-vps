/**
 * Toggles body.modal-open while any full-screen modal overlay
 * (direct body child with .fixed.inset-0, not .hidden) is visible.
 * Deterministic companion to the CSS :has() rules that hide the bottom
 * navs behind open modals — required for WebViews without :has() support.
 */
(function modalOpenObserverModule() {
  'use strict';

  function isOpenOverlay(el) {
    return el.nodeType === 1
      && el.classList.contains('fixed')
      && el.classList.contains('inset-0')
      && !el.classList.contains('hidden');
  }

  function sync() {
    const open = Array.from(document.body.children).some(isOpenOverlay);
    document.body.classList.toggle('modal-open', open);
  }

  function start() {
    sync();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // Only react to changes on body itself or its direct children
        if (m.target === document.body || m.target.parentElement === document.body) {
          sync();
          return;
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
