/**
 * child-settings-view.js — Mitt-fliken: barnets val + vuxen-PIN där det behövs.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  const CHILD_ACTIONS = [
    { id: 'dark_mode', labelKey: 'settings.darkMode', hintKey: 'settings.darkModeHint' },
    { id: 'logout', labelKey: 'settings.logout', hintKey: 'settings.logoutHint' },
  ];

  const PARENT_ACTIONS = [
    { id: 'adult_unlock', labelKey: 'settings.adultUnlock', hintKey: 'settings.adultUnlockHint', dailyUxOnly: true },
    { id: 'switch_child', labelKey: 'settings.switchChild', hintKey: 'settings.switchChildHint' },
  ];

  let _rendered = false;

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function isDailyUxActive() {
    return window.ChildTrustedChrome && ChildTrustedChrome.isDailyUxActive
      ? ChildTrustedChrome.isDailyUxActive()
      : false;
  }

  function getAllowedChildCount() {
    if (!isDailyUxActive()) return 0;
    if (window.ChildTrustedChrome && ChildTrustedChrome.getAllowedChildCount) {
      return ChildTrustedChrome.getAllowedChildCount();
    }
    return 0;
  }

  function isDailyUxMultiChild() {
    return isDailyUxActive() && getAllowedChildCount() > 1;
  }

  function headerKickerHtml() {
    const emojiEl = document.getElementById('childEmoji');
    const emoji = emojiEl && emojiEl.textContent ? emojiEl.textContent.trim() : '⭐';
    return '<span class="csv-avatar-kicker" aria-hidden="true">' + esc(emoji) + '</span>';
  }

  function darkModeStatusLabel() {
    if (window.Theme && typeof Theme.isDark === 'function') {
      return Theme.isDark() ? t('common.on') : t('common.off');
    }
    return document.documentElement.classList.contains('dark') ? t('common.on') : t('common.off');
  }

  function childActionsHtml() {
    const actions = CHILD_ACTIONS.filter(function (action) {
      if (action.id === 'logout' && isDailyUxActive()) {
        return false;
      }
      return true;
    });
    return actions.map(function (action) {
      const value = action.id === 'dark_mode' ? darkModeStatusLabel() : '';
      const label = t(action.labelKey);
      const hint = t(action.hintKey);
      return (
        '<button type="button" class="csv-action-btn csv-action-btn-child" data-child-action="' + esc(action.id) + '">' +
          '<span class="csv-action-copy">' +
            '<span class="csv-action-label">' + esc(label) + '</span>' +
            (hint ? '<span class="csv-action-hint">' + esc(hint) + '</span>' : '') +
          '</span>' +
          (value
            ? '<span class="csv-action-value">' + esc(value) + '</span>'
            : '<span class="csv-action-chevron" aria-hidden="true">›</span>') +
        '</button>'
      );
    }).join('');
  }

  function parentActionsHtml() {
    const dailyUx = isDailyUxActive();
    const allowed = getAllowedChildCount();
    const actions = PARENT_ACTIONS.filter(function (action) {
      if (action.dailyUxOnly && !dailyUx) return false;
      if (action.id === 'switch_child' && dailyUx && allowed <= 1) return false;
      return true;
    });
    return actions.map(function (action) {
      const label = t(action.labelKey);
      let hint = t(action.hintKey);
      if (action.id === 'switch_child' && isDailyUxMultiChild()) {
        hint = t('settings.switchChildDailyHint');
      }
      return (
        '<button type="button" class="csv-action-btn csv-action-btn-parent" data-parent-action="' + esc(action.id) + '">' +
          '<span class="csv-action-copy">' +
            '<span class="csv-action-label">' + esc(label) + '</span>' +
            (hint ? '<span class="csv-action-hint">' + esc(hint) + '</span>' : '') +
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
          '<h1 class="csv-title">' + esc(t('settings.title')) + '</h1>' +
          '<p class="csv-lead">' + esc(t('settings.lead')) + '</p>' +
        '</header>' +
        (customization
          ? '<section class="csv-section" aria-labelledby="csvLookHeading">' +
              '<h2 id="csvLookHeading" class="csv-section-title">' + esc(t('settings.sectionLook')) + '</h2>' +
              '<div class="csv-customization">' + customization + '</div>' +
            '</section>'
          : '') +
        '<section class="csv-section" aria-labelledby="csvMineHeading">' +
          '<h2 id="csvMineHeading" class="csv-section-title">' + esc(t('settings.sectionMine')) + '</h2>' +
          '<div class="csv-actions">' + childActionsHtml() + '</div>' +
        '</section>' +
        '<section class="csv-section csv-section-parent" aria-labelledby="csvParentHeading">' +
          '<h2 id="csvParentHeading" class="csv-section-title">' + esc(t('settings.forAdult')) + '</h2>' +
          '<p class="csv-section-hint">' + esc(t('settings.adultPinHint')) + '</p>' +
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
      if (!window.confirm(t('settings.logoutConfirm'))) return;
      if (typeof window.childLogout === 'function') {
        window.childLogout();
      }
    }
  }

  function navigateAfterAdultUnlock() {
    window.location.href = '/home';
  }

  function runAdultUnlock() {
    if (!window.AdultPrivilege || typeof AdultPrivilege.requestEscalation !== 'function') {
      if (window.ParentalGate && ParentalGate.show) {
        ParentalGate.show(navigateAfterAdultUnlock);
      }
      return;
    }
    AdultPrivilege.requestEscalation().then(function (result) {
      if (result && result.ok) {
        navigateAfterAdultUnlock();
      }
    });
  }

  function runParentAction(actionId) {
    if (actionId === 'adult_unlock') {
      runAdultUnlock();
      return;
    }
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
        if (actionId === 'switch_child' && isDailyUxMultiChild()) {
          run();
          return;
        }
        if (actionId === 'adult_unlock') {
          run();
          return;
        }
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
