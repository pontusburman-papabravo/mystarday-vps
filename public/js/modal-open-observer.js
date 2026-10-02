/**
 * Owns body.modal-open while any blocking overlay is visible.
 * Canonical mark: data-overlay="modal" anywhere in the document.
 * Unmarked .fixed.inset-0 shells still count, so existing pages keep
 * hiding chrome on WebViews without :has(). data-overlay="toast" and
 * data-overlay="none" never block chrome.
 */
(function modalOpenObserverModule() {
  'use strict';

  if (typeof window !== 'undefined' && window.OverlayPolicy) return;

  function isConcealed(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    if (el.classList && el.classList.contains('hidden')) return true;
    if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) return true;
    return false;
  }

  function isBlocking(el) {
    if (!el || el.nodeType !== 1 || isConcealed(el)) return false;
    const kind = el.getAttribute('data-overlay');
    if (kind === 'none' || kind === 'toast' || kind === 'popover') return false;
    if (kind === 'modal') return true;
    return !!(el.classList && el.classList.contains('fixed') && el.classList.contains('inset-0'));
  }

  function candidates() {
    if (!document.body || typeof document.querySelectorAll !== 'function') return [];
    return document.querySelectorAll('[data-overlay], .fixed.inset-0');
  }

  function openCount() {
    const nodes = candidates();
    let n = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (isBlocking(nodes[i])) n += 1;
    }
    return n;
  }

  function sync() {
    if (!document.body) return 0;
    const n = openCount();
    const open = n > 0;
    if (document.body.classList.contains('modal-open') !== open) {
      document.body.classList.toggle('modal-open', open);
    }
    return n;
  }

  function syncKeyboardInset() {
    let inset = 0;
    const vv = window.visualViewport;
    if (vv && typeof window.innerHeight === 'number') {
      inset = Math.max(0, Math.round(window.innerHeight - vv.height - (vv.offsetTop || 0)));
    }
    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.setProperty('--overlay-keyboard-inset', inset + 'px');
    }
    return inset;
  }

  function start() {
    sync();
    syncKeyboardInset();
    if (!document.body || typeof MutationObserver !== 'function') return;
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style', 'aria-hidden', 'data-overlay'],
    });
    if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
      window.visualViewport.addEventListener('resize', syncKeyboardInset);
      window.visualViewport.addEventListener('scroll', syncKeyboardInset);
    }
    window.addEventListener('resize', syncKeyboardInset);
  }

  window.OverlayPolicy = {
    isBlocking: isBlocking,
    isConcealed: isConcealed,
    sync: sync,
    syncKeyboardInset: syncKeyboardInset,
    openCount: openCount,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
