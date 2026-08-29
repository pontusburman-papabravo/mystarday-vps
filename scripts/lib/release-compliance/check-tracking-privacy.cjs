'use strict';

/**
 * CHECK H — Tracking / privacy.
 *
 * Cross-checks the repo's declared tracking posture ("no ATT, no IDFA",
 * see docs/meta-app-events.md) against what the native config actually
 * contains. A mismatch between "what the app does" and "what the store
 * privacy declaration says" cannot be fully verified without App Store
 * Connect / Play Console access — those items are MANUAL_REVIEW_REQUIRED.
 */

const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { readFileSafe, fileExists } = require('./fs-utils.cjs');

function checkNoAttUsageDescription(repoRoot, config) {
  const infoPlist = readFileSafe(repoRoot, 'ios/App/App/Info.plist');
  if (infoPlist == null) {
    return { id: 'no_att_usage_description', status: STATUS.NOT_APPLICABLE, evidence: { reason: 'ios/App not present in this checkout' } };
  }
  const forbidden = config.trackingDeclaration?.expectedInfoPlistMustNotContain || ['NSUserTrackingUsageDescription'];
  const found = forbidden.filter((key) => infoPlist.includes(key));
  return {
    id: 'no_att_usage_description',
    status: found.length ? STATUS.FAIL : STATUS.PASS,
    evidence: { found, declaration: 'docs/meta-app-events.md states no ATT / no IDFA' },
  };
}

function checkNoAttPluginInPodfile(repoRoot) {
  const podfile = readFileSafe(repoRoot, 'ios/App/Podfile');
  if (podfile == null) {
    return { id: 'no_att_plugin_in_podfile', status: STATUS.NOT_APPLICABLE, evidence: { reason: 'ios/App/Podfile not present in this checkout' } };
  }
  const hasAttPod = /AppTrackingTransparency/i.test(podfile);
  return { id: 'no_att_plugin_in_podfile', status: hasAttPod ? STATUS.FAIL : STATUS.PASS, evidence: { hasAttPod } };
}

function checkMetaNativeSdkAbsence(repoRoot, config) {
  const expected = config.trackingDeclaration?.metaNativeSdkExpected;
  const podfile = readFileSafe(repoRoot, 'ios/App/Podfile');
  if (podfile == null) {
    return { id: 'meta_native_sdk_absence', status: STATUS.NOT_APPLICABLE, evidence: { reason: 'ios/App/Podfile not present in this checkout' } };
  }
  const hasMetaSdk = /FBSDKCoreKit|FacebookSDK/i.test(podfile);
  const ok = hasMetaSdk === Boolean(expected);
  return { id: 'meta_native_sdk_absence', status: ok ? STATUS.PASS : STATUS.FAIL, evidence: { hasMetaSdk, expected } };
}

function checkAnalyticsProvidersDocumented(repoRoot) {
  const doc = readFileSafe(repoRoot, 'docs/meta-app-events.md');
  return {
    id: 'analytics_providers_documented',
    status: doc ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED,
    evidence: { found: Boolean(doc) },
  };
}

function runTrackingPrivacyChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const checks = [
    checkNoAttUsageDescription(repoRoot, config),
    checkNoAttPluginInPodfile(repoRoot),
    checkMetaNativeSdkAbsence(repoRoot, config),
    checkAnalyticsProvidersDocumented(repoRoot),
    {
      id: 'store_privacy_declaration_matches_code',
      status: STATUS.MANUAL_REVIEW_REQUIRED,
      evidence: {
        reason:
          'App Store "App Privacy" answers and Play "Data Safety" form live in the store consoles, not in this repo. Confirm they still say "does not track" / no advertising ID before every submission.',
      },
    },
  ];
  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'H_tracking_privacy',
    title: 'H — Tracking / privacy',
    status,
    summary:
      status === STATUS.FAIL
        ? 'Native config contradicts the documented "no ATT / no IDFA / no Meta native SDK" tracking posture.'
        : 'Native config matches the documented no-tracking posture. Store console privacy declarations still require manual confirmation.',
    evidence: { checks },
  };
}

module.exports = { runTrackingPrivacyChecks };
