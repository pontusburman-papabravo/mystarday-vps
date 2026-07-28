/**
 * child-customization-entries.js — Barnets utseende (tema, bildstil, kortstorlek).
 * Shared by Min samling (legacy) and Inställningar-fliken.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function renderPictogramEntry() {
    if (!window.ChildPictogramPacks || !ChildPictogramPacks.isSamlingGateOn || !ChildPictogramPacks.isSamlingGateOn()) {
      return '';
    }
    const packId = ChildPictogramPacks.getActivePackId ? ChildPictogramPacks.getActivePackId() : 'simple';
    const pack = ChildPictogramPacks.PACKS[packId] || ChildPictogramPacks.PACKS.simple;
    const packLabel = ChildPictogramPacks.packLabel
      ? ChildPictogramPacks.packLabel(pack)
      : (pack.labelKey && typeof window.cpt === 'function' ? cpt(pack.labelKey) : pack.id);
    const preview = pack.preview || '';
    return (
      '<section class="bsp-pictogram-entry" aria-label="' + esc(t('settings.imageStyle')) + '">' +
        '<button type="button" class="bsp-pictogram-entry-btn" id="bspOpenPictogramPicker">' +
          '<span class="bsp-pictogram-entry-preview" style="background-image:url(\'' + preview + '\')" aria-hidden="true"></span>' +
          '<span class="bsp-pictogram-entry-copy">' +
            '<span class="bsp-pictogram-entry-kicker">' + esc(t('settings.imageStyle')) + '</span>' +
            '<span class="bsp-pictogram-entry-label">' + esc(packLabel) + '</span>' +
          '</span>' +
          '<span class="bsp-pictogram-entry-chevron" aria-hidden="true">›</span>' +
        '</button>' +
      '</section>'
    );
  }

  function renderCardSizeEntry() {
    if (!window.ChildActivityCardSize || !ChildActivityCardSize.isSamlingGateOn || !ChildActivityCardSize.isSamlingGateOn()) {
      return '';
    }
    const sizeId = ChildActivityCardSize.getActiveSizeId ? ChildActivityCardSize.getActiveSizeId() : 'standard';
    const sizes = ChildActivityCardSize.listSizes ? ChildActivityCardSize.listSizes() : [];
    const size = sizes.find(function (s) { return s.id === sizeId; }) || sizes[0] || { label: '' };
    return (
      '<section class="bsp-cardsize-entry" aria-label="' + esc(t('settings.cardSize')) + '">' +
        '<button type="button" class="bsp-cardsize-entry-btn" id="bspOpenCardSizePicker">' +
          '<span class="bsp-cardsize-entry-preview" aria-hidden="true"></span>' +
          '<span class="bsp-cardsize-entry-copy">' +
            '<span class="bsp-cardsize-entry-kicker">' + esc(t('settings.cardSize')) + '</span>' +
            '<span class="bsp-cardsize-entry-label">' + esc(size.label) + '</span>' +
          '</span>' +
          '<span class="bsp-cardsize-entry-chevron" aria-hidden="true">›</span>' +
        '</button>' +
      '</section>'
    );
  }

  function renderThemeEntry() {
    if (!window.ChildTheme || !ChildTheme.isSamlingGateOn || !ChildTheme.isSamlingGateOn()) {
      return '';
    }
    const theme = ChildTheme.getTheme(ChildTheme.getActiveThemeId());
    const bg = theme.assets && theme.assets.background ? theme.assets.background : '';
    return (
      '<section class="bsp-theme-entry" aria-label="' + esc(t('settings.themeEntryKicker')) + '">' +
        '<button type="button" class="bsp-theme-entry-btn" id="bspOpenThemePicker">' +
          '<span class="bsp-theme-entry-preview" style="background-image:url(\'' + bg + '\')" aria-hidden="true"></span>' +
          '<span class="bsp-theme-entry-copy">' +
            '<span class="bsp-theme-entry-kicker">' + esc(t('settings.themeEntryKicker')) + '</span>' +
            '<span class="bsp-theme-entry-label">' + esc(theme.label) + '</span>' +
          '</span>' +
          '<span class="bsp-theme-entry-chevron" aria-hidden="true">›</span>' +
        '</button>' +
      '</section>'
    );
  }

  function renderAll() {
    return renderThemeEntry() + renderPictogramEntry() + renderCardSizeEntry();
  }

  function bindPickers(root) {
    if (window.ChildThemePicker && typeof ChildThemePicker.bindEntry === 'function') {
      ChildThemePicker.bindEntry(root);
    }
    if (window.ChildPictogramPicker && typeof ChildPictogramPicker.bindEntry === 'function') {
      ChildPictogramPicker.bindEntry(root);
    }
    if (window.ChildActivityCardSizePicker && typeof ChildActivityCardSizePicker.bindEntry === 'function') {
      ChildActivityCardSizePicker.bindEntry(root);
    }
  }

  window.ChildCustomizationEntries = {
    renderThemeEntry: renderThemeEntry,
    renderPictogramEntry: renderPictogramEntry,
    renderCardSizeEntry: renderCardSizeEntry,
    renderAll: renderAll,
    bindPickers: bindPickers,
  };
})();
