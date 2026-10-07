'use strict';

/**
 * Read-only comparison of the store catalog with App Store Connect and
 * Google Play. Does not open markets or publish listings.
 *
 * Desired state comes only from store/locales.json, store/markets.json,
 * and the app locale catalog. There is no third language list.
 */

const fs = require('fs');
const path = require('path');
const {
  loadStoreCatalog,
  resolveStoreLocales,
  resolveStoreUrl,
  effectiveListing,
} = require('./store-locale');
const { SUPPORTED_LOCALES, isPublicLocale } = require('./locale');
const { brandName } = require('./public-html-placeholders');
const { IOS_BUNDLE_ID, ANDROID_PACKAGE_NAME, APPLE_PRODUCT_MONTHLY, APPLE_PRODUCT_YEARLY, GOOGLE_SUBSCRIPTION_PRODUCT } = require('../../config/iap-product-contract');

const EXPECTED_LIVE = Object.freeze(['SE', 'IE', 'CA']);
const APPLE_TEXT_FIELDS = Object.freeze([
  'name', 'subtitle', 'description', 'keywords', 'promotionalText',
  'privacyPolicyUrl', 'supportUrl', 'marketingUrl',
]);
const GOOGLE_TEXT_FIELDS = Object.freeze([
  'name', 'shortDescription', 'fullDescription', 'privacyPolicyUrl', 'supportUrl',
]);
const GOOGLE_COMPARE_FIELDS = Object.freeze([
  'name', 'shortDescription', 'fullDescription',
]);

const APPLE_CREDENTIAL_GAPS = Object.freeze([
  'APP_STORE_CONNECT_ISSUER_ID',
  'APP_STORE_CONNECT_KEY_ID',
  'APP_STORE_CONNECT_PRIVATE_KEY or APP_STORE_CONNECT_PRIVATE_KEY_PATH',
]);
const GOOGLE_CREDENTIAL_GAPS = Object.freeze([
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON or GOOGLE_PLAY_SERVICE_ACCOUNT_PATH',
]);

function appleCredentialGaps(env = process.env) {
  const missing = [];
  if (!env.APP_STORE_CONNECT_ISSUER_ID) missing.push(APPLE_CREDENTIAL_GAPS[0]);
  if (!env.APP_STORE_CONNECT_KEY_ID) missing.push(APPLE_CREDENTIAL_GAPS[1]);
  if (!env.APP_STORE_CONNECT_PRIVATE_KEY && !env.APP_STORE_CONNECT_PRIVATE_KEY_PATH) {
    missing.push(APPLE_CREDENTIAL_GAPS[2]);
  }
  return missing;
}

function googleCredentialGaps(env = process.env) {
  if (!env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON && !env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH) {
    return [GOOGLE_CREDENTIAL_GAPS[0]];
  }
  return [];
}

function normalizeText(value) {
  if (value && typeof value === 'object' && value.status === 'live_external') return null;
  const raw = typeof value === 'string' ? value : resolveStoreUrl(value);
  if (!raw) return '';
  return raw.replace(/\{\{brand\}\}/g, brandName()).replace(/\s+/g, ' ').trim();
}

function screenshotOrigin(catalog, storeName, storeLocale, side) {
  const shots = catalog.screenshots.sets[storeName] && catalog.screenshots.sets[storeName][storeLocale];
  if (side && side.fallback && shots && shots.status === 'live_external') return 'explicit_fallback';
  if (shots && shots.status === 'live_external') return 'native_locale';
  if (shots && shots.status === 'present') return 'native_locale';
  return null;
}

function iapCopy(catalog, storeName, storeLocale) {
  const out = {};
  for (const product of catalog.iap.products || []) {
    const copy = product[storeName] && product[storeName][storeLocale];
    out[product.id] = copy
      ? { name: normalizeText(copy.name), description: normalizeText(copy.description) }
      : null;
  }
  return out;
}

function listingPayload(storeName, storeLocale, fields) {
  const listing = effectiveListing(storeName, storeLocale, null);
  if (!listing) return null;
  const text = {};
  for (const field of fields) {
    if (field === 'releaseNotes') continue;
    text[field] = normalizeText(listing[field]);
  }
  const notes = listing.releaseNotes;
  text.releaseNotes = notes && typeof notes === 'object' && notes.status === 'live_external'
    ? null
    : normalizeText(notes);
  text.releaseNotesDeferred = Boolean(notes && typeof notes === 'object' && notes.status === 'live_external');
  return text;
}

function buildDesiredState(catalog = loadStoreCatalog()) {
  const appLocales = Object.keys(catalog.locales.appLocales || {});
  const catalogIds = [...SUPPORTED_LOCALES];
  const sameLocales = appLocales.length === catalogIds.length
    && catalogIds.every((id) => appLocales.includes(id));
  const markets = catalog.markets.markets || [];
  const liveMarkets = markets.filter((market) => market.activation === 'live').map((market) => market.id);
  const plannedMarkets = markets.filter((market) => market.activation !== 'live').map((market) => market.id);
  const marketsByAppLocale = {};
  for (const market of markets) {
    const key = market.defaultAppLocale;
    if (!key) continue;
    if (!marketsByAppLocale[key]) marketsByAppLocale[key] = [];
    marketsByAppLocale[key].push({ id: market.id, activation: market.activation });
  }

  const locales = {};
  const appleDirect = new Set();
  const googleDirect = new Set();

  for (const id of catalogIds) {
    const resolved = resolveStoreLocales(id, catalog);
    const hidden = !isPublicLocale(id);
    const appleLocale = resolved.apple && resolved.apple.direct;
    const googleLocale = resolved.google && resolved.google.direct;
    if (appleLocale) appleDirect.add(appleLocale);
    if (googleLocale) googleDirect.add(googleLocale);
    const appleEffective = resolved.apple && resolved.apple.locale;
    const googleEffective = resolved.google && resolved.google.locale;
    locales[id] = {
      appLocale: id,
      REPO_READY: Boolean(
        resolved.mapped
        && resolved.apple && (resolved.apple.direct || resolved.apple.acceptFallbackForReady)
        && resolved.google && (resolved.google.direct || resolved.google.acceptFallbackForReady)
        && listingPayload('apple', appleEffective, APPLE_TEXT_FIELDS)
        && listingPayload('google', googleEffective, GOOGLE_TEXT_FIELDS)
      ),
      PUBLIC_SELECTABLE: isPublicLocale(id),
      hidden,
      apple: {
        nativeLocale: appleLocale,
        unsupportedNative: !appleLocale,
        fallback: resolved.apple && resolved.apple.fallback,
        effectiveLocale: appleEffective,
        explicitFallback: Boolean(resolved.apple && !resolved.apple.direct && resolved.apple.fallback),
        screenshotOrigin: screenshotOrigin(catalog, 'apple', appleEffective, resolved.apple),
        listing: listingPayload('apple', appleEffective, APPLE_TEXT_FIELDS),
        iap: iapCopy(catalog, 'apple', appleEffective),
      },
      google: {
        nativeLocale: googleLocale,
        unsupportedNative: !googleLocale,
        fallback: resolved.google && resolved.google.fallback,
        effectiveLocale: googleEffective,
        explicitFallback: Boolean(resolved.google && !resolved.google.direct && resolved.google.fallback),
        screenshotOrigin: screenshotOrigin(catalog, 'google', googleEffective, resolved.google),
        listing: listingPayload('google', googleEffective, GOOGLE_TEXT_FIELDS),
        iap: iapCopy(catalog, 'google', googleEffective),
      },
      marketIds: (marketsByAppLocale[id] || []).map((market) => market.id),
      MARKET_ENABLED: (marketsByAppLocale[id] || []).some((market) => market.activation === 'live'),
    };
  }

  return {
    localeIds: catalogIds,
    storeCatalogMatchesAppCatalog: sameLocales,
    publicSelectable: catalogIds.filter((id) => isPublicLocale(id)),
    hidden: catalogIds.filter((id) => !isPublicLocale(id)),
    liveMarkets,
    plannedMarkets,
    expectedLiveMarkets: EXPECTED_LIVE,
    liveMarketsMatchExpected: liveMarkets.length === EXPECTED_LIVE.length
      && EXPECTED_LIVE.every((id) => liveMarkets.includes(id)),
    appleDesiredLocales: [...appleDirect].sort(),
    googleDesiredLocales: [...googleDirect].sort(),
    locales,
    identifiers: {
      iosBundleId: IOS_BUNDLE_ID,
      androidPackage: ANDROID_PACKAGE_NAME,
      appleMonthly: APPLE_PRODUCT_MONTHLY,
      appleAnnual: APPLE_PRODUCT_YEARLY,
      googleSubscription: GOOGLE_SUBSCRIPTION_PRODUCT,
    },
  };
}

function compareFields(desiredText, actualText, fields) {
  if (!desiredText || !actualText) return { matches: false, driftedFields: fields.slice() };
  const driftedFields = [];
  for (const field of fields) {
    if (field === 'releaseNotes' && desiredText.releaseNotesDeferred) continue;
    const want = desiredText[field] == null ? '' : desiredText[field];
    const got = actualText[field] == null ? '' : normalizeText(actualText[field]);
    if (want !== got) driftedFields.push(field);
  }
  return { matches: driftedFields.length === 0, driftedFields };
}

function compareStore(desiredLocales, actual, storeName) {
  const fields = storeName === 'apple' ? APPLE_TEXT_FIELDS : GOOGLE_COMPARE_FIELDS;
  if (!actual || actual.accessible !== true) {
    return {
      accessible: false,
      missingCredentials: (actual && actual.missingCredentials) || [],
      error: (actual && actual.error) || 'not read',
      desired: desiredLocales.length,
      present: null,
      matching: null,
      missing: null,
      drift: null,
      localizations: {},
    };
  }
  const actualLocales = actual.localizations || {};
  const localizations = {};
  let present = 0;
  let matching = 0;
  let missing = 0;
  let drift = 0;
  for (const locale of desiredLocales) {
    const found = actualLocales[locale] || null;
    if (!found) {
      missing += 1;
      localizations[locale] = {
        STORE_CONTENT_PRESENT: false,
        STORE_CONTENT_MATCHES_REPO: false,
        driftedFields: [],
      };
      continue;
    }
    present += 1;
    const compared = compareFields(found.desired, found.actual, fields);
    if (compared.matches) matching += 1;
    else drift += 1;
    localizations[locale] = {
      STORE_CONTENT_PRESENT: true,
      STORE_CONTENT_MATCHES_REPO: compared.matches,
      driftedFields: compared.driftedFields,
      screenshotSetCount: found.actual.screenshotSetCount,
      phoneScreenshots: found.actual.phoneScreenshots,
      featureGraphic: found.actual.featureGraphic,
    };
  }
  return {
    accessible: true,
    desired: desiredLocales.length,
    present,
    matching,
    missing,
    drift,
    localizations,
    territories: actual.territories || [],
    primaryLocale: actual.primaryLocale || null,
    versionState: actual.versionState || null,
    subscriptions: actual.subscriptions || null,
    binaryLanguages: actual.binaryLanguages || null,
    binaryLanguagesStatus: actual.binaryLanguagesStatus || 'UNKNOWN',
    coverage: {
      screenshots: screenshotCoverage(localizations, storeName),
      subscriptions: subscriptionCoverage(actual.subscriptions),
    },
    edit: actual.edit || { created: false, committed: false, leftOpen: false },
  };
}

function screenshotCoverage(localizations, storeName) {
  const present = Object.values(localizations).filter((row) => row.STORE_CONTENT_PRESENT);
  if (!present.length) return 'READ';
  const known = present.filter((row) => {
    const count = storeName === 'apple' ? row.screenshotSetCount : row.phoneScreenshots;
    return typeof count === 'number';
  });
  if (!known.length) return 'NOT_READ';
  return known.length === present.length ? 'READ' : 'PARTIAL';
}

function subscriptionCoverage(subscriptions) {
  if (!subscriptions || subscriptions.status === 'NOT_READ') return 'NOT_READ';
  if (subscriptions.status === 'READ' || subscriptions.status === 'ABSENT') return 'READ';
  return 'NOT_READ';
}

function desiredIap(desired, storeName, locale, productId) {
  const sample = Object.values(desired.locales).find((row) => row[storeName].nativeLocale === locale);
  return sample && sample[storeName].iap ? sample[storeName].iap[productId] : null;
}

function appleIapReport(desired, raw, compared) {
  if (!compared.accessible) return { status: 'NOT_ACCESSIBLE' };
  const subscriptions = raw && raw.subscriptions;
  if (!subscriptions || subscriptions.status !== 'READ') {
    return { status: 'NOT_READ', error: (subscriptions && subscriptions.error) || null };
  }
  const products = {};
  for (const [catalogId, idKey] of [['premium_monthly', 'appleMonthly'], ['premium_annual', 'appleAnnual']]) {
    const productId = desired.identifiers[idKey];
    const actual = subscriptions.products && subscriptions.products[productId];
    const locales = {};
    for (const locale of desired.appleDesiredLocales) {
      const want = desiredIap(desired, 'apple', locale, catalogId);
      const got = actual && actual.locales && actual.locales[locale];
      if (!got) {
        locales[locale] = { present: false, matches: false };
        continue;
      }
      const nameOk = normalizeText(got.name) === ((want && want.name) || '');
      const descOk = normalizeText(got.description) === ((want && want.description) || '');
      locales[locale] = { present: true, matches: Boolean(nameOk && descOk) };
    }
    products[catalogId] = { present: Boolean(actual), locales };
  }
  return { status: 'READ', products };
}

function googleIapReport(desired, raw, compared) {
  if (!compared.accessible) return { status: 'NOT_ACCESSIBLE' };
  const subscriptions = raw && raw.subscriptions;
  if (!subscriptions || (subscriptions.status !== 'READ' && subscriptions.status !== 'ABSENT')) {
    return { status: 'NOT_READ', error: (subscriptions && subscriptions.error) || null };
  }
  if (subscriptions.status === 'ABSENT') {
    return { status: 'ABSENT', textCompared: false, locales: {} };
  }
  const byLang = {};
  for (const row of subscriptions.listings || []) {
    const code = row.languageCode || row.language;
    if (code) byLang[code] = true;
  }
  const locales = {};
  for (const locale of desired.googleDesiredLocales) {
    locales[locale] = { present: Boolean(byLang[locale]) };
  }
  return {
    status: 'READ',
    textCompared: false,
    reason: 'Play subscription listings belong to the product. Monthly and annual base plans do not have separate listing text in this API.',
    basePlans: subscriptions.basePlans || [],
    locales,
  };
}

function attachDesiredText(desired, storeName, locale) {
  const sample = Object.values(desired.locales).find((row) => {
    const side = row[storeName];
    return side && side.effectiveLocale === locale && side.listing;
  });
  return sample ? sample[storeName].listing : null;
}

function indexActual(raw, desired, storeName) {
  if (!raw || raw.accessible !== true) return raw;
  const localizations = {};
  for (const locale of (storeName === 'apple' ? desired.appleDesiredLocales : desired.googleDesiredLocales)) {
    const actual = raw.localizations && raw.localizations[locale];
    if (!actual) continue;
    localizations[locale] = {
      desired: attachDesiredText(desired, storeName, locale),
      actual,
    };
  }
  return { ...raw, localizations };
}

function fallbackState(row, storeName, compared) {
  const side = row[storeName];
  if (!side.explicitFallback) return null;
  if (!compared.accessible) return 'UNKNOWN';
  const target = compared.localizations[side.fallback];
  if (!target || !target.STORE_CONTENT_PRESENT) return 'MISMATCH';
  return target.STORE_CONTENT_MATCHES_REPO ? 'MATCH' : 'MISMATCH';
}

function liveImpact() {
  return {
    impact: 'WOULD_CHANGE_LIVE_LISTING',
    approval: 'REQUIRES_EXPLICIT_APPROVAL',
    safeToStage: false,
    reason: 'A listing language on the live app can be shown inside SE, IE, and CA to people using that language. A closed market does not hide it.',
  };
}

function marketReport(desired, apple, google) {
  const expected = desired.liveMarkets.slice();
  function side(actual) {
    if (!actual || actual.accessible !== true) {
      return {
        accessible: false,
        actualLive: null,
        unexpected: [],
        missingExpected: [],
        p0: [],
      };
    }
    const actualLive = actual.territories || [];
    const expectedSet = new Set(expected);
    const planned = new Set(desired.plannedMarkets);
    const unexpected = actualLive.filter((code) => !expectedSet.has(code));
    const missingExpected = expected.filter((code) => !actualLive.includes(code));
    const p0 = unexpected.filter((code) => planned.has(code));
    return { accessible: true, actualLive, unexpected, missingExpected, p0 };
  }
  const appleSide = side(apple);
  const googleSide = side(google);
  const p0 = [...new Set([...appleSide.p0, ...googleSide.p0])];
  return {
    expectedLive: expected,
    expectedLiveMatchCatalog: desired.liveMarketsMatchExpected,
    apple: appleSide,
    google: googleSide,
    p0,
    status: (!appleSide.accessible || !googleSide.accessible)
      ? 'NOT ACCESSIBLE'
      : (p0.length || appleSide.missingExpected.length || googleSide.missingExpected.length
        || appleSide.unexpected.length || googleSide.unexpected.length)
        ? 'DRIFT'
        : 'MATCH',
  };
}

function parityStatus(compared) {
  if (!compared.accessible) return 'NOT ACCESSIBLE';
  if (compared.missing || compared.drift) return 'DRIFT';
  return 'MATCH';
}

function buildReport(options = {}) {
  const desired = options.desired || buildDesiredState();
  const appleRaw = options.apple || { accessible: false, missingCredentials: appleCredentialGaps(), error: 'credentials missing' };
  const googleRaw = options.google || { accessible: false, missingCredentials: googleCredentialGaps(), error: 'credentials missing' };
  const appleIndexed = indexActual(appleRaw, desired, 'apple');
  const googleIndexed = indexActual(googleRaw, desired, 'google');
  const apple = compareStore(desired.appleDesiredLocales, appleIndexed, 'apple');
  const google = compareStore(desired.googleDesiredLocales, googleIndexed, 'google');
  apple.iap = appleIapReport(desired, appleRaw, apple);
  google.iap = googleIapReport(desired, googleRaw, google);
  const markets = marketReport(desired, appleRaw.accessible ? { ...appleRaw, accessible: true } : appleRaw, googleRaw.accessible ? { ...googleRaw, accessible: true } : googleRaw);

  const locales = {};
  for (const id of desired.localeIds) {
    const row = desired.locales[id];
    const appleLocale = row.apple.nativeLocale;
    const googleLocale = row.google.nativeLocale;
    locales[id] = {
      REPO_READY: row.REPO_READY,
      PUBLIC_SELECTABLE: row.PUBLIC_SELECTABLE,
      marketIds: row.marketIds,
      MARKET_ENABLED: row.MARKET_ENABLED,
      apple: row.apple.explicitFallback
        ? {
          nativeMetadataLocale: 'unsupported',
          desiredFallback: row.apple.fallback,
          actualFallbackState: fallbackState(row, 'apple', apple),
          STORE_CONTENT_PRESENT: null,
          STORE_CONTENT_MATCHES_REPO: null,
        }
        : {
          metadataLocale: appleLocale,
          ...(apple.localizations[appleLocale] || {
            STORE_CONTENT_PRESENT: apple.accessible ? false : null,
            STORE_CONTENT_MATCHES_REPO: apple.accessible ? false : null,
          }),
        },
      google: row.google.explicitFallback
        ? {
          nativeMetadataLocale: 'unsupported',
          desiredFallback: row.google.fallback,
          actualFallbackState: fallbackState(row, 'google', google),
          STORE_CONTENT_PRESENT: null,
          STORE_CONTENT_MATCHES_REPO: null,
        }
        : {
          metadataLocale: googleLocale,
          ...(google.localizations[googleLocale] || {
            STORE_CONTENT_PRESENT: google.accessible ? false : null,
            STORE_CONTENT_MATCHES_REPO: google.accessible ? false : null,
          }),
        },
      liveImpactIfSynced: liveImpact(),
    };
  }

  const contentReady = desired.storeCatalogMatchesAppCatalog
    && desired.liveMarketsMatchExpected
    && desired.localeIds.every((id) => desired.locales[id].REPO_READY)
    && desired.publicSelectable.length === 23
    && desired.hidden.length === 3;

  return {
    generatedAt: new Date().toISOString(),
    appCodeContent: contentReady ? 'READY' : 'NOT READY',
    apple: {
      status: parityStatus(apple),
      ...apple,
      writesPerformed: false,
    },
    google: {
      status: parityStatus(google),
      ...google,
      writesPerformed: false,
      editCommitted: false,
    },
    markets,
    locales,
    desired: {
      appleLocales: desired.appleDesiredLocales,
      googleLocales: desired.googleDesiredLocales,
      liveMarkets: desired.liveMarkets,
      plannedMarkets: desired.plannedMarkets,
      publicSelectable: desired.publicSelectable,
      hidden: desired.hidden,
      identifiers: desired.identifiers,
    },
    drift: [],
    proposedChanges: [],
    native: options.native || null,
    guards: {
      appleWritePerformed: false,
      googleWritePerformed: false,
      googleEditCommitted: false,
      marketActivationPerformed: false,
    },
  };
}

function fillDrift(report) {
  const drift = [];
  if (report.markets.p0.length) {
    drift.push({ severity: 'P0', code: 'P0 STORE AVAILABILITY DRIFT', markets: report.markets.p0 });
  }
  report.drift = drift;
  report.proposedChanges = proposedChanges(report);
  return report;
}

function assetMissing(store, row) {
  if (store === 'apple') return row.screenshotSetCount === 0;
  return row.phoneScreenshots === 0 || row.featureGraphic === 0;
}

function proposedChanges(report) {
  if (report.apple.status === 'NOT ACCESSIBLE' && report.google.status === 'NOT ACCESSIBLE') {
    return [];
  }
  const changes = [];
  function add(store, compared) {
    if (!compared.accessible) return;
    for (const [locale, row] of Object.entries(compared.localizations)) {
      const textOk = row.STORE_CONTENT_PRESENT && row.STORE_CONTENT_MATCHES_REPO;
      if (!textOk) {
        changes.push({
          store,
          locale,
          op: row.STORE_CONTENT_PRESENT ? 'update' : 'add',
          kind: 'metadata_only',
          ...liveImpact(),
        });
      }
      if (!row.STORE_CONTENT_PRESENT || assetMissing(store, row)) {
        changes.push({
          store,
          locale,
          op: 'upload',
          kind: 'asset_upload',
          ...liveImpact(),
        });
      }
    }
  }
  add('apple', report.apple);
  add('google', report.google);
  addIapChanges(changes, 'apple', report.apple.iap);
  addIapChanges(changes, 'google', report.google.iap);
  if (report.native && report.native.metadataSyncRequiresNewBinary) {
    changes.push({
      store: 'native',
      locale: null,
      op: 'rebuild',
      kind: 'binary_required',
      ...liveImpact(),
    });
  }
  return changes;
}

function addIapChanges(changes, store, iap) {
  if (!iap || iap.status === 'NOT_READ' || iap.status === 'NOT_ACCESSIBLE') return;
  if (store === 'google' && iap.status === 'ABSENT') {
    changes.push({
      store,
      locale: null,
      op: 'add',
      kind: 'iap_localization',
      product: 'premium',
      ...liveImpact(),
    });
    return;
  }
  if (store === 'google' && iap.status === 'READ') {
    for (const [locale, row] of Object.entries(iap.locales || {})) {
      if (row.present) continue;
      changes.push({
        store,
        locale,
        op: 'add',
        kind: 'iap_localization',
        product: 'premium',
        ...liveImpact(),
      });
    }
    return;
  }
  if (store !== 'apple' || iap.status !== 'READ') return;
  for (const [product, info] of Object.entries(iap.products || {})) {
    if (!info.present) {
      changes.push({
        store,
        locale: null,
        op: 'add',
        kind: 'iap_localization',
        product,
        ...liveImpact(),
      });
      continue;
    }
    for (const [locale, row] of Object.entries(info.locales || {})) {
      if (row.matches) continue;
      changes.push({
        store,
        locale,
        op: row.present ? 'update' : 'add',
        kind: 'iap_localization',
        product,
        ...liveImpact(),
      });
    }
  }
}

function nativeBinaryReport(root = path.join(__dirname, '..', '..')) {
  const plistPath = path.join(root, 'ios/App/App/Info.plist');
  const plist = fs.readFileSync(plistPath, 'utf8');
  const block = plist.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/);
  const declared = block ? [...block[1].matchAll(/<string>([^<]+)<\/string>/g)].map((match) => match[1]) : [];
  const lprojDir = path.join(root, 'ios/App/App');
  const lproj = fs.readdirSync(lprojDir).filter((name) => name.endsWith('.lproj') && name !== 'Base.lproj').map((name) => name.replace(/\.lproj$/, '')).sort();
  const androidRoot = path.join(root, 'scripts/android/l10n/res');
  const android = fs.existsSync(androidRoot)
    ? fs.readdirSync(androidRoot).filter((name) => name.startsWith('values-')).sort()
    : [];
  return {
    metadataSyncRequiresNewBinary: false,
    reason: 'Store listing languages are console metadata. The shipping app is a remote WebView, and this audit does not change CFBundleLocalizations.',
    repoIosDeclaredLanguages: declared,
    repoIosLprojPresent: lproj,
    repoAndroidResourceDirs: android,
    storeBinaryLanguages: null,
    storeBinaryLanguagesStatus: 'UNKNOWN',
    hiddenLocalesDeclaredOnIos: ['is', 'ga', 'mt'].filter((code) => declared.includes(code)),
  };
}

function formatSummary(report) {
  const apple = report.apple;
  const google = report.google;
  const count = (side) => (
    side.accessible
      ? `desired ${side.desired}, present ${side.present}, matching ${side.matching}, missing ${side.missing}, drift ${side.drift}`
      : `desired ${side.desired}, present UNKNOWN, matching UNKNOWN, missing UNKNOWN, drift UNKNOWN`
  );
  const lines = [
    `APP CODE/CONTENT: ${report.appCodeContent}`,
    `APPLE LIVE STORE PARITY: ${apple.status}`,
    `GOOGLE LIVE STORE PARITY: ${google.status}`,
    `MARKET AVAILABILITY: ${report.markets.status}`,
    '',
    `APPLE ${count(apple)}`,
    `GOOGLE ${count(google)}`,
    '',
    `Expected live markets: ${report.markets.expectedLive.join(', ')}`,
    `Actual Apple live markets: ${report.markets.apple.accessible ? report.markets.apple.actualLive.join(', ') || '(none)' : 'UNKNOWN'}`,
    `Actual Google live markets: ${report.markets.google.accessible ? report.markets.google.actualLive.join(', ') || '(none)' : 'UNKNOWN'}`,
    `Unexpected live markets: ${unexpectedLine(report)}`,
    `Missing expected live markets: ${missingLine(report)}`,
    '',
    'APPLE WRITE PERFORMED: NO',
    'GOOGLE WRITE PERFORMED: NO',
    'GOOGLE EDIT COMMITTED: NO',
    'MARKET ACTIVATION PERFORMED: NO',
  ];
  if (apple.missingCredentials && apple.missingCredentials.length) {
    lines.push('', 'Apple credentials missing:');
    for (const name of apple.missingCredentials) lines.push(`- ${name}`);
  }
  if (google.missingCredentials && google.missingCredentials.length) {
    lines.push('', 'Google credentials missing:');
    for (const name of google.missingCredentials) lines.push(`- ${name}`);
  }
  if (report.markets.p0.length) {
    lines.push('', `P0 STORE AVAILABILITY DRIFT: ${report.markets.p0.join(', ')}`);
  }
  if (report.native) {
    lines.push(
      '',
      `Metadata sync requires a new binary: ${report.native.metadataSyncRequiresNewBinary ? 'yes' : 'no'}`,
      `Live build languages: ${report.native.storeBinaryLanguagesStatus}`,
    );
  }
  for (const [label, side] of [['Apple', report.apple], ['Google', report.google]]) {
    if (!side.accessible) continue;
    const coverage = side.coverage || {};
    lines.push(`${label} screenshots: ${coverage.screenshots || 'NOT_READ'}`);
    lines.push(`${label} subscriptions: ${coverage.subscriptions || 'NOT_READ'}`);
  }
  return lines.join('\n');
}

function unexpectedLine(report) {
  if (!report.markets.apple.accessible && !report.markets.google.accessible) return 'UNKNOWN';
  const codes = [...new Set([
    ...(report.markets.apple.unexpected || []),
    ...(report.markets.google.unexpected || []),
  ])];
  return codes.length ? codes.join(', ') : 'none';
}

function missingLine(report) {
  if (!report.markets.apple.accessible && !report.markets.google.accessible) return 'UNKNOWN';
  const codes = [...new Set([
    ...(report.markets.apple.missingExpected || []),
    ...(report.markets.google.missingExpected || []),
  ])];
  return codes.length ? codes.join(', ') : 'none';
}

function parseSyncArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    write: argv.includes('--write'),
    allowMarketActivation: argv.includes('--allow-market-activation'),
  };
}

function assertSyncMode(args) {
  if (args.write) {
    const error = new Error('STORE_WRITE_LOCKED: --write is refused. No Apple mutation, no Google commit, and no market activation.');
    error.code = 'STORE_WRITE_LOCKED';
    throw error;
  }
  if (!args.dryRun) {
    const error = new Error('STORE_SYNC_MODE_REQUIRED: pass --dry-run. Availability changes also require --allow-market-activation and are not part of metadata sync.');
    error.code = 'STORE_SYNC_MODE_REQUIRED';
    throw error;
  }
}

function buildSyncPlan(report, args) {
  assertSyncMode(args);
  const appleBlocked = report.apple.status === 'NOT ACCESSIBLE';
  const googleBlocked = report.google.status === 'NOT ACCESSIBLE';
  const blocked = appleBlocked && googleBlocked;
  return {
    dryRun: true,
    write: false,
    marketActivation: false,
    allowMarketActivationFlag: Boolean(args.allowMarketActivation),
    availabilityChangesIncluded: false,
    blocked,
    appleBlocked,
    googleBlocked,
    blockedReason: blocked
      ? 'Actual store state is not accessible, so no upload list is invented.'
      : null,
    apple: appleBlocked ? [] : report.proposedChanges.filter((change) => change.store === 'apple'),
    google: googleBlocked ? [] : report.proposedChanges.filter((change) => change.store === 'google'),
  };
}

function formatSyncPlan(plan) {
  const lines = ['DRY RUN', 'No store write.', ''];
  if (plan.blocked) {
    lines.push(plan.blockedReason);
    lines.push('', 'Availability changes included: no');
    if (plan.allowMarketActivationFlag) {
      lines.push('The market-activation flag was set and ignored. Metadata sync cannot open a country.');
    }
    return lines.join('\n');
  }
  lines.push('APPLE:');
  if (plan.appleBlocked) lines.push('not accessible, upload list not invented');
  for (const change of plan.apple) lines.push(`+ ${change.op} ${change.locale || change.product} (${change.kind}) ${change.impact}`);
  if (!plan.appleBlocked && !plan.apple.length) lines.push('(no metadata changes)');
  lines.push('', 'GOOGLE:');
  if (plan.googleBlocked) lines.push('not accessible, upload list not invented');
  for (const change of plan.google) lines.push(`+ ${change.op} ${change.locale || change.product} (${change.kind}) ${change.impact}`);
  if (!plan.googleBlocked && !plan.google.length) lines.push('(no metadata changes)');
  lines.push('', 'Availability changes included: no');
  if (plan.allowMarketActivationFlag) {
    lines.push('The market-activation flag was set and ignored. Metadata sync cannot open a country.');
  }
  return lines.join('\n');
}

module.exports = {
  APPLE_TEXT_FIELDS,
  GOOGLE_TEXT_FIELDS,
  GOOGLE_COMPARE_FIELDS,
  appleCredentialGaps,
  googleCredentialGaps,
  buildDesiredState,
  buildReport,
  fillDrift,
  nativeBinaryReport,
  formatSummary,
  parseSyncArgs,
  assertSyncMode,
  buildSyncPlan,
  formatSyncPlan,
  normalizeText,
  liveImpact,
};
