/**
 * child-activity-card-size-picker.js — Kortstorlek (Min samling, gate ON).
 */
(function () {
  'use strict';

  const BACKDROP_ID = 'childCardSizePickerBackdrop';
  const PANEL_ID = 'childCardSizePickerPanel';
  let _shellReady = false;
  let _previousFocus = null;
  let _previousBodyOverflow = null;

  const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const state = {
    open: false,
    childId: null,
    childSnapshot: null,
    savedSizeId: 'standard',
    previewSizeId: 'standard',
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
    return !!(window.ChildActivityCardSize && ChildActivityCardSize.isSamlingGateOn
      && ChildActivityCardSize.isSamlingGateOn());
  }

  function sizes() {
    return window.ChildActivityCardSize && ChildActivityCardSize.listSizes
      ? ChildActivityCardSize.listSizes()
      : [];
  }

  function previewMarkup(sizeId) {
    if (sizeId === 'large') {
      return (
        '<span class="ccsz-preview ccsz-preview--large" aria-hidden="true">' +
          '<span class="ccsz-preview-img ccsz-preview-img--lg"></span>' +
          '<span class="ccsz-preview-line"></span>' +
        '</span>'
      );
    }
    return (
      '<span class="ccsz-preview ccsz-preview--standard" aria-hidden="true">' +
        '<span class="ccsz-preview-img"></span>' +
        '<span class="ccsz-preview-line ccsz-preview-line--short"></span>' +
      '</span>'
    );
  }

  function ensureShell() {
    if (_shellReady) return;
    _shellReady = true;

    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'ccsz-backdrop';
    backdrop.addEventListener('click', cancel);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'ccsz-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'childCardSizePickerTitle');
    panel.innerHTML =
      '<header class="ccsz-header">' +
        '<h2 id="childCardSizePickerTitle" class="ccsz-title">Kortstorlek</h2>' +
        '<button type="button" class="ccsz-close" id="childCardSizePickerClose" aria-label="Stäng">×</button>' +
      '</header>' +
      '<p class="ccsz-lead">Välj hur stora aktivitetsbilderna ska vara på ☀️ Idag. Texten finns kvar under bilden.</p>' +
      '<div class="ccsz-options" id="childCardSizePickerOptions" role="radiogroup" aria-label="Välj kortstorlek"></div>' +
      '<footer class="ccsz-footer">' +
        '<p class="ccsz-status" id="childCardSizePickerStatus" aria-live="polite"></p>' +
        '<div class="ccsz-actions">' +
          '<button type="button" class="ccsz-btn ccsz-btn--ghost" id="childCardSizePickerCancel">Avbryt</button>' +
          '<button type="button" class="ccsz-btn ccsz-btn--primary" id="childCardSizePickerSave">Spara kortstorlek</button>' +
        '</div>' +
      '</footer>';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    panel.querySelector('#childCardSizePickerClose').addEventListener('click', cancel);
    panel.querySelector('#childCardSizePickerCancel').addEventListener('click', cancel);
    panel.querySelector('#childCardSizePickerSave').addEventListener('click', confirmSave);

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
    const selected = panel.querySelector('.ccsz-option.is-selected');
    const first = panel.querySelector('.ccsz-option');
    const closeBtn = panel.querySelector('#childCardSizePickerClose');
    const target = selected || first || closeBtn;
    if (target && typeof target.focus === 'function') target.focus();
  }

  function lockBodyScroll() {
    _previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    if (_previousBodyOverflow != null) {
      document.body.style.overflow = _previousBodyOverflow;
    } else {
      document.body.style.removeProperty('overflow');
    }
    _previousBodyOverflow = null;
  }

  function renderOptions() {
    const mount = document.getElementById('childCardSizePickerOptions');
    if (!mount) return;
    const list = sizes();
    mount.innerHTML = list.map(function (size) {
      const selected = size.id === state.previewSizeId;
      return (
        '<button type="button" class="ccsz-option' + (selected ? ' is-selected' : '') + '"' +
          ' data-size-id="' + esc(size.id) + '"' +
          ' role="radio"' +
          (selected ? ' aria-checked="true"' : ' aria-checked="false"') +
          '>' +
          previewMarkup(size.id) +
          '<span class="ccsz-option-copy">' +
            '<span class="ccsz-option-label">' + esc(size.label) + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join('');

    mount.querySelectorAll('[data-size-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectSize(btn.getAttribute('data-size-id'));
      });
    });
  }

  function refreshVisibleActivities() {
    if (typeof window.coalescedLoadDay === 'function') {
      window.coalescedLoadDay().catch(function () {});
    } else if (typeof window.loadDay === 'function' && window.currentDate) {
      window.loadDay(window.currentDate, false).catch(function () {});
    }
  }

  function selectSize(sizeId) {
    if (state.saving) return;
    state.previewSizeId = ChildActivityCardSize.resolveCardSize(sizeId);
    state.error = null;
    if (ChildActivityCardSize.applyPreview) {
      ChildActivityCardSize.applyPreview(state.previewSizeId);
    }
    refreshVisibleActivities();
    renderOptions();
    updateFooter();
  }

  function updateFooter() {
    const status = document.getElementById('childCardSizePickerStatus');
    const saveBtn = document.getElementById('childCardSizePickerSave');
    if (status) status.textContent = state.error || '';
    if (saveBtn) {
      saveBtn.disabled = state.saving;
      saveBtn.textContent = state.saving ? 'Sparar…' : 'Spara kortstorlek';
    }
  }

  function openPanel() {
    ensureShell();
    const backdrop = document.getElementById(BACKDROP_ID);
    const panel = document.getElementById(PANEL_ID);
    if (!backdrop || !panel) return;

    _previousFocus = document.activeElement;
    lockBodyScroll();
    renderOptions();
    updateFooter();

    backdrop.classList.add('is-open');
    panel.classList.add('is-open');
    state.open = true;
    focusInitial(panel);
  }

  function closePanel() {
    const backdrop = document.getElementById(BACKDROP_ID);
    const panel = document.getElementById(PANEL_ID);
    if (backdrop) backdrop.classList.remove('is-open');
    if (panel) panel.classList.remove('is-open');
    state.open = false;
    unlockBodyScroll();
    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      _previousFocus.focus();
    }
    _previousFocus = null;
  }

  function cancel() {
    if (state.saving) return;
    if (ChildActivityCardSize.revertToSaved) {
      ChildActivityCardSize.revertToSaved({ silent: true });
    }
    state.previewSizeId = state.savedSizeId;
    state.error = null;
    refreshVisibleActivities();
    closePanel();
  }

  function confirmSave() {
    if (state.saving) return;
    if (!window.ChildActivityCardSize || !window.Auth || typeof Auth.api !== 'function') return;

    if (state.previewSizeId === state.savedSizeId) {
      closePanel();
      return;
    }

    state.saving = true;
    state.error = null;
    updateFooter();

    Auth.api('/api/children/' + state.childId + '/activity-card-size', {
      method: 'PATCH',
      body: JSON.stringify({ activity_card_size: state.previewSizeId }),
    }).then(function (merged) {
      const savedId = ChildActivityCardSize.resolveCardSize(
        merged && merged.activity_card_size ? merged.activity_card_size : state.previewSizeId
      );
      state.savedSizeId = savedId;
      state.previewSizeId = savedId;
      state.childSnapshot = ChildActivityCardSize.childPayloadWithSize(state.childSnapshot, savedId);
      ChildActivityCardSize.commitSaved(savedId);

      if (window.ChildDashboardContext) {
        ChildDashboardContext.viewConfig = merged;
        ChildDashboardContext.me = state.childSnapshot;
      }

      updateEntryLabel();
      refreshVisibleActivities();
      document.dispatchEvent(new CustomEvent('child-activity-card-size-changed', {
        detail: { sizeId: savedId },
      }));
      closePanel();
    }).catch(function () {
      state.error = 'Kortstorleken kunde inte sparas. Försök igen.';
      ChildActivityCardSize.revertToSaved({ silent: true });
      state.previewSizeId = state.savedSizeId;
      refreshVisibleActivities();
      renderOptions();
      updateFooter();
    }).finally(function () {
      state.saving = false;
      if (state.open) updateFooter();
    });
  }

  function updateEntryLabel() {
    const btn = document.getElementById('bspOpenCardSizePicker');
    if (!btn || !window.ChildActivityCardSize) return;
    const size = ChildActivityCardSize.SIZES[ChildActivityCardSize.getActiveSizeId()];
    const label = btn.querySelector('.bsp-cardsize-entry-label');
    if (label && size) label.textContent = size.label;
  }

  function open(childMe, viewConfig) {
    if (!isGateOn() || !childMe || !childMe.id) return;

    state.childId = childMe.id;
    state.childSnapshot = ChildActivityCardSize.childPayloadWithSize(
      childMe,
      ChildActivityCardSize.readSizeFromConfig(viewConfig)
    );
    state.savedSizeId = ChildActivityCardSize.readSizeFromConfig(viewConfig);
    state.previewSizeId = state.savedSizeId;
    state.error = null;
    state.saving = false;
    openPanel();
  }

  function bindEntry(root) {
    if (!isGateOn()) return;
    const btn = (root || document).querySelector('#bspOpenCardSizePicker');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      const ctx = window.ChildDashboardContext || {};
      open(ctx.me, ctx.viewConfig || {});
    });
  }

  window.ChildActivityCardSizePicker = {
    open: open,
    bindEntry: bindEntry,
    updateEntryLabel: updateEntryLabel,
  };
})();
