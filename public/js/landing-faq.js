/**
 * Landing FAQ accordion — short version on homepage, full list on /faq.
 */
(function () {
  'use strict';

  function trackFaq(slug) {
    if (window.LandingEvents && typeof LandingEvents.track === 'function') {
      LandingEvents.track('faq_expand_' + slug);
    }
  }

  document.querySelectorAll('.faq-item').forEach(function (item) {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    const slug = item.getAttribute('data-faq') || 'unknown';

    btn.addEventListener('click', function () {
      const wasOpen = item.classList.contains('is-open');
      document.querySelectorAll('.faq-item.is-open').forEach(function (openItem) {
        openItem.classList.remove('is-open');
        const b = openItem.querySelector('.faq-question');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        trackFaq(slug);
      }
    });
  });
})();
