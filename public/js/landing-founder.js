/**
 * Landing stats — live family count from /api/landing/stats.
 * Updates testimonials banner when count is available.
 */
(function () {
  'use strict';

  const statsBanner = document.getElementById('founderStatsBanner');

  function render(count) {
    if (!statsBanner || typeof count !== 'number' || count <= 0) return;
    const base = statsBanner.getAttribute('data-base') || 'Används redan av familjer i Sverige';
    const joinedSuffix = document.documentElement.lang === 'en' ? ' families have joined' : ' familjer har gått med';
    statsBanner.textContent = base + ' · ' + count + joinedSuffix;
  }

  fetch('/api/landing/stats')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d) return;
      render(d.count);
    })
    .catch(function () { /* static copy remains */ });
})();
