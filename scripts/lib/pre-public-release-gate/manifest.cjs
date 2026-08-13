'use strict';

/**
 * Pre-public release gate manifest — maps product areas to existing tests.
 * Widget acceptance is EXCLUDED. Widget *flags* are still asserted OFF.
 */

const FAMILY_DEVICE_UNIT = [
  'test/trusted-device-contract.test.js',
  'test/app-entry-resolve.test.js',
  'test/app-entry-orchestrator-contract.test.js',
  'test/session-gate-entry-orchestrator.test.js',
  'test/fas-2-adversarial-entry.test.js',
  'test/fas-4a-daily-child-ux.test.js',
  'test/fas-4b-device-settings.test.js',
  'test/family-device-offline-queue-contract.test.js',
  'test/family-device-prod-pilot-harness.test.js',
  'test/family-device-global-readiness-matrix.test.js',
  'test/family-device-observability-contract.test.js',
  'test/native-bridge-contract.test.js',
  'test/adult-privilege-native.test.js',
  'test/adult-privilege-client.test.js',
  'test/adult-privilege-lifecycle-capacitor.test.js',
  'test/adult-privilege-lease-policy.test.js',
  'test/adult-privilege-auto-lock-matrix.test.js',
  'test/r43-child-login-authz.test.js',
  'test/native-startup-family.test.js',
  'test/child-login-session-resume.test.js',
  'test/native-child-cold-launch-harness.test.js',
  'test/r4-runtime-release-gates.test.js',
];

const FAMILY_DEVICE_DB = [
  'test/trusted-device-child.integration.test.js',
  'test/trusted-device-parent.integration.test.js',
  'test/trusted-device-handoff.integration.test.js',
  'test/family-device-entry.integration.test.js',
  'test/build-app-entry-input.integration.test.js',
  'test/adult-privilege.integration.test.js',
  'test/adult-privilege-lock.integration.test.js',
  'test/fas-4b-device-settings.integration.test.js',
  'test/trusted-profile-p1-remediation.integration.test.js',
  'test/trusted-profile-final-security.integration.test.js',
  'test/trusted-profile-p1-pin-limiter.integration.test.js',
  'test/profile-switch-parent-return.integration.test.js',
  'test/family-device-schedule-parity-profile-switch.integration.test.js',
  'test/r43-shared-device.integration.test.js',
  'test/r44-adult-child-access.integration.test.js',
  'test/r4-final-security-blockers.integration.test.js',
  'test/r4-final-authority.integration.test.js',
  'test/r4-freeze-closure.integration.test.js',
];

const PARENT_PIN_UNIT = [
  'test/auth-parent-handoff-i18n.test.js',
  'test/auth-parent-handoff-restore.test.js',
  'test/settings-switch-user-handoff.test.js',
  'test/parent-child-handoff-logout-client.test.js',
  'test/parent-session-backup-security.test.js',
  'test/refresh-token-cookie-guard.test.js',
  'test/validate-child-login.test.js',
  'test/child-login-pin-a11y.test.js',
  'test/onboarding-handoff-p0.test.js',
  'test/dashboard-post-schema-handoff.test.js',
];

const PARENT_PIN_DB = [
  'test/parent-child-handoff-pin.integration.test.js',
  'test/parent-child-handoff-logout-jwt.integration.test.js',
  'test/parent-handoff-refresh-cookie.integration.test.js',
  'test/parent-session-handoff.integration.test.js',
  'test/onboarding-handoff-resume.test.js',
  'test/pin-warning-revoked-parent.integration.test.js',
];

const CHILD_RUNTIME_UNIT = [
  'test/daily-log-child-order.test.js',
  'test/child-daily-log-order-client.test.js',
  'test/daily-log-reorder.test.js',
  'test/child-dashboard-order-parity.test.js',
  'test/child-substep-toggle-contract.test.js',
  'test/schedule-section-order-contract.test.js',
  'test/child-core-journey-harness-contract.test.js',
  'test/substep-icon-nullable.test.js',
  'test/completion-client-origin.test.js',
  'test/completion-sse-origin.client.test.js',
  'test/child-dashboard-checkoff-429.client.test.js',
  'test/revoked-access-contract.test.js',
];

const CHILD_RUNTIME_DB = [
  'test/child-daily-log-order.integration.test.js',
  'test/child-substep-order.integration.test.js',
  'test/child-substep-progression.integration.test.js',
  'test/child-access-integration.test.js',
  'test/child-login-cross-family.integration.test.js',
  'test/child-routine-mutation-limiter.integration.test.js',
  'test/schedules-revoked-parent.integration.test.js',
];

const ACTIVITY_TIMER_UNIT = [
  'test/activity-timer.test.js',
  'test/activity-timer-session.test.js',
  'test/activity-timer-v2-ui.test.js',
  'test/activity-timer-click-layout.test.js',
  'test/library-activity-timer-bridge.test.js',
];

const ACTIVITY_TIMER_DB = ['test/activity-timer-child-api.integration.test.js'];

const IMAGE_LIBRARY_UNIT = [
  'test/family-image-library.test.js',
  'test/i18n-library-images.test.js',
  'test/bildstod-core.test.js',
];

const IMAGE_LIBRARY_DB = [
  'test/family-images-authz.test.js',
  'test/pictograms-api.test.js',
];

const AVATAR_UNIT = [
  'test/avatar-upload-fix.test.js',
  'test/family-ui-avatar-menu-fix.test.js',
];

const AVATAR_DB = ['test/family-avatar-v1.test.js'];

const ANDROID_UNIT = [
  'test/android-aab-release-gate.test.js',
  'test/android-play-stability.test.js',
  'test/android-release-hardening.test.js',
  'test/aab-download.test.js',
  'test/verify-meta-native-release-platform.test.js',
];

const IOS_UNIT = [
  'test/ios-att-tracking.test.js',
  'test/ios-no-att-release-hardening.test.js',
  'test/ios-swedish-localization.test.js',
];

const MIGRATION_UNIT = [
  'test/migration-files-immutable.test.js',
  'test/migration-destructive-contract.test.js',
];

const MIGRATION_DB = [
  'test/migration-rollback-gate.test.js',
  'test/migration-iap-safety.integration.test.js',
];

/**
 * Tests in scope that were missing from `test:gate` on origin/main.
 * The gate always runs these even before they are added to CI.
 */
const EXTRA_UNIT = [
  'test/avatar-upload-fix.test.js',
  'test/family-ui-avatar-menu-fix.test.js',
  'test/activity-timer-v2-ui.test.js',
  'test/activity-timer-click-layout.test.js',
  'test/library-activity-timer-bridge.test.js',
  'test/substep-icon-nullable.test.js',
  'test/dashboard-post-schema-handoff.test.js',
];

const EXTRA_DB = ['test/child-substep-progression.integration.test.js'];

const AREAS = Object.freeze({
  family_device: {
    title: 'Family device',
    unit: FAMILY_DEVICE_UNIT,
    db: FAMILY_DEVICE_DB,
    covers: [
      'trusted device',
      'family_device_entry_v1',
      'adult_privilege_v1',
      'family_device_daily_ux_v1',
      'cold start / session restore',
      'single-child family',
      'multi-child family',
      'child → adult with PIN',
      'adult → child/profile switch',
      'wrong-child isolation',
      'revocation / logout / expired trusted device',
    ],
  },
  parent_pin_handoff: {
    title: 'Parent PIN / handoff',
    unit: PARENT_PIN_UNIT,
    db: PARENT_PIN_DB,
    covers: ['select-parent', 'parent PIN', 'parent handoff'],
  },
  child_runtime: {
    title: 'Child runtime',
    unit: CHILD_RUNTIME_UNIT,
    db: CHILD_RUNTIME_DB,
    covers: ['child schedule order parity', 'substeps', 'wrong-child isolation'],
  },
  activity_timer: {
    title: 'Activity timer',
    unit: ACTIVITY_TIMER_UNIT,
    db: ACTIVITY_TIMER_DB,
    covers: ['activity timer'],
  },
  image_library: {
    title: 'Image library',
    unit: IMAGE_LIBRARY_UNIT,
    db: IMAGE_LIBRARY_DB,
    covers: ['Bildarkiv / egna aktivitetsbilder'],
  },
  avatars: {
    title: 'Avatars',
    unit: AVATAR_UNIT,
    db: AVATAR_DB,
    covers: ['child avatar', 'parent avatar'],
  },
  android: {
    title: 'Android',
    unit: ANDROID_UNIT,
    db: [],
    covers: ['Android release prerequisites'],
    sourceScripts: [
      'scripts/verify-android-release-hardening.mjs',
      'scripts/assert-android-release-signing.mjs',
    ],
  },
  ios_native: {
    title: 'iOS native',
    unit: IOS_UNIT,
    db: [],
    covers: ['iOS ATT / no-ATT release hardening', 'Swedish localization'],
  },
  widget: {
    title: 'Widget',
    unit: [],
    db: [],
    excluded: true,
    covers: [],
  },
});

function unique(files) {
  return [...new Set(files)];
}

function allAreaFiles() {
  const files = [];
  for (const area of Object.values(AREAS)) {
    files.push(...(area.unit || []), ...(area.db || []));
  }
  return unique(files);
}

function extraFiles() {
  return { unit: EXTRA_UNIT.slice(), db: EXTRA_DB.slice() };
}

module.exports = {
  AREAS,
  EXTRA_UNIT,
  EXTRA_DB,
  MIGRATION_UNIT,
  MIGRATION_DB,
  allAreaFiles,
  extraFiles,
  unique,
};
