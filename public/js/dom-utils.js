/**
 * dom-utils.js -- shared DOM safety utilities + child avatar rendering.
 */

(function (root) {
  'use strict';

  // ── escapeHtml ─────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  root.escapeHtml = escapeHtml;

  // ── renderChildAvatar ─────────────────────────────────────────────────────────
  // Fallback chain: avatar_url → emoji → ⭐
  // The default PNG lives at /img/avatar-child-default.png (generated at build time).
  // When avatar_url is set, renders a round <img>. Otherwise emoji text (or ⭐).
  //
  // @param {Object} child   - child object from API (needs id, avatar_url, emoji)
  // @param {number} size    - px width/height of the img (default 32)
  // @returns {string}       - HTML string safe for innerHTML
  function renderChildAvatar(child, size) {
    size = size || 32;
    var url = child && child.avatar_url;
    if (url) {
      return '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(child.name || '') + '" ' +
        'style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;display:inline-block;vertical-align:middle;" />';
    }
    var emoji = (child && child.emoji) || '';
    if (emoji) {
      return '<span style="display:inline-flex;align-items:center;font-size:' +
        Math.round(size * 0.8) + 'px;line-height:1;">' + escapeHtml(emoji) + '</span>';
    }
    // Neither avatar nor emoji → star placeholder
    return '<img src="/img/avatar-child-default.png" alt="" ' +
      'style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;display:inline-block;vertical-align:middle;" />';
  }

  root.renderChildAvatar = renderChildAvatar;

  // ── refreshSection ─────────────────────────────────────────────────────────
  // Replaces the innerHTML of a named section element after a mutation,
  // preserving scroll position and avoiding full-page reload.
  //
  // @param {string} sectionId  - DOM id of the container to update
  // @param {string} html        - new HTML content
  // @param {Function} [onDone] - optional post-render callback
  // @returns {boolean}          - true if element was found and updated
  function refreshSection(sectionId, html, onDone) {
    var el = document.getElementById(sectionId);
    if (!el) return false;
    el.innerHTML = html;
    if (typeof onDone === 'function') onDone();
    return true;
  }

  root.refreshSection = refreshSection;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
