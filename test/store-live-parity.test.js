'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('crypto');
const {
  buildDesiredState,
  buildReport,
  fillDrift,
  nativeBinaryReport,
  formatSummary,
  parseSyncArgs,
  assertSyncMode,
  buildSyncPlan,
  appleCredentialGaps,
  googleCredentialGaps,
} = require('../src/lib/store-live-parity');
const {
  assertAppleRead,
  assertGoogleRead,
  normalizeTerritory,
  readAppleInventory,
  readGoogleInventory,
} = require('../src/lib/store-connect-read');

const APPLE_FALLBACKS = ['bg-BG', 'et-EE', 'lt-LT', 'lv-LV', 'is-IS', 'ga-IE', 'mt-MT'];

function httpResult(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function copyListing(listing) {
  return { ...listing };
}

describe('store live parity desired state', () => {
  const desired = buildDesiredState();

  it('uses the app catalog and keeps SE, IE, and CA as the only live markets', () => {
    assert.equal(desired.localeIds.length, 26);
    assert.equal(desired.publicSelectable.length, 23);
    assert.deepEqual(desired.hidden, ['is-IS', 'ga-IE', 'mt-MT']);
    assert.deepEqual(desired.liveMarkets, ['SE', 'IE', 'CA']);
    assert.equal(desired.liveMarketsMatchExpected, true);
    assert.equal(desired.appleDesiredLocales.length, 19);
    assert.equal(desired.googleDesiredLocales.length, 24);
    for (const id of desired.localeIds) {
      assert.equal(desired.locales[id].REPO_READY, true, id);
    }
  });

  it('treats Apple en-GB fallback locales as app locales without their own metadata locale', () => {
    assert.deepEqual(
      desired.localeIds.filter((id) => desired.locales[id].apple.explicitFallback),
      APPLE_FALLBACKS,
    );
    for (const id of APPLE_FALLBACKS) {
      assert.equal(desired.locales[id].apple.nativeLocale, null);
      assert.equal(desired.locales[id].apple.fallback, 'en-GB');
      assert.equal(desired.appleDesiredLocales.includes(id), false);
    }
    assert.equal(desired.locales['ga-IE'].google.explicitFallback, true);
    assert.equal(desired.locales['ga-IE'].google.fallback, 'en-GB');
    assert.equal(desired.locales['is-IS'].google.nativeLocale, 'is-IS');
    assert.equal(desired.locales['de-DE'].MARKET_ENABLED, false);
    assert.deepEqual(desired.locales['de-DE'].marketIds, ['DE', 'AT']);
    assert.equal(desired.locales['sv-SE'].MARKET_ENABLED, true);
  });

  it('compares the base en-GB listing, not the Ireland complimentary override', () => {
    const description = desired.locales['en-GB'].apple.listing.description;
    assert.equal(description.includes('Ireland until 31 December 2026'), false);
  });
});

describe('store live parity comparison', () => {
  const desired = buildDesiredState();

  function appleFixture(territories, mutate) {
    const localizations = {};
    for (const locale of ['sv', 'en-GB']) {
      const appLocale = locale === 'sv' ? 'sv-SE' : 'en-GB';
      localizations[locale] = copyListing(desired.locales[appLocale].apple.listing);
    }
    if (mutate) mutate(localizations);
    return {
      accessible: true,
      territories,
      localizations,
      subscriptions: { status: 'NOT_READ' },
      edit: { created: false, committed: false, leftOpen: false },
    };
  }

  it('reports an unread store as unknown and invents no upload list', () => {
    const report = fillDrift(buildReport({ native: nativeBinaryReport() }));
    assert.equal(report.appCodeContent, 'READY');
    assert.equal(report.apple.status, 'NOT ACCESSIBLE');
    assert.equal(report.google.status, 'NOT ACCESSIBLE');
    assert.equal(report.markets.status, 'NOT ACCESSIBLE');
    assert.equal(report.locales['is-IS'].apple.actualFallbackState, 'UNKNOWN');
    assert.equal(report.locales['is-IS'].apple.nativeMetadataLocale, 'unsupported');
    assert.equal(report.locales['is-IS'].apple.desiredFallback, 'en-GB');
    assert.equal(report.locales['ga-IE'].google.actualFallbackState, 'UNKNOWN');
    assert.equal(report.locales['de-DE'].REPO_READY, true);
    assert.equal(report.locales['de-DE'].MARKET_ENABLED, false);
    assert.equal(report.locales['de-DE'].apple.STORE_CONTENT_PRESENT, null);
    assert.deepEqual(report.proposedChanges, []);
    assert.match(formatSummary(report), /APPLE LIVE STORE PARITY: NOT ACCESSIBLE/);
    assert.match(formatSummary(report), /Metadata sync requires a new binary: no/);
    assert.equal(report.native.metadataSyncRequiresNewBinary, false);
    assert.equal(report.native.storeBinaryLanguagesStatus, 'UNKNOWN');
    assert.deepEqual(report.native.hiddenLocalesDeclaredOnIos, []);
  });

  it('matches fallback en-GB without calling a missing Apple locale an error', () => {
    const report = fillDrift(buildReport({
      apple: appleFixture(['SE', 'IE', 'CA']),
      google: { accessible: false, missingCredentials: ['GOOGLE_PLAY_SERVICE_ACCOUNT_JSON or GOOGLE_PLAY_SERVICE_ACCOUNT_PATH'] },
    }));
    assert.equal(report.locales['is-IS'].apple.actualFallbackState, 'MATCH');
    assert.equal(report.locales['de-DE'].apple.STORE_CONTENT_PRESENT, false);
    assert.equal(report.locales['de-DE'].apple.STORE_CONTENT_MATCHES_REPO, false);
    assert.equal(report.locales['sv-SE'].apple.STORE_CONTENT_MATCHES_REPO, true);
    assert.equal(report.apple.present, 2);
    assert.equal(report.apple.matching, 2);
    assert.equal(report.apple.missing, 17);
    assert.equal(report.apple.drift, 0);
    assert.equal(report.markets.apple.accessible, true);
    assert.equal(report.markets.status, 'NOT ACCESSIBLE');
    const german = report.proposedChanges.filter((change) => change.store === 'apple' && change.locale === 'de-DE');
    assert.deepEqual(german.map((change) => change.kind).sort(), ['asset_upload', 'metadata_only']);
    assert.equal(german.every((change) => change.impact === 'WOULD_CHANGE_LIVE_LISTING'), true);
    assert.equal(german.every((change) => change.approval === 'REQUIRES_EXPLICIT_APPROVAL'), true);
    assert.equal(german.every((change) => change.safeToStage === false), true);
    assert.equal(report.proposedChanges.some((change) => change.kind === 'availability_change'), false);
    assert.equal(report.proposedChanges.some((change) => change.kind === 'iap_localization'), false);
    assert.equal(report.proposedChanges.some((change) => change.kind === 'binary_required'), false);
  });

  it('marks a drifted en-GB fallback as a mismatch', () => {
    const report = fillDrift(buildReport({
      apple: appleFixture(['SE', 'IE', 'CA'], (localizations) => {
        localizations['en-GB'].name = 'Something else';
      }),
    }));
    assert.equal(report.locales['is-IS'].apple.actualFallbackState, 'MISMATCH');
    assert.equal(report.locales['en-GB'].apple.STORE_CONTENT_MATCHES_REPO, false);
    assert.equal(report.apple.drift, 1);
  });

  it('flags a planned market that is actually available and does not change it', () => {
    const report = fillDrift(buildReport({
      apple: appleFixture(['SE', 'IE', 'CA', 'DE', 'US']),
      google: {
        accessible: true,
        territories: ['SE', 'IE', 'CA'],
        localizations: {},
        subscriptions: { status: 'ABSENT', listings: [] },
        edit: { created: true, committed: false, leftOpen: false },
      },
    }));
    assert.deepEqual(report.markets.p0, ['DE']);
    assert.equal(report.markets.status, 'DRIFT');
    assert.equal(report.drift[0].code, 'P0 STORE AVAILABILITY DRIFT');
    assert.equal(report.markets.apple.unexpected.includes('US'), true);
    assert.equal(report.markets.p0.includes('US'), false);
    assert.equal(report.guards.marketActivationPerformed, false);
    assert.equal(report.guards.appleWritePerformed, false);
    assert.equal(report.guards.googleEditCommitted, false);
  });

  it('does not treat a missing Play privacy URL as listing drift', () => {
    const listing = copyListing(desired.locales['sv-SE'].google.listing);
    delete listing.privacyPolicyUrl;
    delete listing.supportUrl;
    const report = fillDrift(buildReport({
      google: {
        accessible: true,
        territories: ['SE', 'IE', 'CA'],
        localizations: { 'sv-SE': listing },
        subscriptions: { status: 'NOT_READ' },
      },
    }));
    assert.equal(report.locales['sv-SE'].google.STORE_CONTENT_MATCHES_REPO, true);
  });
});

describe('store sync guards', () => {
  it('refuses write mode before any store call', () => {
    const args = parseSyncArgs(['--write', '--dry-run', '--allow-market-activation']);
    assert.throws(() => assertSyncMode(args), (error) => error.code === 'STORE_WRITE_LOCKED');
    assert.throws(() => assertSyncMode(parseSyncArgs([])), (error) => error.code === 'STORE_SYNC_MODE_REQUIRED');
  });

  it('keeps market activation out of a metadata dry-run', () => {
    const report = fillDrift(buildReport());
    const plan = buildSyncPlan(report, parseSyncArgs(['--dry-run', '--allow-market-activation']));
    assert.equal(plan.write, false);
    assert.equal(plan.marketActivation, false);
    assert.equal(plan.availabilityChangesIncluded, false);
    assert.equal(plan.blocked, true);
    assert.deepEqual(plan.apple, []);
    assert.deepEqual(plan.google, []);
  });

  it('names the missing credentials and never assumes store contents', () => {
    assert.deepEqual(appleCredentialGaps({}), [
      'APP_STORE_CONNECT_ISSUER_ID',
      'APP_STORE_CONNECT_KEY_ID',
      'APP_STORE_CONNECT_PRIVATE_KEY or APP_STORE_CONNECT_PRIVATE_KEY_PATH',
    ]);
    assert.deepEqual(googleCredentialGaps({}), [
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON or GOOGLE_PLAY_SERVICE_ACCOUNT_PATH',
    ]);
    assert.deepEqual(appleCredentialGaps({
      APP_STORE_CONNECT_ISSUER_ID: 'issuer',
      APP_STORE_CONNECT_KEY_ID: 'key',
      APP_STORE_CONNECT_PRIVATE_KEY_PATH: '/tmp/key.p8',
    }), []);
  });
});

describe('store readers stay read-only', () => {
  it('rejects Apple writes and Google commits', () => {
    assert.throws(() => assertAppleRead('POST'), /APPLE_WRITE_FORBIDDEN/);
    assert.throws(() => assertGoogleRead('POST', 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app/edits/1:commit'), /GOOGLE_COMMIT_FORBIDDEN/);
    assert.throws(() => assertGoogleRead('PATCH', 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app/edits/1'), /GOOGLE_WRITE_FORBIDDEN/);
    assert.doesNotThrow(() => assertGoogleRead('POST', 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app/edits'));
    assert.doesNotThrow(() => assertGoogleRead('DELETE', 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app/edits/edit-1'));
    assert.equal(normalizeTerritory('SWE'), 'SE');
    assert.equal(normalizeTerritory('DE'), 'DE');
  });

  it('opens a Play edit only to read it, then deletes it', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push(`${opts.method} ${url}`);
      if (url.includes('oauth2.googleapis.com')) return httpResult(200, { access_token: 'token' });
      if (opts.method === 'POST' && url.endsWith('/edits')) return httpResult(200, { id: 'edit-1' });
      if (opts.method === 'GET' && url.endsWith('/listings')) {
        return httpResult(200, {
          listings: [{ language: 'sv-SE', title: 'Namn', shortDescription: 'Kort', fullDescription: 'Lång' }],
        });
      }
      if (opts.method === 'GET' && /\/listings\/sv-SE\/(phoneScreenshots|featureGraphic)$/.test(url)) {
        return httpResult(200, { images: [] });
      }
      if (opts.method === 'GET' && url.includes('countryAvailability')) return httpResult(404, {});
      if (opts.method === 'GET' && url.includes('/tracks/')) return httpResult(404, {});
      if (opts.method === 'DELETE' && url.endsWith('/edits/edit-1')) return httpResult(200, {});
      if (opts.method === 'GET' && url.includes('/subscriptions/')) return httpResult(404, {});
      throw new Error(`unexpected ${opts.method} ${url}`);
    };
    const inventory = await readGoogleInventory({
      account: {
        client_email: 'reader@example.com',
        private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      },
      packageName: 'example.app',
      fetchImpl,
    });
    assert.equal(inventory.accessible, true);
    assert.equal(inventory.edit.created, true);
    assert.equal(inventory.edit.committed, false);
    assert.equal(inventory.edit.leftOpen, false);
    assert.equal(inventory.writesPerformed, false);
    assert.equal(inventory.localizations['sv-SE'].name, 'Namn');
    assert.equal(inventory.localizations['sv-SE'].phoneScreenshots, 0);
    assert.equal(inventory.subscriptions.status, 'ABSENT');
    assert.equal(calls.some((call) => call.includes(':commit') || call.includes('/commit')), false);
    assert.equal(calls.filter((call) => call.startsWith('DELETE ')).length, 1);
  });

  it('reads App Store Connect with GET only', async () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push(`${opts.method} ${url}`);
      assert.equal(opts.method, 'GET');
      if (url.includes('/v1/apps?')) return httpResult(200, { data: [{ id: 'app1' }] });
      if (url.includes('include=appInfos')) {
        return httpResult(200, {
          data: { id: 'app1', attributes: { primaryLocale: 'sv' } },
          included: [
            { type: 'appInfos', id: 'info1' },
            { type: 'appStoreVersions', id: 'ver1', attributes: { appStoreState: 'READY_FOR_SALE' } },
          ],
        });
      }
      if (url.includes('/appInfoLocalizations')) {
        return httpResult(200, {
          data: [{ id: 'l1', attributes: { locale: 'sv', name: 'Namn', subtitle: 'Underrubrik', privacyPolicyUrl: 'https://example.test/privacy' } }],
        });
      }
      if (url.includes('/appStoreVersionLocalizations')) {
        return httpResult(200, {
          data: [{
            id: 'vl1',
            attributes: {
              locale: 'sv',
              description: 'Beskrivning',
              keywords: 'rutin',
              promotionalText: 'Text',
              supportUrl: 'https://example.test/support',
              marketingUrl: '',
              whatsNew: '',
            },
          }],
        });
      }
      if (url.includes('appScreenshotSets')) return httpResult(200, { data: [{ id: 'set1' }] });
      if (url.includes('availableTerritories')) return httpResult(200, { data: [{ id: 'SWE' }, { id: 'IRL' }, { id: 'CAN' }] });
      if (url.includes('subscriptionGroups')) return httpResult(200, { data: [], included: [] });
      throw new Error(`unexpected ${url}`);
    };
    const inventory = await readAppleInventory({
      env: {
        APP_STORE_CONNECT_ISSUER_ID: 'issuer',
        APP_STORE_CONNECT_KEY_ID: 'key',
        APP_STORE_CONNECT_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      },
      fetchImpl,
    });
    assert.equal(inventory.writesPerformed, false);
    assert.equal(inventory.primaryLocale, 'sv');
    assert.equal(inventory.versionState, 'READY_FOR_SALE');
    assert.deepEqual(inventory.territories, ['CA', 'IE', 'SE']);
    assert.equal(inventory.localizations.sv.screenshotSetCount, 1);
    assert.equal(inventory.subscriptions.status, 'READ');
    assert.equal(inventory.binaryLanguages, null);
    assert.equal(calls.every((call) => call.startsWith('GET ')), true);
  });
});
