/**
 * child-theme-picker.js — Barnets temaväljare (Min samling, gate ON).
 * Preview → confirm. Persists child_view_config.visual_theme only.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  const BACKDROP_ID = 'childThemePickerBackdrop';
  const PANEL_ID = 'childThemePickerPanel';
  let _shellReady = false;
  let _previousFocus = null;
  let _previousBodyOverflow = null;

  const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const state = {
    open: false,
    childId: null,
    childSnapshot: null,
    savedThemeId: 'adventure',
    previewThemeId: 'adventure',
    saving: false,
    error: null,
  };

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function isGateOn() {
    return !!(window.ChildTheme && ChildTheme.isSamlingGateOn && ChildTheme.isSamlingGateOn());
  }

  function themes() {
    return window.ChildTheme && ChildTheme.listThemes ? ChildTheme.listThemes() : [];
  }

  function ensureShell() {
    if (_shellReady) return;
    _shellReady = true;

    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'ctp-backdrop';
    backdrop.addEventListener('click', cancel);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'ctp-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'childThemePickerTitle');
    panel.innerHTML =
      '<header class="ctp-header">' +
        '<h2 id="childThemePickerTitle" class="ctp-title">' + t('settings.themePickerTitle') + '</h2>' +
        '<button type="button" class="ctp-close" id="childThemePickerClose" aria-label="' + t('common.close') + '">×</button>' +
      '</header>' +
      '<p class="ctp-lead">' + t('settings.themePickerLead') + '</p>' +
      '<div class="ctp-grid-wrap">' +
        '<div class="ctp-grid" id="childThemePickerGrid" role="radiogroup" aria-label="' + t('settings.theme') + '"></div>' +
      '</div>' +
      '<footer class="ctp-footer">' +
        '<p class="ctp-status" id="childThemePickerStatus" aria-live="polite"></p>' +
        '<div class="ctp-actions">' +
          '<button type="button" class="ctp-btn ctp-btn--ghost" id="childThemePickerCancel">' + t('common.cancel') + '</button>' +
          '<button type="button" class="ctp-btn ctp-btn--primary" id="childThemePickerSave">' + t('settings.themePickerUse') + '</button>' +
        '</div>' +
      '</footer>';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    panel.querySelector('#childThemePickerClose').addEventListener('click', cancel);
    panel.querySelector('#childThemePickerCancel').addEventListener('click', cancel);
    panel.querySelector('#childThemePickerSave').addEventListener('click', confirmSave);

    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
        return;
      }
      if (e.key === 'Tab') trapFocus(e, panel);
    });
  }

  function getFocusableElements(panel) {
    if (!panel) return [];
    return Array.prototype.filter.call(
      panel.querySelectorAll(FOCUSABLE_SELECTOR),
      function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      }
    );
  }

  function trapFocus(e, panel) {
    const focusable = getFocusableElements(panel);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !panel.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last || !panel.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  }

  function focusInitial(panel) {
    const selected = panel.querySelector('.ctp-theme-card.is-selected');
    const firstCard = panel.querySelector('.ctp-theme-card');
    const closeBtn = panel.querySelector('#childThemePickerClose');
    const target = selected || firstCard || closeBtn;
    if (target && typeof target.focus === 'function') target.focus();
  }

  function lockBodyScroll() {
    _previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    if (_previousBodyOverflow === null) {
      document.body.style.removeProperty('overflow');
    } else {
      document.body.style.overflow = _previousBodyOverflow;
    }
    _previousBodyOverflow = null;
  }

  function renderGrid() {
    const grid = document.getElementById('childThemePickerGrid');
    if (!grid) return;

    const selected = state.previewThemeId;
    const saved = state.savedThemeId;
    let html = '';

    themes().forEach(function (theme) {
      const isSelected = theme.id === selected;
      const isSaved = theme.id === saved;
      html +=
        '<button type="button" class="ctp-theme-card' +
          (isSelected ? ' is-selected' : '') +
          (isSaved ? ' is-saved' : '') +
          '" data-theme-id="' + esc(theme.id) + '"' +
          ' role="radio"' +
          ' aria-checked="' + (isSelected ? 'true' : 'false') + '"' +
          ' aria-label="' + esc(theme.label) + (isSaved ? ', sparat tema' : '') + '">' +
          '<span class="ctp-theme-preview ctp-theme-preview--' + esc(theme.id) + '">' +
            '<img class="ctp-theme-preview-img" src="' + esc(theme.assets.background) + '" alt="" loading="lazy" decoding="async" width="320" height="200">' +
            '<span class="ctp-theme-preview-fallback" aria-hidden="true"></span>' +
            '<span class="ctp-theme-overlay" aria-hidden="true"></span>' +
            '<span class="ctp-theme-meta">' +
              '<span class="ctp-theme-label">' + esc(theme.label) + '</span>' +
              (isSaved ? '<span class="ctp-theme-badge">Valt</span>' : '') +
              (isSelected ? '<span class="ctp-theme-check" aria-hidden="true">✓</span>' : '') +
            '</span>' +
          '</span>' +
        '</button>';
    });

    grid.innerHTML = html;

    grid.querySelectorAll('.ctp-theme-preview-img').forEach(function (img) {
      img.addEventListener('error', function () {
        img.classList.add('is-broken');
      });
    });

    grid.querySelectorAll('.ctp-theme-card').forEach(function (card) {
      card.addEventListener('click', function () {
        selectTheme(card.getAttribute('data-theme-id'));
      });
    });
  }

  function updateFooter() {
    const status = document.getElementById('childThemePickerStatus');
    const saveBtn = document.getElementById('childThemePickerSave');
    if (!status || !saveBtn) return;

    status.classList.remove('is-error');
    if (state.error) {
      status.textContent = state.error;
      status.classList.add('is-error');
    } else if (state.saving) {
      status.textContent = t('settings.themePickerSaving');
    } else if (state.previewThemeId === state.savedThemeId) {
      status.textContent = t('settings.themePickerAlready');
    } else {
      const theme = window.ChildTheme.getTheme(state.previewThemeId);
      status.textContent = t('settings.themePickerPreview', { name: theme.label || state.previewThemeId });
    }

    saveBtn.disabled = state.saving;
    saveBtn.textContent = state.saving ? t('settings.themePickerSaving') : t('settings.themePickerUse');
  }

  function applyPreview(themeId) {
    if (!window.ChildTheme || !ChildTheme.applyPreview) return;
    ChildTheme.applyPreview(
      ChildTheme.childPayloadWithTheme(state.childSnapshot, themeId),
      themeId,
      { silent: true }
    );
  }

  function selectTheme(themeId) {
    if (!window.ChildTheme) return;
    state.previewThemeId = ChildTheme.normalizeThemeId(themeId);
    state.error = null;
    applyPreview(state.previewThemeId);
    renderGrid();
    updateFooter();
  }

  function openPanel() {
    ensureShell();
    const backdrop = document.getElementById(BACKDROP_ID);
    const panel = document.getElementById(PANEL_ID);
    if (!backdrop || !panel) return;

    _previousFocus = document.activeElement;
    state.open = true;
    state.error = null;
    renderGrid();
    updateFooter();
    backdrop.classList.add('is-open');
    panel.classList.add('is-open');
    lockBodyScroll();
    focusInitial(panel);
  }

  function closePanel() {
    const backdrop = document.getElementById(BACKDROP_ID);
    const panel = document.getElementById(PANEL_ID);
    if (!backdrop || !panel) return;

    state.open = false;
    backdrop.classList.remove('is-open');
    panel.classList.remove('is-open');
    unlockBodyScroll();

    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      _previousFocus.focus();
    }
    _previousFocus = null;
  }

  function cancel() {
    if (state.saving) return;
    if (window.ChildTheme && ChildTheme.revertToSaved) {
      ChildTheme.revertToSaved(state.childSnapshot, { silent: true });
    }
    state.previewThemeId = state.savedThemeId;
    state.error = null;
    closePanel();
  }

  function confirmSave() {
    if (state.saving) return;
    if (!window.ChildTheme || !window.Auth || typeof Auth.api !== 'function') return;

    if (state.previewThemeId === state.savedThemeId) {
      closePanel();
      return;
    }

    state.saving = true;
    state.error = null;
    updateFooter();

    Auth.api('/api/children/' + state.childId + '/visual-theme', {
      method: 'PATCH',
      body: JSON.stringify({ visual_theme: state.previewThemeId }),
    }).then(function (merged) {
      const savedId = ChildTheme.normalizeThemeId(
        merged && merged.visual_theme ? merged.visual_theme : state.previewThemeId
      );
      state.savedThemeId = savedId;
      state.previewThemeId = savedId;
      state.childSnapshot = ChildTheme.childPayloadWithTheme(state.childSnapshot, savedId);

      if (window.ChildDashboardContext) {
        ChildDashboardContext.viewConfig = merged;
        ChildDashboardContext.me = state.childSnapshot;
      }

      ChildTheme.apply(state.childSnapshot, { silent: true });
      if (window.ChildWorldsNav && ChildWorldsNav.renderBottomNav) {
        ChildWorldsNav.renderBottomNav();
      }
      updateThemeEntryLabel();
      closePanel();
    }).catch(function () {
      state.error = t('settings.themePickerSaveFailed');
      ChildTheme.revertToSaved(state.childSnapshot, { silent: true });
      state.previewThemeId = state.savedThemeId;
      renderGrid();
      updateFooter();
    }).finally(function () {
      state.saving = false;
      if (state.open) updateFooter();
    });
  }

  function updateThemeEntryLabel() {
    const btn = document.getElementById('bspOpenThemePicker');
    if (!btn || !window.ChildTheme) return;
    const theme = ChildTheme.getTheme(ChildTheme.getActiveThemeId());
    const label = btn.querySelector('.bsp-theme-entry-label');
    const preview = btn.querySelector('.bsp-theme-entry-preview');
    if (label) label.textContent = theme.label;
    if (preview && theme.assets && theme.assets.background) {
      preview.style.backgroundImage = 'url("' + theme.assets.background + '")';
    }
  }

  function open(childMe, viewConfig) {
    if (!isGateOn() || !childMe || !childMe.id) return;

    state.childId = childMe.id;
    state.childSnapshot = Object.assign({}, childMe, {
      child_view_config: Object.assign({}, viewConfig || {}),
    });
    state.savedThemeId = ChildTheme.resolveTheme(state.childSnapshot);
    state.previewThemeId = state.savedThemeId;
    applyPreview(state.previewThemeId);
    openPanel();
  }

  function bindEntry(root) {
    if (!root || !isGateOn()) return;
    const btn = root.querySelector('#bspOpenThemePicker');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      const ctx = window.ChildDashboardContext || {};
      const me = ctx.me || (window.Auth && Auth.getUser ? Auth.getUser() : null);
      const viewConfig = ctx.viewConfig || (me && me.child_view_config) || {};
      if (!me || me.type !== 'child') return;
      open(me, viewConfig);
    });
  }

  window.ChildThemePicker = {
    open: open,
    cancel: cancel,
    bindEntry: bindEntry,
    isGateOn: isGateOn,
  };
})();
