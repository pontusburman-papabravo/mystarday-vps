/**
 * landing-dagens-nyhet.js — Positions marketing top chrome + dagens nyhet banner spacer.
 */
(function () {
  'use strict';

  var _ro = null;

  function chromeEl() {
    return document.getElementById('landingTopChrome');
  }

  function spacerEl() {
    return document.getElementById('dagensNyhetSpacer');
  }

  function bannerEl() {
    return document.getElementById('dagensNyhetBanner');
  }

  function syncChromeSpacer() {
    var chrome = chromeEl();
    var spacer = spacerEl();
    if (!chrome || !spacer) return;
    spacer.style.height = chrome.offsetHeight + 'px';
    var banner = bannerEl();
    document.body.classList.toggle(
      'landing-has-nyhet',
      !!(banner && banner.style.display !== 'none')
    );
  }

  function observeChrome() {
    var chrome = chromeEl();
    if (!chrome || typeof ResizeObserver === 'undefined') return;
    if (_ro) _ro.disconnect();
    _ro = new ResizeObserver(syncChromeSpacer);
    _ro.observe(chrome);
  }

  function showBanner(data) {
    var banner = bannerEl();
    if (!banner || !data) return;

    var title = document.getElementById('dagensNyhetTitle');
    var body = document.getElementById('dagensNyhetBody');
    var dateEl = document.getElementById('dagensNyhetDate');

    if (title) title.textContent = data.title || '';
    if (body) body.textContent = data.body || '';
    if (dateEl) {
      if (data.published_at) {
        var d = new Date(data.published_at);
        dateEl.textContent = isNaN(d.getTime())
          ? ''
          : d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      } else {
        dateEl.textContent = '';
      }
    }

    banner.style.display = 'block';
    requestAnimationFrame(function () {
      syncChromeSpacer();
      observeChrome();
    });
  }

  function hideBanner() {
    var banner = bannerEl();
    if (banner) banner.style.display = 'none';
    syncChromeSpacer();
  }

  function bind() {
    var closeBtn = document.getElementById('dagensNyhetClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideBanner);
    }
    window.addEventListener('resize', syncChromeSpacer);
    syncChromeSpacer();
    observeChrome();

    fetch('/api/dagens-nyhet/active')
      .then(function (r) { return r.status === 204 ? null : r.json(); })
      .then(function (data) {
        if (data) showBanner(data);
      })
      .catch(function () { /* non-critical */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
