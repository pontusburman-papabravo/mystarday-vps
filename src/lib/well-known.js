/**
 * Well-known responses for App Links / Universal Links (Sprint 22a).
 */

function buildAssetLinks() {
  const pkg = process.env.ANDROID_PACKAGE_NAME || 'se.mystarday.app';
  const sha256 = process.env.ANDROID_SHA256_CERT_FINGERPRINT || '';

  if (!sha256) {
    return [{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'web', site: 'https://mystarday.se' },
    }];
  }

  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: pkg,
      sha256_cert_fingerprints: sha256.split(',').map((s) => s.trim()).filter(Boolean),
    },
  }];
}

function buildAppleAppSiteAssociation() {
  const teamId = process.env.APPLE_TEAM_ID || 'TEAMID';
  const bundleId = process.env.APNS_BUNDLE_ID || process.env.IOS_BUNDLE_ID || 'se.mystarday.app';
  return {
    applinks: {
      apps: [],
      details: [{
        appID: `${teamId}.${bundleId}`,
        paths: [
          '/accept-invite*',
          '/pedagog-invite*',
          '/verify-email*',
          '/verify-email-change*',
          '/reset-password*',
          '/register*',
          '/invite/*',
          '/open/child',
          '/open/child*',
          '/child-login*',
          '/child-dashboard*',
          '/child/today*',
          '/child/world*',
          '/child/collection*',
          '/child/treasure*',
          '/child/family*',
        ],
      }],
    },
  };
}

module.exports = { buildAssetLinks, buildAppleAppSiteAssociation };
