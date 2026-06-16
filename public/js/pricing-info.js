/**
 * pricing-info.js — founder program info page (Model A).
 */
(function () {
  'use strict';

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function render(data) {
    var limit = data.limit || 200;
    var count = data.count || 0;
    var remaining = typeof data.spots_remaining === 'number'
      ? data.spots_remaining
      : Math.max(0, limit - count);
    var price = data.price_sek || 59;
    var pct = Math.min(100, Math.round((Math.min(count, limit) / limit) * 100));

    setText('founderLimitLabel', String(limit));
    setText('founderLimitLabel2', String(limit));
    setText('priceLabel', String(price));
    setText('priceLabel2', String(price));

    var main = document.getElementById('counterMain');
    var sub = document.getElementById('counterSub');
    var bar = document.getElementById('counterBar');
    var openBlock = document.getElementById('founderOpenBlock');
    var closedBlock = document.getElementById('founderClosedBlock');

    if (remaining > 0) {
      if (main) main.textContent = count + ' / ' + limit + ' familjer har redan gått med';
      if (sub) sub.textContent = remaining + (remaining === 1 ? ' plats kvar' : ' platser kvar') + ' som grundarmedlem';
      if (openBlock) openBlock.classList.remove('hidden');
      if (closedBlock) closedBlock.classList.add('hidden');
    } else {
      if (main) main.textContent = 'Alla ' + limit + ' grundarplatser är tagna';
      if (sub) sub.textContent = 'Nya familjer erbjuds Premium ' + price + ' kr/månad';
      if (openBlock) openBlock.classList.add('hidden');
      if (closedBlock) closedBlock.classList.remove('hidden');
    }
    if (bar) bar.style.width = pct + '%';
  }

  fetch('/api/public/pricing-info')
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function () {
      render({ count: 0, limit: 200, spots_remaining: 200, price_sek: 59 });
    });
})();
