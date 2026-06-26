/**
 * child-collections.js — Samlingsrum (V2).
 */
(function () {
  'use strict';

  const RARITY_LABEL = { common: 'Vanlig', rare: 'Sällsynt', legendary: 'Legendarisk' };
  const RARITY_CLASS = { common: 'cu-r-common', rare: 'cu-r-rare', legendary: 'cu-r-legend' };

  function renderRoom(universe) {
    const owned = (universe.collectibles || []).map(function (c) { return c.slug; });
    const catalog = universe.catalog || [];

    let items = catalog.map(function (item) {
      const has = owned.indexOf(item.slug) >= 0;
      const cls = RARITY_CLASS[item.rarity] || 'cu-r-common';
      return '<div class="cu-col-item ' + cls + (has ? ' is-owned' : ' is-locked') + '">' +
        '<span class="cu-col-emoji">' + item.emoji + '</span>' +
        '<span class="cu-col-name">' + item.name + '</span>' +
        '<span class="cu-col-rarity">' + (has ? '✅' : (RARITY_LABEL[item.rarity] || '')) + '</span>' +
        (!has && item.star_cost ? '<span class="cu-col-cost">⭐ ' + item.star_cost + '</span>' : '') +
        '</div>';
    }).join('');

    if (!catalog.length) {
      items = '<p style="text-align:center;color:#9AA0B8;padding:24px;">Samla stjärnor och prestationer för att fylla din samling!</p>';
    }

    return '<div class="skatt-section">' +
      '<div class="skatt-section-header">' +
        '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#a29bfe,#6c5ce7);">🗂️</div>' +
        '<span class="skatt-section-title" style="color:#6c5ce7;">Min samling</span>' +
        '<span style="margin-left:auto;font-size:0.7rem;font-weight:700;background:#EDE7F6;color:#6c5ce7;border-radius:50px;padding:2px 10px;">' +
          owned.length + ' / ' + catalog.length + '</span>' +
      '</div>' +
      '<div class="skatt-section-body"><div class="cu-col-grid">' + items + '</div></div></div>';
  }

  window.ChildCollections = { renderRoom: renderRoom };
})();
