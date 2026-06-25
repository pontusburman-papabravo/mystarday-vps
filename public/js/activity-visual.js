/**
 * activity-visual.js — render activity icon (emoji) or custom photo.
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pick(item) {
    if (!item) return { url: null, icon: '⭐' };
    var url = item.image_url || null;
    var icon = item.icon || '⭐';
    return { url: url, icon: icon };
  }

  /** Inline HTML for list/card slots (emoji text or img). */
  function inline(item, imgClass) {
    var p = pick(item);
    if (p.url) {
      var cls = 'activity-visual-img' + (imgClass ? ' ' + imgClass : '');
      return '<img src="' + esc(p.url) + '" alt="" class="' + cls + '" loading="lazy">';
    }
    return p.icon;
  }

  /** Thumb HTML for library lists (~40px). */
  function thumb(item) {
    return inline(item, 'activity-visual-img--thumb');
  }

  window.ActivityVisual = {
    pick: pick,
    inline: inline,
    thumb: thumb,
  };
})();
