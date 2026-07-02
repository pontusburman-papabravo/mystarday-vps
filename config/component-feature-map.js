/**
 * Feature slug → subscription component mapping (§8.3).
 * Used by package-access.js and db/features.hasAccess().
 */

/** @type {Record<string, string>} */
const FEATURE_TO_COMPONENT = {
  // basic_app
  for_dig: 'basic_app',
  veckoschema: 'basic_app',
  specialdagar: 'basic_app',
  kalender: 'basic_app',
  aktivitetsbibliotek: 'basic_app',
  daglogg: 'basic_app',
  manuella_stjarnor: 'basic_app',
  beloningssystem: 'basic_app',
  skattkammar_universum: 'basic_app',
  familjeinbjudan: 'basic_app',
  barninloggning: 'basic_app',
  push_notiser: 'basic_app',
  onboarding: 'basic_app',
  emotion_tracking: 'basic_app',
  // reporting
  klinisk_rapportering: 'reporting',
  // pedagog
  pedagog_invite: 'pedagog',
  pedagoganteckningar: 'pedagog',
  pedagog_dashboard: 'pedagog',
  pedagog_daglogg: 'pedagog',
  pedagog_skolaktivitet: 'pedagog',
  // teacch
  de_sju_fragorna: 'teacch',
  visual_timer: 'teacch',
  read_aloud: 'teacch',
  minimal_ui: 'teacch',
  transition_support: 'teacch',
  social_stories: 'teacch',
};

const ALL_COMPONENTS = ['basic_app', 'reporting', 'pedagog', 'teacch'];

/** Features gated by a component (excludes basic_app-only slugs). */
const PACKAGE_FEATURES = Object.entries(FEATURE_TO_COMPONENT)
  .filter(([, component]) => component !== 'basic_app')
  .map(([slug]) => slug);

function getComponentForFeature(featureSlug) {
  return FEATURE_TO_COMPONENT[featureSlug] ?? null;
}

function getFeaturesForComponent(componentSlug) {
  return Object.entries(FEATURE_TO_COMPONENT)
    .filter(([, component]) => component === componentSlug)
    .map(([slug]) => slug);
}

module.exports = {
  FEATURE_TO_COMPONENT,
  ALL_COMPONENTS,
  PACKAGE_FEATURES,
  getComponentForFeature,
  getFeaturesForComponent,
};
