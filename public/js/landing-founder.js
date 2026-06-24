/**
 * Founder program — live stats from /api/landing/stats.
 * Updates hero badge, testimonials banner, grundarprogram block, and footer.
 */
(function () {
  'use strict';

  var limitEl = document.getElementById('founderLimitText');
  var limitEl2 = document.getElementById('founderLimitText2');
  var counterEl = document.getElementById('founderLiveCounter');
  var heroSpots = document.getElementById('founderHeroSpots');
  var statsBanner = document.getElementById('founderStatsBanner');
  var footerSpots = document.getElementById('founderFooterSpots');
  var footerLimit = document.getElementById('founderFooterLimit');

  function show(el, text) {
    if (!el || !text) return;
    el.textContent = text;
    el.hidden = false;
  }

  function render(limit, count, remaining) {
    var limitStr = limit ? String(limit) : '225';
    if (limitEl) limitEl.textContent = limitStr;
    if (limitEl2) limitEl2.textContent = limitStr;
    if (footerLimit) footerLimit.textContent = limitStr;

    if (typeof remaining === 'number' && remaining > 0) {
      var spotsLabel = remaining + (remaining === 1 ? ' plats kvar' : ' platser kvar') + ' i grundarprogrammet';
      show(heroSpots, '🎁 ' + spotsLabel);
      show(counterEl, spotsLabel);
      show(footerSpots, 'Grundarprogrammet: ' + spotsLabel + ' · Basic gratis');
    } else if (remaining === 0) {
      show(counterEl, 'Grundarprogrammet är fullt just nu');
      show(footerSpots, 'Grundarprogrammet är fullt just nu');
    } else if (typeof count === 'number' && count > 0) {
      show(counterEl, count + ' familjer har redan gått med');
    }

    if (statsBanner && typeof count === 'number' && count > 0) {
      var base = statsBanner.getAttribute('data-base') || 'Används redan av familjer i Sverige';
      statsBanner.textContent = base + ' · ' + count + ' familjer har gått med';
    }
  }

  fetch('/api/landing/stats')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d) return;
      render(d.limit || 225, d.count, d.spots_remaining);
    })
    .catch(function () { /* static copy remains */ });
})();
