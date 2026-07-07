/**
 * Founder program — live stats from /api/landing/stats.
 * Updates hero badge, testimonials banner, grundarprogram block, and footer.
 */
(function () {
  'use strict';

  const limitEl = document.getElementById('founderLimitText');
  const limitEl2 = document.getElementById('founderLimitText2');
  const counterEl = document.getElementById('founderLiveCounter');
  const heroSpots = document.getElementById('founderHeroSpots');
  const statsBanner = document.getElementById('founderStatsBanner');
  const footerSpots = document.getElementById('founderFooterSpots');
  const footerLimit = document.getElementById('founderFooterLimit');
  const trustChipLimit = document.getElementById('founderTrustChip');

  function show(el, text) {
    if (!el || !text) return;
    el.textContent = text;
    el.hidden = false;
  }

  function hide(el) {
    if (!el) return;
    el.hidden = true;
  }

  function render(limit, count, remaining, unlimited) {
    const isUnlimited = unlimited || limit == null;

    if (isUnlimited) {
      hide(limitEl);
      hide(limitEl2);
      hide(footerLimit);
      if (trustChipLimit) {
        trustChipLimit.textContent = 'Gratis just nu för grundarmedlemmar';
        trustChipLimit.hidden = false;
      }
      show(heroSpots, '🎁 Gratis just nu — bli grundarmedlem');
      show(counterEl, 'Gratis just nu för nya grundarmedlemmar');
      show(footerSpots, 'Grundarprogrammet: Basic gratis just nu');
    } else {
      const limitStr = String(limit);
      if (limitEl) {
        limitEl.textContent = limitStr;
        limitEl.hidden = false;
      }
      if (limitEl2) {
        limitEl2.textContent = limitStr;
        limitEl2.hidden = false;
      }
      if (footerLimit) {
        footerLimit.textContent = limitStr;
        footerLimit.hidden = false;
      }

      if (typeof remaining === 'number' && remaining > 0) {
        const spotsLabel = remaining + (remaining === 1 ? ' plats kvar' : ' platser kvar') + ' i grundarprogrammet';
        show(heroSpots, '🎁 ' + spotsLabel);
        show(counterEl, spotsLabel);
        show(footerSpots, 'Grundarprogrammet: ' + spotsLabel + ' · Basic gratis');
      } else if (remaining === 0) {
        show(counterEl, 'Grundarprogrammet är fullt just nu');
        show(footerSpots, 'Grundarprogrammet är fullt just nu');
      } else if (typeof count === 'number' && count > 0) {
        show(counterEl, count + ' familjer har redan gått med');
      }
    }

    if (statsBanner && typeof count === 'number' && count > 0) {
      const base = statsBanner.getAttribute('data-base') || 'Används redan av familjer i Sverige';
      statsBanner.textContent = base + ' · ' + count + ' familjer har gått med';
    }
  }

  fetch('/api/landing/stats')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d) return;
      render(d.limit, d.count, d.spots_remaining, d.unlimited);
    })
    .catch(function () { /* static copy remains */ });
})();
