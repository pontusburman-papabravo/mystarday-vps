'use strict';

/**
 * Escape user-controlled text for safe interpolation into HTML email bodies.
 * Does not strip — encodes <, >, &, ", ' so markup cannot execute in clients.
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { escapeHtml };
