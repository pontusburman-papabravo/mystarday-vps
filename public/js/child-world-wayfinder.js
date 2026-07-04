/**
 * child-world-wayfinder.js — Tydlig plats + textknappar för Min värld (inte osynliga hotspots).
 * POS: 04 barn tydlighet, 00A morgonstress, 15B 44pt touch.
 */
(function () {
  'use strict';

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * @param {object} config
   * @param {string} config.placeLabel — "Trädgården"
   * @param {string} [config.placeIcon]
   * @param {{ label?: string, short?: string }} [config.back]
   * @param {Array<{id:string,label:string,short?:string,icon?:string,primary?:boolean,disabled?:boolean}>} [config.actions]
   */
  function render(config) {
    const cfg = config || {};
    const back = cfg.back;
    const backHtml = back
      ? '<button type="button" class="cww-back" data-cww-action="back"' +
          ' aria-label="' + esc(back.label || 'Tillbaka') + '">' +
          '<span class="cww-back-arrow" aria-hidden="true">←</span>' +
          '<span class="cww-back-label">' + esc(back.short || back.label || 'Tillbaka') + '</span>' +
        '</button>'
      : '<div class="cww-back cww-back--spacer" aria-hidden="true"></div>';

    const actions = cfg.actions || [];
    const actionsHtml = actions.map(function (action) {
      const cls = 'cww-action'
        + (action.primary ? ' cww-action--primary' : '')
        + (action.disabled ? ' is-disabled' : '');
      const label = action.short || action.label;
      return '<button type="button" class="' + cls + '" data-cww-action="' + esc(action.id) + '"' +
        (action.disabled ? ' disabled' : '') +
        ' aria-label="' + esc(action.label) + '">' +
        (action.icon
          ? '<span class="cww-action-icon" aria-hidden="true">' + esc(action.icon) + '</span>'
          : '') +
        '<span class="cww-action-label">' + esc(label) + '</span>' +
      '</button>';
    }).join('');

    return '<div class="cww-chrome" data-cww-place="' + esc(cfg.placeId || '') + '">' +
      '<header class="cww-place-bar">' +
        backHtml +
        '<p class="cww-place-title">' +
          (cfg.placeIcon ? '<span class="cww-place-icon" aria-hidden="true">' + esc(cfg.placeIcon) + '</span>' : '') +
          '<span class="cww-place-text">' + esc(cfg.placeLabel || '') + '</span>' +
        '</p>' +
      '</header>' +
      (actionsHtml
        ? '<nav class="cww-actions" aria-label="Vad vill du göra?">' + actionsHtml + '</nav>'
        : '') +
    '</div>';
  }

  /**
   * @param {Array<object>} slots — memory hall exhibits
   */
  function renderMemoryPanel(slots) {
    const items = (slots || []).slice(0, 8);
    if (!items.length) {
      return '<div class="cww-memory-panel cww-memory-panel--empty" role="region" aria-label="Mina minnen">' +
        '<p class="cww-memory-empty">Här hamnar minnen när du gör saker du är stolt över.</p>' +
      '</div>';
    }

    const cards = items.map(function (slot) {
      const emoji = (slot.content && slot.content.emoji) ? slot.content.emoji : '✨';
      const title = (slot.content && slot.content.title) || slot.label_sv || 'Minne';
      const message = slot._tapMessage || '';
      return '<button type="button" class="cww-memory-card" data-memory-slot="' + esc(slot.slot_id || '') + '"' +
        ' data-memory-message="' + esc(message) + '"' +
        ' aria-label="' + esc(title) + '">' +
        '<span class="cww-memory-emoji" aria-hidden="true">' + esc(emoji) + '</span>' +
        '<span class="cww-memory-title">' + esc(title) + '</span>' +
      '</button>';
    }).join('');

    return '<div class="cww-memory-panel" role="region" aria-label="Mina minnen">' +
      '<p class="cww-memory-heading">Tryck på ett minne</p>' +
      '<div class="cww-memory-scroll">' + cards + '</div>' +
    '</div>';
  }

  function bind(root, handlers) {
    if (!root || !handlers) return;
    root.querySelectorAll('[data-cww-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled || btn.classList.contains('is-disabled')) return;
        const id = btn.getAttribute('data-cww-action');
        if (id === 'back') {
          if (typeof handlers.onBack === 'function') handlers.onBack(btn);
          return;
        }
        if (typeof handlers.onAction === 'function') handlers.onAction(id, btn);
      });
    });
  }

  function bindMemoryPanel(root, onTap) {
    if (!root || typeof onTap !== 'function') return;
    root.querySelectorAll('.cww-memory-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onTap(btn.getAttribute('data-memory-message') || '', btn);
      });
    });
  }

  function setActivePlace(documentRoot, placeId) {
    if (!documentRoot || !documentRoot.body || !documentRoot.body.classList) return;
    documentRoot.body.classList.add('child-wayfinder-active');
    if (typeof documentRoot.body.setAttribute === 'function') {
      documentRoot.body.setAttribute('data-cww-place', placeId || '');
    }
  }

  function clearActivePlace(documentRoot) {
    if (!documentRoot || !documentRoot.body || !documentRoot.body.classList) return;
    documentRoot.body.classList.remove('child-wayfinder-active');
    if (typeof documentRoot.body.removeAttribute === 'function') {
      documentRoot.body.removeAttribute('data-cww-place');
    }
  }

  window.ChildWorldWayfinder = {
    render: render,
    renderMemoryPanel: renderMemoryPanel,
    bind: bind,
    bindMemoryPanel: bindMemoryPanel,
    setActivePlace: setActivePlace,
    clearActivePlace: clearActivePlace,
  };
})();
