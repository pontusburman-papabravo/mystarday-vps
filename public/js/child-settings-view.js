/**
 * child-settings-view.js — Mitt-fliken: utseende + föräldergärdade val (PIN).
 */
(function () {
  'use strict';

  let _rendered = false;

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function parentActionsHtml() {
    if (!window.ChildCapabilities || !ChildCapabilities.CHILD_SYSTEM_ACTIONS) return '';
    return ChildCapabilities.CHILD_SYSTEM_ACTIONS.map(function (action) {
      return (
        '<button type="button" class="csv-action-btn" data-parent-action="' + esc(action.id) + '">' +
          '<span class="csv-action-label">' + esc(action.label) + '</span>' +
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
          '<p class="csv-kicker" aria-hidden="true">⚙️</p>' +
          '<h1 class="csv-title">Mitt</h1>' +
          '<p class="csv-lead">Här kan du göra appen mer din — eller be en vuxen om hjälp.</p>' +
        '</header>' +
        (customization
          ? '<section class="csv-section" aria-labelledby="csvLookHeading">' +
              '<h2 id="csvLookHeading" class="csv-section-title">Utseende</h2>' +
              '<div class="csv-customization">' + customization + '</div>' +
            '</section>'
          : '') +
        '<section class="csv-section csv-section-parent" aria-labelledby="csvParentHeading">' +
          '<h2 id="csvParentHeading" class="csv-section-title">För en vuxen</h2>' +
          '<p class="csv-section-hint">Kräver förälders PIN</p>' +
          '<div class="csv-actions">' + parentActionsHtml() + '</div>' +
        '</section>' +
      '</div>';

    if (window.ChildCustomizationEntries) {
      ChildCustomizationEntries.bindPickers(mount);
    }
    bindParentActions(mount);
    _rendered = true;
  }

  function runParentAction(actionId) {
    if (actionId === 'switch_child' && typeof window.switchChildMember === 'function') {
      window.switchChildMember();
      return;
    }
    if (actionId === 'dark_mode' && typeof window.toggleChildDarkMode === 'function') {
      window.toggleChildDarkMode();
      return;
    }
    if (actionId === 'logout' && typeof window.childLogout === 'function') {
      window.childLogout();
    }
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
