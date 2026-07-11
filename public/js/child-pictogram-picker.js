/**
 * child-pictogram-picker.js — Bildstil (Min samling, gate ON).
 * Preview → confirm. Persists child_view_config.pictogram_pack only.
 */
(function () {
  'use strict';

  const BACKDROP_ID = 'childPictogramPickerBackdrop';
  const PANEL_ID = 'childPictogramPickerPanel';
  let _shellReady = false;
  let _previousFocus = null;
  let _previousBodyOverflow = null;

  const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const state = {
    open: false,
    childId: null,
    childSnapshot: null,
    savedPackId: 'simple',
    previewPackId: 'simple',
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
    return !!(window.ChildPictogramPacks && ChildPictogramPacks.isSamlingGateOn && ChildPictogramPacks.isSamlingGateOn());
  }

  function packs() {
    return window.ChildPictogramPacks && ChildPictogramPacks.listPacks
      ? ChildPictogramPacks.listPacks()
      : [];
  }

  function ensureShell() {
    if (_shellReady) return;
    _shellReady = true;

    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'cpp-backdrop';
    backdrop.addEventListener('click', cancel);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'cpp-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'childPictogramPickerTitle');
    panel.innerHTML =
      '<header class="cpp-header">' +
        '<h2 id="childPictogramPickerTitle" class="cpp-title">Bildstil</h2>' +
        '<button type="button" class="cpp-close" id="childPictogramPickerClose" aria-label="Stäng">×</button>' +
      '</header>' +
      '<p class="cpp-lead">Välj hur aktivitetsbilderna ska se ut. Tryck <strong>Spara bildstil</strong> när du är nöjd.</p>' +
      '<div class="cpp-options" id="childPictogramPickerOptions" role="radiogroup" aria-label="Välj bildstil"></div>' +
      '<footer class="cpp-footer">' +
        '<p class="cpp-status" id="childPictogramPickerStatus" aria-live="polite"></p>' +
        '<div class="cpp-actions">' +
          '<button type="button" class="cpp-btn cpp-btn--ghost" id="childPictogramPickerCancel">Avbryt</button>' +
          '<button type="button" class="cpp-btn cpp-btn--primary" id="childPictogramPickerSave">Spara bildstil</button>' +
        '</div>' +
      '</footer>';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    panel.querySelector('#childPictogramPickerClose').addEventListener('click', cancel);
    panel.querySelector('#childPictogramPickerCancel').addEventListener('click', cancel);
    panel.querySelector('#childPictogramPickerSave').addEventListener('click', confirmSave);

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
    const selected = panel.querySelector('.cpp-option.is-selected');
    const first = panel.querySelector('.cpp-option');
    const closeBtn = panel.querySelector('#childPictogramPickerClose');
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
    const mount = document.getElementById('childPictogramPickerOptions');
    if (!mount) return;
    const list = packs();
    mount.innerHTML = list.map(function (pack) {
      const selected = pack.id === state.previewPackId;
      return (
        '<button type="button" class="cpp-option' + (selected ? ' is-selected' : '') + '"' +
          ' data-pack-id="' + esc(pack.id) + '"' +
          ' role="radio"' +
          (selected ? ' aria-checked="true"' : ' aria-checked="false"') +
          '>' +
          '<img class="cpp-option-preview" src="' + esc(pack.preview) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="cpp-option-copy">' +
            '<span class="cpp-option-label">' + esc(pack.label) + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join('');

    mount.querySelectorAll('[data-pack-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectPack(btn.getAttribute('data-pack-id'));
      });
    });
  }

  function selectPack(packId) {
    if (state.saving) return;
    state.previewPackId = ChildPictogramPacks.resolvePack(packId);
    state.error = null;
    if (ChildPictogramPacks.applyPreview) {
      ChildPictogramPacks.applyPreview(state.previewPackId);
    }
    refreshVisibleActivities();
    renderOptions();
    updateFooter();
  }

  function refreshVisibleActivities() {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent('child-pictogram-pack-preview'));
    if (typeof window.coalescedLoadDay === 'function') {
      window.coalescedLoadDay().catch(function () {});
    } else if (typeof window.loadDay === 'function' && window.currentDate) {
      window.loadDay(window.currentDate, false).catch(function () {});
    }
  }

  function updateFooter() {
    const status = document.getElementById('childPictogramPickerStatus');
    const saveBtn = document.getElementById('childPictogramPickerSave');
    if (status) status.textContent = state.error || '';
    if (saveBtn) {
      saveBtn.disabled = state.saving;
      saveBtn.textContent = state.saving ? 'Sparar…' : 'Spara bildstil';
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
    if (ChildPictogramPacks.revertToSaved) {
      ChildPictogramPacks.revertToSaved({ silent: true });
    }
    state.previewPackId = state.savedPackId;
    state.error = null;
    refreshVisibleActivities();
    closePanel();
  }

  function confirmSave() {
    if (state.saving) return;
    if (!window.ChildPictogramPacks || !window.Auth || typeof Auth.api !== 'function') return;

    if (state.previewPackId === state.savedPackId) {
      closePanel();
      return;
    }

    state.saving = true;
    state.error = null;
    updateFooter();

    Auth.api('/api/children/' + state.childId + '/pictogram-pack', {
      method: 'PATCH',
      body: JSON.stringify({ pictogram_pack: state.previewPackId }),
    }).then(function (merged) {
      const savedId = ChildPictogramPacks.resolvePack(
        merged && merged.pictogram_pack ? merged.pictogram_pack : state.previewPackId
      );
      state.savedPackId = savedId;
      state.previewPackId = savedId;
      state.childSnapshot = ChildPictogramPacks.childPayloadWithPack(state.childSnapshot, savedId);
      ChildPictogramPacks.commitSaved(savedId);

      if (window.ChildDashboardContext) {
        ChildDashboardContext.viewConfig = merged;
        ChildDashboardContext.me = state.childSnapshot;
      }

      updateEntryLabel();
      refreshVisibleActivities();
      document.dispatchEvent(new CustomEvent('child-pictogram-pack-changed', {
        detail: { packId: savedId },
      }));
      closePanel();
    }).catch(function () {
      state.error = 'Bildstilen kunde inte sparas. Försök igen.';
      ChildPictogramPacks.revertToSaved({ silent: true });
      state.previewPackId = state.savedPackId;
      refreshVisibleActivities();
      renderOptions();
      updateFooter();
    }).finally(function () {
      state.saving = false;
      if (state.open) updateFooter();
    });
  }

  function updateEntryLabel() {
    const btn = document.getElementById('bspOpenPictogramPicker');
    if (!btn || !window.ChildPictogramPacks) return;
    const pack = ChildPictogramPacks.PACKS[ChildPictogramPacks.getActivePackId()];
    const label = btn.querySelector('.bsp-pictogram-entry-label');
    const preview = btn.querySelector('.bsp-pictogram-entry-preview');
    if (label && pack) label.textContent = pack.label;
    if (preview && pack && pack.preview) {
      preview.style.backgroundImage = 'url("' + pack.preview + '")';
    }
  }

  function open(childMe, viewConfig) {
    if (!isGateOn() || !childMe || !childMe.id) return;

    state.childId = childMe.id;
    state.childSnapshot = ChildPictogramPacks.childPayloadWithPack(childMe, ChildPictogramPacks.readPackFromConfig(viewConfig));
    state.savedPackId = ChildPictogramPacks.readPackFromConfig(viewConfig);
    state.previewPackId = state.savedPackId;
    state.error = null;
    state.saving = false;
    openPanel();
  }

  function bindEntry(root) {
    if (!isGateOn()) return;
    const btn = (root || document).querySelector('#bspOpenPictogramPicker');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      const ctx = window.ChildDashboardContext || {};
      open(ctx.me, ctx.viewConfig || {});
    });
  }

  window.ChildPictogramPicker = {
    open: open,
    bindEntry: bindEntry,
    updateEntryLabel: updateEntryLabel,
  };
})();
