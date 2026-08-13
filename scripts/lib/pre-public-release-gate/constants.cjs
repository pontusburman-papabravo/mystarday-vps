'use strict';

/** Machine-readable check statuses — never collapse NOT_VERIFIED into PASS. */
const STATUS = Object.freeze({
  PASS: 'PASS',
  BLOCKER: 'BLOCKER',
  NOT_VERIFIED: 'NOT_VERIFIED',
  EXCLUDED: 'EXCLUDED',
});

/** Process exit codes. 0 is GO only. */
const EXIT = Object.freeze({
  GO: 0,
  BLOCKER: 1,
  NOT_VERIFIED: 2,
});

/**
 * Global flags that must remain OFF before a public family-device / widget rollout.
 * Widget flags are checked so they stay OFF — the gate never enables them.
 */
const FLAGS_MUST_BE_OFF = Object.freeze([
  'trusted_device_v1',
  'family_device_entry_v1',
  'adult_privilege_v1',
  'family_device_daily_ux_v1',
  'native_widget_enabled',
  'widget_completion_enabled',
]);

const FAMILY_DEVICE_FLAGS = Object.freeze([
  'trusted_device_v1',
  'family_device_entry_v1',
  'adult_privilege_v1',
  'family_device_daily_ux_v1',
]);

const WIDGET_FLAGS = Object.freeze(['native_widget_enabled', 'widget_completion_enabled']);

const WIDGET_EXCLUSION = Object.freeze({
  keys: WIDGET_FLAGS,
  reason: 'Widget rollout is paused and out of scope. Flags must stay OFF. Do not enable.',
});

/** Kill switches whose *source default* must stay secure for public rollout. */
const KILL_SWITCH_SOURCE = Object.freeze([
  {
    id: 'AUTHZ_HARDENING_ENABLED',
    file: 'src/middleware/authz.js',
    mustMatch: /AUTHZ_HARDENING_ENABLED\s*!==\s*'false'/,
    secureDefault: 'ON unless env === "false"',
  },
  {
    id: 'RATE_LIMIT_ENABLED',
    file: 'src/lib/config.js',
    mustMatch: /RATE_LIMIT_ENABLED\s*!==\s*'false'/,
    secureDefault: 'ON unless env === "false"',
  },
]);

const MAINTENANCE_FLAG = 'maintenance';

const REPORT_SECTIONS = Object.freeze([
  'family_device',
  'parent_pin_handoff',
  'child_runtime',
  'activity_timer',
  'image_library',
  'avatars',
  'android',
  'ios_native',
  'widget',
  'ci_health',
  'migrations',
  'flags',
  'kill_switches',
  'prod_acceptance',
]);

/** Sections that vote for public-runtime GO. Widget + prod_acceptance excluded. */
const PUBLIC_RUNTIME_SECTIONS = Object.freeze([
  'family_device',
  'parent_pin_handoff',
  'child_runtime',
  'activity_timer',
  'image_library',
  'avatars',
  'ci_health',
  'migrations',
  'flags',
  'kill_switches',
]);

/** Sections that vote for native-store readiness (in addition to runtime). */
const NATIVE_STORE_SECTIONS = Object.freeze(['android', 'ios_native']);

const PROFILES = Object.freeze({
  PUBLIC_RUNTIME: 'public-runtime',
  NATIVE_STORE: 'native-store',
});

const DEFAULT_PROFILE = PROFILES.PUBLIC_RUNTIME;

module.exports = {
  STATUS,
  EXIT,
  FLAGS_MUST_BE_OFF,
  FAMILY_DEVICE_FLAGS,
  WIDGET_FLAGS,
  WIDGET_EXCLUSION,
  KILL_SWITCH_SOURCE,
  MAINTENANCE_FLAG,
  REPORT_SECTIONS,
  PUBLIC_RUNTIME_SECTIONS,
  NATIVE_STORE_SECTIONS,
  PROFILES,
  DEFAULT_PROFILE,
};
