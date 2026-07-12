/**
 * child-activity-card-size.js — Barnets samling activity card size (gate ON).
 * standard: ~64–80px visuals, compact list. large: ~112–144px list, ~160–200px NU.
 */
(function () {
  'use strict';

  const DEFAULT_SIZE = 'standard';

  const SIZES = {
    standard: { id: 'standard', label: 'Vanliga kort' },
    large: { id: 'large', label: 'Stora bilder' },
  };

  const SIZE_IDS = ['standard', 'large'];

  let _activeSizeId = DEFAULT_SIZE;
  let _savedSizeId = DEFAULT_SIZE;

  function isSamlingGateOn() {
    if (typeof document !== 'undefined'
        && document.documentElement.getAttribute('data-barnets-samling') === 'on') {
      return true;
    }
    return !!(window.ChildWorlds
      && window.ChildWorlds.isBarnetsSamlingEnabled
      && window.ChildWorlds.isBarnetsSamlingEnabled());
  }

  function isEnabled() {
    return isSamlingGateOn();
  }

  function resolveCardSize(size) {
    if (size == null || String(size).trim() === '') return DEFAULT_SIZE;
    const normalized = String(size).trim().toLowerCase();
    return SIZE_IDS.includes(normalized) ? normalized : DEFAULT_SIZE;
  }

  function listSizes() {
    return SIZE_IDS.map(function (id) { return SIZES[id]; });
  }

  function getActiveSizeId() {
    return _activeSizeId;
  }

  function getSavedSizeId() {
    return _savedSizeId;
  }

  function readSizeFromConfig(viewConfig) {
    if (!viewConfig || viewConfig.activity_card_size == null) return DEFAULT_SIZE;
    return resolveCardSize(viewConfig.activity_card_size);
  }

  function applyDomSize(sizeId) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!isEnabled()) {
      root.removeAttribute('data-activity-card-size');
      return;
    }
    root.setAttribute('data-activity-card-size', resolveCardSize(sizeId));
  }

  function applyFromConfig(viewConfig, opts) {
    opts = opts || {};
    const sizeId = readSizeFromConfig(viewConfig);
    _savedSizeId = sizeId;
    _activeSizeId = sizeId;
    applyDomSize(sizeId);
    if (!opts.silent && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('child-activity-card-size-applied', {
        detail: { sizeId: sizeId },
      }));
    }
    return sizeId;
  }

  function applyPreview(sizeId) {
    _activeSizeId = resolveCardSize(sizeId);
    applyDomSize(_activeSizeId);
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('child-activity-card-size-preview', {
        detail: { sizeId: _activeSizeId },
      }));
    }
  }

  function revertToSaved(opts) {
    opts = opts || {};
    _activeSizeId = _savedSizeId;
    applyDomSize(_activeSizeId);
    if (!opts.silent && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('child-activity-card-size-preview', {
        detail: { sizeId: _activeSizeId },
      }));
    }
  }

  function commitSaved(sizeId) {
    const resolved = resolveCardSize(sizeId);
    _savedSizeId = resolved;
    _activeSizeId = resolved;
    applyDomSize(resolved);
  }

  function childPayloadWithSize(child, sizeId) {
    const base = child && typeof child === 'object' ? Object.assign({}, child) : {};
    const cfg = Object.assign({}, base.child_view_config || {});
    cfg.activity_card_size = resolveCardSize(sizeId);
    base.child_view_config = cfg;
    return base;
  }

  window.ChildActivityCardSize = {
    DEFAULT_SIZE: DEFAULT_SIZE,
    SIZES: SIZES,
    listSizes: listSizes,
    resolveCardSize: resolveCardSize,
    isEnabled: isEnabled,
    isSamlingGateOn: isSamlingGateOn,
    getActiveSizeId: getActiveSizeId,
    getSavedSizeId: getSavedSizeId,
    readSizeFromConfig: readSizeFromConfig,
    applyFromConfig: applyFromConfig,
    applyPreview: applyPreview,
    revertToSaved: revertToSaved,
    commitSaved: commitSaved,
    childPayloadWithSize: childPayloadWithSize,
  };
})();
