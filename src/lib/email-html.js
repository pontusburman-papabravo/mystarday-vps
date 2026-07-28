'use strict';

const { escapeHtml } = require('./escape-html');

/**
 * Escape optional user/DB display value for HTML email interpolation.
 * Returns null when input is empty so callers can fall back to i18n generics.
 */
function escapeUserDisplay(value) {
  if (value == null || String(value).trim() === '') return null;
  return escapeHtml(String(value).trim());
}

/**
 * First token of a display name, escaped for HTML (parent names in greetings).
 */
function escapeFirstName(displayName) {
  const first = String(displayName || '').trim().split(/\s+/)[0];
  return first ? escapeHtml(first) : null;
}

module.exports = {
  escapeHtml,
  escapeUserDisplay,
  escapeFirstName,
};
