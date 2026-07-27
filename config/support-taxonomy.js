/**
 * Support taxonomy — root causes and resolution types for contact_message ops.
 * Used by admin inbox classification, analytics, and auto-archive reporting.
 */

const ROOT_CAUSES = {
  navigation_ui: 'Navigation / UI',
  auth_login: 'Inloggning / konto',
  schedule_routine: 'Schema / rutiner',
  rewards_stars: 'Stjärnor / belöningar',
  child_view: 'Barnvy',
  parent_view: 'Föräldervy',
  notifications_push: 'Notiser / push',
  paywall_subscription: 'Prenumeration / paywall',
  onboarding: 'Onboarding',
  performance: 'Prestanda / laddning',
  data_sync: 'Synk / data',
  user_confusion: 'Användarfråga (ej bugg)',
  feature_request: 'Önskemål om funktion',
  duplicate_report: 'Dubblett av känt ärende',
  unknown: 'Okänd / ej klassad',
};

const RESOLUTION_TYPES = {
  bugfix_deployed: 'Bugfix utrullad',
  workaround_documented: 'Workaround dokumenterad',
  user_education: 'Guidning till användaren',
  config_change: 'Konfigurationsändring',
  feature_shipped: 'Funktion levererad',
  duplicate: 'Dubblett — redan hanterat',
  wont_fix: 'Avslås / by design',
  no_action_needed: 'Ingen åtgärd behövdes',
  pending_engineering: 'Väntar på utveckling',
};

const AUTO_ARCHIVE_DAYS = 14;

function isValidRootCause(code) {
  return Boolean(code && Object.prototype.hasOwnProperty.call(ROOT_CAUSES, code));
}

function isValidResolutionType(code) {
  return Boolean(code && Object.prototype.hasOwnProperty.call(RESOLUTION_TYPES, code));
}

module.exports = {
  ROOT_CAUSES,
  RESOLUTION_TYPES,
  AUTO_ARCHIVE_DAYS,
  isValidRootCause,
  isValidResolutionType,
};
