/**
 * Founder program — optional live stats from /api/landing/stats.
 * Copy works without API; counter is enhancement only.
 */
(function () {
  'use strict';

  var limitEl = document.getElementById('founderLimitText');
  var limitEl2 = document.getElementById('founderLimitText2');
  var counterEl = document.getElementById('founderLiveCounter');

  function render(limit, count, remaining) {
    var limitStr = limit ? String(limit) : '200';
    if (limitEl) limitEl.textContent = limitStr;
    if (limitEl2) limitEl2.textContent = limitStr;
    if (!counterEl) return;
    if (typeof remaining === 'number' && remaining > 0) {
      counterEl.textContent = remaining + (remaining === 1 ? ' plats kvar' : ' platser kvar') + ' i grundarprogrammet';
      counterEl.hidden = false;
    } else if (typeof count === 'number' && count > 0) {
      counterEl.textContent = count + ' familjer har redan gått med';
      counterEl.hidden = false;
    }
  }

  fetch('/api/landing/stats')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d) return;
      render(d.limit || 200, d.count, d.spots_remaining);
    })
    .catch(function () { /* static copy remains */ });
})();
