/**
 * custody-a11y.js — WCAG AA helpers: hemfärg får inte bära information ensam.
 * UMD: window.CustodyA11y (browser) + module.exports (Node tests).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof root !== 'undefined') {
    root.CustodyA11y = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global, function () {
  'use strict';

  const DEFAULT_COLOR = '#4F46E5';

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function homeInitial(label) {
    const t = String(label || '').trim();
    return t ? t.charAt(0).toUpperCase() : '?';
  }

  function dayCustodyHint(label) {
    const t = String(label || '').trim();
    return t ? 'Hos ' + t : '';
  }

  /**
   * Decorative swatch + visible hemnamn (färg är inte ensam bärare).
   * @param {{ label?: string, color?: string }} home
   * @param {function} escFn
   */
  function homeMarkerHtml(home, escFn) {
    const escHtml = typeof escFn === 'function' ? escFn : esc;
    const label = (home && home.label) || '';
    const color = (home && home.color) || DEFAULT_COLOR;
    const visible = label || homeInitial(label);
    return (
      '<span class="inline-flex items-center gap-1 min-w-0 custody-home-marker">' +
      '<span class="custody-home-swatch w-3 h-3 rounded-full flex-shrink-0 border border-navy/10" ' +
      'style="background-color:' + escHtml(color) + '" aria-hidden="true"></span>' +
      '<span class="truncate text-xs font-semibold text-navy dark:text-white">' + escHtml(visible) + '</span>' +
      '</span>'
    );
  }

  /**
   * Kompakt cell för förhandsvisningsrutnät: initial + aria-label med fullt hemnamn.
   */
  function previewCellHtml(home, opts) {
    opts = opts || {};
    const escHtml = typeof opts.esc === 'function' ? opts.esc : esc;
    if (!home) {
      return '<span class="block aspect-square rounded bg-lavender/30" aria-label="Inget hem" title="—"></span>';
    }
    const label = home.label || '';
    const color = home.color || DEFAULT_COLOR;
    const initial = homeInitial(label);
    const overrideMark = opts.isOverride ? ' ring-2 ring-gold ring-offset-1' : '';
    const parentMark = opts.isParentDay ? ' font-bold' : '';
    const title = label + (opts.isOverride ? ' (undantag)' : '');
    return (
      '<span class="block aspect-square rounded flex flex-col items-center justify-center text-[10px] text-white' +
      overrideMark + parentMark + '" style="background:' + escHtml(color) + ';" ' +
      'title="' + escHtml(title) + '" aria-label="' + escHtml(title) + '">' +
      '<span aria-hidden="true">' + escHtml(initial) + '</span>' +
      '</span>'
    );
  }

  function ensureDayMarker(el, custody) {
    if (!el) return;
    let marker = el.querySelector('.custody-day-marker');
    if (!custody || !custody.label) {
      if (marker) marker.remove();
      return;
    }
    const hint = dayCustodyHint(custody.label);
    const initial = homeInitial(custody.label);
    if (!marker) {
      marker = document.createElement('span');
      marker.className = 'custody-day-marker block text-[8px] font-bold leading-tight text-navy/80 truncate max-w-full text-center';
      marker.setAttribute('aria-hidden', 'true');
      const labelEl = el.querySelector('.mini-week-label');
      if (labelEl && labelEl.parentNode) {
        labelEl.parentNode.insertBefore(marker, labelEl.nextSibling);
      } else {
        el.appendChild(marker);
      }
    }
    marker.textContent = initial;
    marker.title = hint;
  }

  function ensureCardBadge(card, home) {
    if (!card) return;
    let badge = card.querySelector('.custody-home-badge');
    if (!home || !home.label) {
      if (badge) badge.remove();
      return;
    }
    const hint = dayCustodyHint(home.label);
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'custody-home-badge flex items-center gap-1 text-[10px] font-semibold text-navy/90 mb-1';
      badge.setAttribute('aria-hidden', 'true');
      const compact = card.querySelector('.dash-card-compact');
      if (compact) {
        compact.insertBefore(badge, compact.firstChild);
      } else {
        card.insertBefore(badge, card.firstChild);
      }
    }
    const color = home.color || DEFAULT_COLOR;
    badge.innerHTML =
      '<span class="custody-home-swatch w-2.5 h-2.5 rounded-full flex-shrink-0 border border-navy/10" ' +
      'style="background-color:' + esc(color) + '" aria-hidden="true"></span>' +
      '<span class="truncate">' + esc(home.label) + '</span>';
    badge.title = hint;
  }

  function bannerMarkerHtml(home, escFn) {
    const escHtml = typeof escFn === 'function' ? escFn : esc;
    if (!home || !home.label) return '';
    return (
      '<span class="inline-flex items-center gap-1.5 custody-banner-marker">' +
      '<span aria-hidden="true">🏠</span>' +
      homeMarkerHtml(home, escHtml) +
      '</span>'
    );
  }

  return {
    DEFAULT_COLOR: DEFAULT_COLOR,
    esc: esc,
    homeInitial: homeInitial,
    dayCustodyHint: dayCustodyHint,
    homeMarkerHtml: homeMarkerHtml,
    previewCellHtml: previewCellHtml,
    ensureDayMarker: ensureDayMarker,
    ensureCardBadge: ensureCardBadge,
    bannerMarkerHtml: bannerMarkerHtml,
  };
});
