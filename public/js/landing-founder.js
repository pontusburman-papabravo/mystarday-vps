/**
 * Founder program — live stats from /api/landing/stats.
 * Updates limit copy and testimonials banner family count.
 */
(function () {
  'use strict';

  const limitEl = document.getElementById('founderLimitText');
  const limitEl2 = document.getElementById('founderLimitText2');
  const statsBanner = document.getElementById('founderStatsBanner');
  const footerLimit = document.getElementById('founderFooterLimit');

  function render(limit, count) {
    const limitStr = limit ? String(limit) : '225';
    if (limitEl) limitEl.textContent = limitStr;
    if (limitEl2) limitEl2.textContent = limitStr;
    if (footerLimit) footerLimit.textContent = limitStr;

    if (statsBanner && typeof count === 'number' && count > 0) {
      const base = statsBanner.getAttribute('data-base') || 'Används redan av familjer i Sverige';
      const joinedSuffix = document.documentElement.lang === 'en' ? ' families have joined' : ' familjer har gått med';
      statsBanner.textContent = base + ' · ' + count + joinedSuffix;
    }
  }

  fetch('/api/landing/stats')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d) return;
      render(d.limit || 225, d.count);
    })
    .catch(function () { /* static copy remains */ });
})();
