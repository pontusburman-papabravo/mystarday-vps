'use strict';

/**
 * CHECK I — Version / build / cache consistency.
 *
 * Verifies the SW cache-version pipeline is not drifted, and that the
 * marketing version strings for iOS/Android are present and readable.
 * Whether the *next* Android versionCode / iOS build number is actually
 * higher than the last one accepted by the store cannot be known from a
 * repo checkout alone — those remain MANUAL_REVIEW_REQUIRED.
 */

const { STATUS, worstStatus } = require('./constants.cjs');
const { loadReleaseComplianceConfig } = require('./load-config.cjs');
const { readFileSafe, fileExists } = require('./fs-utils.cjs');

function checkSwCacheVersionMatchesConfig(repoRoot, config) {
  const versionFile = config.versionSources?.cacheVersionFile || 'config/cache-version.json';
  const swFile = config.versionSources?.swFile || 'public/sw.js';
  const constName = config.versionSources?.swCacheNameConst || 'CACHE_NAME';

  const versionRaw = readFileSafe(repoRoot, versionFile);
  const swRaw = readFileSafe(repoRoot, swFile);
  if (versionRaw == null || swRaw == null) {
    return { id: 'sw_cache_version_matches_config', status: STATUS.FAIL, evidence: { reason: 'missing_file', versionFile, swFile } };
  }
  let parsed;
  try {
    parsed = JSON.parse(versionRaw);
  } catch {
    return { id: 'sw_cache_version_matches_config', status: STATUS.FAIL, evidence: { reason: 'invalid_json', versionFile } };
  }
  const expectedCacheName = parsed.cacheName;
  const swMatch = swRaw.match(new RegExp(`const ${constName}\\s*=\\s*'([^']+)'`));
  const actualCacheName = swMatch ? swMatch[1] : null;
  const status = expectedCacheName && actualCacheName === expectedCacheName ? STATUS.PASS : STATUS.FAIL;
  return {
    id: 'sw_cache_version_matches_config',
    status,
    evidence: { expectedCacheName, actualCacheName, note: 'Run `npm run css:build` to resync if drifted.' },
  };
}

function checkIosMarketingVersionPresent(repoRoot, config) {
  const file = config.versionSources?.iosProjectFile || 'ios/App/App.xcodeproj/project.pbxproj';
  const content = readFileSafe(repoRoot, file);
  if (content == null) {
    return { id: 'ios_marketing_version_present', status: STATUS.NOT_APPLICABLE, evidence: { reason: 'ios/App not present in this checkout' } };
  }
  const versionMatch = content.match(/MARKETING_VERSION\s*=\s*([\d.]+);/);
  const buildMatch = content.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/);
  return {
    id: 'ios_marketing_version_present',
    status: versionMatch && buildMatch ? STATUS.PASS : STATUS.FAIL,
    evidence: { marketingVersion: versionMatch?.[1] || null, buildNumber: buildMatch?.[1] || null },
  };
}

function checkAndroidVersionPresent(repoRoot, config) {
  const file = config.versionSources?.androidVersionFile || 'assets/play-store/android-version.json';
  const raw = readFileSafe(repoRoot, file);
  if (raw == null) {
    return { id: 'android_version_present', status: STATUS.FAIL, evidence: { reason: 'missing_file', file } };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { id: 'android_version_present', status: STATUS.FAIL, evidence: { reason: 'invalid_json', file } };
  }
  const status = parsed.versionCode && parsed.versionName ? STATUS.PASS : STATUS.FAIL;
  return { id: 'android_version_present', status, evidence: { versionCode: parsed.versionCode, versionName: parsed.versionName } };
}

function checkMarketingVersionParityInformational(repoRoot, config) {
  const iosContent = readFileSafe(repoRoot, config.versionSources?.iosProjectFile || 'ios/App/App.xcodeproj/project.pbxproj');
  const androidRaw = readFileSafe(repoRoot, config.versionSources?.androidVersionFile || 'assets/play-store/android-version.json');
  if (iosContent == null || androidRaw == null) {
    return { id: 'marketing_version_parity', status: STATUS.NOT_APPLICABLE, evidence: { reason: 'one_or_both_platforms_not_present' } };
  }
  const iosVersion = iosContent.match(/MARKETING_VERSION\s*=\s*([\d.]+);/)?.[1];
  let androidVersion;
  try {
    androidVersion = JSON.parse(androidRaw).versionName;
  } catch {
    androidVersion = null;
  }
  const status = iosVersion && androidVersion && iosVersion === androidVersion ? STATUS.PASS : STATUS.MANUAL_REVIEW_REQUIRED;
  return { id: 'marketing_version_parity', status, evidence: { iosVersion, androidVersion, note: 'Diverging marketing versions across platforms is allowed but must be intentional.' } };
}

function runVersionBuildCacheChecks(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const checks = [
    checkSwCacheVersionMatchesConfig(repoRoot, config),
    checkIosMarketingVersionPresent(repoRoot, config),
    checkAndroidVersionPresent(repoRoot, config),
    checkMarketingVersionParityInformational(repoRoot, config),
    {
      id: 'store_last_accepted_build_numbers',
      status: STATUS.MANUAL_REVIEW_REQUIRED,
      evidence: {
        reason:
          'The last iOS build number / Android versionCode actually accepted by App Store Connect / Play Console is not knowable from a repo checkout. Confirm the next build/versionCode is strictly higher before archiving.',
      },
    },
  ];
  const status = worstStatus(checks.map((c) => c.status));
  return {
    id: 'I_version_build_cache',
    title: 'I — Version / build / cache',
    status,
    summary:
      status === STATUS.FAIL
        ? 'SW cache version drifted from config, or a platform version file is missing/invalid.'
        : 'SW cache version matches config/cache-version.json and both platform version files are present and parse. Confirm against store console history before archiving.',
    evidence: { checks },
  };
}

module.exports = { runVersionBuildCacheChecks };
