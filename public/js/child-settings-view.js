/**
 * child-settings-view.js — Mitt-fliken: barnets val + vuxen-PIN där det behövs.
 */
(function () {
  'use strict';

  const CHILD_ACTIONS = [
    { id: 'dark_mode', label: 'Mörkt läge', hint: 'Ljus eller mörk bakgrund' },
    { id: 'logout', label: 'Logga ut', hint: 'Lämna din session på den här enheten' },
  ];

  const PARENT_ACTIONS = [
    { id: 'switch_child', label: 'Byt barn', hint: 'Kräver förälders PIN' },
  ];

  let _rendered = false;

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function headerKickerHtml() {
    const emojiEl = document.getElementById('childEmoji');
    const emoji = emojiEl && emojiEl.textContent ? emojiEl.textContent.trim() : '⭐';
    return '<span class="csv-avatar-kicker" aria-hidden="true">' + esc(emoji) + '</span>';
  }

  function darkModeStatusLabel() {
    if (window.Theme && typeof Theme.isDark === 'function') {
      return Theme.isDark() ? 'På' : 'Av';
    }
    return document.documentElement.classList.contains('dark') ? 'På' : 'Av';
  }

  function childActionsHtml() {
    return CHILD_ACTIONS.map(function (action) {
      const value = action.id === 'dark_mode' ? darkModeStatusLabel() : '';
      return (
        '<button type="button" class="csv-action-btn csv-action-btn-child" data-child-action="' + esc(action.id) + '">' +
          '<span class="csv-action-copy">' +
            '<span class="csv-action-label">' + esc(action.label) + '</span>' +
            (action.hint ? '<span class="csv-action-hint">' + esc(action.hint) + '</span>' : '') +
          '</span>' +
          (value
            ? '<span class="csv-action-value">' + esc(value) + '</span>'
            : '<span class="csv-action-chevron" aria-hidden="true">›</span>') +
        '</button>'
      );
    }).join('');
  }

  function parentActionsHtml() {
    return PARENT_ACTIONS.map(function (action) {
      return (
        '<button type="button" class="csv-action-btn csv-action-btn-parent" data-parent-action="' + esc(action.id) + '">' +
          '<span class="csv-action-copy">' +
            '<span class="csv-action-label">' + esc(action.label) + '</span>' +
            (action.hint ? '<span class="csv-action-hint">' + esc(action.hint) + '</span>' : '') +
          '</span>' +
          '<span class="csv-action-chevron" aria-hidden="true">›</span>' +
        '</button>'
      );
    }).join('');
  }

  function render() {
    const mount = document.getElementById('settingsViewMount');
    if (!mount) return;

    const customization = window.ChildCustomizationEntries
      ? ChildCustomizationEntries.renderAll()
      : '';

    mount.innerHTML =
      '<div class="csv-page">' +
        '<header class="csv-header">' +
          headerKickerHtml() +
          '<h1 class="csv-title">Mitt</h1>' +
          '<p class="csv-lead">Gör appen mer din — eller be en vuxen om hjälp med det som gäller hela familjen.</p>' +
        '</header>' +
        (customization
          ? '<section class="csv-section" aria-labelledby="csvLookHeading">' +
              '<h2 id="csvLookHeading" class="csv-section-title">Utseende</h2>' +
              '<div class="csv-customization">' + customization + '</div>' +
            '</section>'
          : '') +
        '<section class="csv-section" aria-labelledby="csvMineHeading">' +
          '<h2 id="csvMineHeading" class="csv-section-title">Mina val</h2>' +
          '<div class="csv-actions">' + childActionsHtml() + '</div>' +
        '</section>' +
        '<section class="csv-section csv-section-parent" aria-labelledby="csvParentHeading">' +
          '<h2 id="csvParentHeading" class="csv-section-title">För en vuxen</h2>' +
          '<p class="csv-section-hint">Kräver förälders PIN</p>' +
          '<div class="csv-actions">' + parentActionsHtml() + '</div>' +
        '</section>' +
      '</div>';

    if (window.ChildCustomizationEntries) {
      ChildCustomizationEntries.bindPickers(mount);
    }
    bindChildActions(mount);
    bindParentActions(mount);
    _rendered = true;
  }

  function runChildAction(actionId) {
    if (actionId === 'dark_mode' && typeof window.toggleChildDarkMode === 'function') {
      window.toggleChildDarkMode();
      const valueEl = document.querySelector('[data-child-action="dark_mode"] .csv-action-value');
      if (valueEl) valueEl.textContent = darkModeStatusLabel();
      return;
    }
    if (actionId === 'logout') {
      if (!window.confirm('Vill du logga ut?')) return;
      if (typeof window.childLogout === 'function') {
        window.childLogout();
      }
    }
  }

  function runParentAction(actionId) {
    if (actionId === 'switch_child' && typeof window.switchChildMember === 'function') {
      window.switchChildMember();
    }
  }

  function bindChildActions(root) {
    if (!root) return;
    root.querySelectorAll('[data-child-action]').forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        runChildAction(btn.getAttribute('data-child-action'));
      });
    });
  }

  function bindParentActions(root) {
    if (!root) return;
    root.querySelectorAll('[data-parent-action]').forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const actionId = btn.getAttribute('data-parent-action');
        const run = function () {
          runParentAction(actionId);
        };
        if (window.ParentalGate && ParentalGate.requireParentMode) {
          ParentalGate.requireParentMode(run);
        } else {
          run();
        }
      });
    });
  }

  function refresh(options) {
    options = options || {};
    if (!options.force && _rendered) {
      const mount = document.getElementById('settingsViewMount');
      if (mount && mount.childElementCount) return Promise.resolve();
    }
    render();
    return Promise.resolve();
  }

  function onCustomizationChange() {
    if (!_rendered) return;
    render();
  }

  document.addEventListener('child-activity-card-size-changed', onCustomizationChange);
  document.addEventListener('child-pictogram-pack-changed', onCustomizationChange);

  window.ChildSettingsView = {
    refresh: refresh,
    render: render,
  };
})();
