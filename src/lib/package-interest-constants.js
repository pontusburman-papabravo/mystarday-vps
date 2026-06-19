/**
 * Canonical package-interest constants (§9.8).
 * Shared by API validation, analytics metadata, and preview-shell.
 */

const INTEREST_COMPONENTS = ['reporting', 'pedagog', 'teacch'];

const INTEREST_SOURCES = [
  'bottom_nav_preview',
  'upgrade_page',
  'contextual_trigger',
];

const PACKAGE_LABELS = {
  reporting: 'Rapportering',
  pedagog: 'Pedagog',
  teacch: 'Extra stöd',
};

module.exports = {
  INTEREST_COMPONENTS,
  INTEREST_SOURCES,
  PACKAGE_LABELS,
};
