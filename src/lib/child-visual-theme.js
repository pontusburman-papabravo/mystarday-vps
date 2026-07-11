/**
 * Canonical Barnets samling visual themes (server validation).
 * Aliases are normalized client-side only — API accepts canonical IDs only.
 */

const CANONICAL_VISUAL_THEME_IDS = [
  'adventure',
  'space',
  'dinosaurs',
  'vehicles',
  'animals',
  'ocean',
  'sports',
  'builders',
  'music',
  'arcade',
];

const DEFAULT_VISUAL_THEME = 'adventure';

function isCanonicalVisualTheme(value) {
  if (value == null || typeof value !== 'string') return false;
  return CANONICAL_VISUAL_THEME_IDS.includes(value.trim().toLowerCase());
}

function normalizeCanonicalVisualTheme(value) {
  if (!isCanonicalVisualTheme(value)) return null;
  return value.trim().toLowerCase();
}

module.exports = {
  CANONICAL_VISUAL_THEME_IDS,
  DEFAULT_VISUAL_THEME,
  isCanonicalVisualTheme,
  normalizeCanonicalVisualTheme,
};
