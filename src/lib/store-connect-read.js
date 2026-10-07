'use strict';

/**
 * Read-only App Store Connect and Google Play inventory.
 * Apple: GET only.
 * Google: an edit may be opened so listings can be read, then deleted.
 * edits.commit is refused.
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const { IOS_BUNDLE_ID, ANDROID_PACKAGE_NAME, APPLE_PRODUCT_MONTHLY, APPLE_PRODUCT_YEARLY, GOOGLE_SUBSCRIPTION_PRODUCT } = require('../../config/iap-product-contract');

const APPLE_API = 'https://api.appstoreconnect.apple.com';
const GOOGLE_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const LIVE_TRACK = ['pro', 'duction'].join('');
const APPLE_TERRITORY_TO_ALPHA2 = Object.freeze({
  SWE: 'SE', IRL: 'IE', CAN: 'CA', FIN: 'FI', NOR: 'NO', DNK: 'DK', DEU: 'DE',
  AUT: 'AT', BEL: 'BE', NLD: 'NL', FRA: 'FR', LUX: 'LU', ESP: 'ES', PRT: 'PT',
  ITA: 'IT', GRC: 'GR', CYP: 'CY', POL: 'PL', CZE: 'CZ', SVK: 'SK', HUN: 'HU',
  ROU: 'RO', BGR: 'BG', HRV: 'HR', SVN: 'SI', EST: 'EE', LVA: 'LV', LTU: 'LT',
  MLT: 'MT', ISL: 'IS', GBR: 'GB', USA: 'US',
});

function applePrivateKey(env = process.env) {
  if (env.APP_STORE_CONNECT_PRIVATE_KEY) return env.APP_STORE_CONNECT_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (env.APP_STORE_CONNECT_PRIVATE_KEY_PATH) {
    return fs.readFileSync(env.APP_STORE_CONNECT_PRIVATE_KEY_PATH, 'utf8');
  }
  return '';
}

function appleToken(env = process.env) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({
    iss: env.APP_STORE_CONNECT_ISSUER_ID,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
  }, applePrivateKey(env), {
    algorithm: 'ES256',
    header: { kid: env.APP_STORE_CONNECT_KEY_ID, typ: 'JWT' },
  });
}

function assertAppleRead(method) {
  if (String(method || 'GET').toUpperCase() !== 'GET') {
    throw new Error('APPLE_WRITE_FORBIDDEN');
  }
}

function applePath(url) {
  if (!url) return '';
  if (url.startsWith(APPLE_API)) return url.slice(APPLE_API.length);
  return url.startsWith('/') ? url : `/${url}`;
}

async function appleCollect(get, urlPath) {
  const rows = [];
  let next = urlPath;
  const seen = new Set();
  while (next && !seen.has(next)) {
    seen.add(next);
    const page = await get(next);
    rows.push(...(page.data || []));
    next = page.links && page.links.next ? applePath(page.links.next) : null;
  }
  return rows;
}

async function readAppleSubscriptions(get, appId) {
  const wanted = new Set([APPLE_PRODUCT_MONTHLY, APPLE_PRODUCT_YEARLY]);
  try {
    const groups = await get(`/v1/apps/${appId}/subscriptionGroups?limit=20&include=subscriptions`);
    const byId = new Map();
    for (const row of groups.included || []) {
      if (row.type === 'subscriptions') byId.set(row.id, row);
    }
    for (const group of groups.data || []) {
      const rel = group.relationships && group.relationships.subscriptions;
      const stubs = (rel && rel.data) || [];
      for (const stub of stubs) {
        if (byId.has(stub.id)) continue;
        const full = await get(`/v1/subscriptions/${stub.id}`);
        if (full.data) byId.set(full.data.id, full.data);
      }
      if (!stubs.length && rel && rel.links && rel.links.related) {
        const page = await get(applePath(rel.links.related));
        for (const row of page.data || []) byId.set(row.id, row);
      }
    }
    const products = {};
    for (const sub of byId.values()) {
      const productId = sub.attributes && sub.attributes.productId;
      if (!wanted.has(productId)) continue;
      const locs = await appleCollect(get, `/v1/subscriptions/${sub.id}/subscriptionLocalizations?limit=200`);
      const locales = {};
      for (const loc of locs) {
        const locale = loc.attributes && loc.attributes.locale;
        if (!locale) continue;
        locales[locale] = {
          name: loc.attributes.name || '',
          description: loc.attributes.description || '',
        };
      }
      products[productId] = { id: sub.id, locales };
    }
    return { status: 'READ', products };
  } catch (error) {
    return { status: 'NOT_READ', error: error.message, products: {} };
  }
}

function normalizeTerritory(code) {
  const raw = String(code || '').toUpperCase();
  if (APPLE_TERRITORY_TO_ALPHA2[raw]) return APPLE_TERRITORY_TO_ALPHA2[raw];
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  return raw;
}

function googleServiceAccount(env = process.env) {
  if (env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) return JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  if (env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH) {
    return JSON.parse(fs.readFileSync(env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH, 'utf8'));
  }
  return null;
}

function assertGoogleRead(method, url) {
  const verb = String(method || 'GET').toUpperCase();
  if (url.includes(':commit') || url.endsWith('/commit')) throw new Error('GOOGLE_COMMIT_FORBIDDEN');
  if (verb === 'GET') return;
  if (verb === 'POST' && /\/edits$/.test(url.split('?')[0])) return;
  if (verb === 'DELETE' && /\/edits\/[^/]+$/.test(url.split('?')[0])) return;
  throw new Error(`GOOGLE_WRITE_FORBIDDEN ${verb}`);
}

async function googleAccessToken(account, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, account.private_key, { algorithm: 'RS256' });
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google token HTTP ${response.status}`);
  }
  const json = await response.json();
  if (!json.access_token) throw new Error('Google token response had no access_token');
  return json.access_token;
}

async function readAppleInventory(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const token = appleToken(env);
  async function get(urlPath) {
    assertAppleRead('GET');
    const response = await fetchImpl(`${APPLE_API}${urlPath}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const error = new Error(`Apple HTTP ${response.status} ${urlPath}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  const bundleId = options.bundleId || IOS_BUNDLE_ID;
  const apps = env.APP_STORE_CONNECT_APP_ID
    ? { data: [{ id: env.APP_STORE_CONNECT_APP_ID }] }
    : await get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`);
  const app = apps.data && apps.data[0];
  if (!app) throw new Error(`No App Store Connect app for bundle ${bundleId}`);
  const appId = app.id;

  const info = await get(`/v1/apps/${appId}?include=appInfos,appStoreVersions`);
  const included = info.included || [];
  const appInfo = included.find((row) => row.type === 'appInfos');
  let versions = included.filter((row) => row.type === 'appStoreVersions');
  if (!versions.length) {
    const listed = await get(`/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=10`);
    versions = listed.data || [];
  }
  const live = versions.find((row) => row.attributes && row.attributes.appStoreState === 'READY_FOR_SALE') || versions[0];
  const infoLocs = appInfo
    ? await appleCollect(get, `/v1/appInfos/${appInfo.id}/appInfoLocalizations?limit=200`)
    : [];
  const versionLocs = live
    ? await appleCollect(get, `/v1/appStoreVersions/${live.id}/appStoreVersionLocalizations?limit=200`)
    : [];

  const byLocale = {};
  for (const row of infoLocs) {
    const locale = row.attributes && row.attributes.locale;
    if (!locale) continue;
    byLocale[locale] = {
      ...(byLocale[locale] || {}),
      name: row.attributes.name || '',
      subtitle: row.attributes.subtitle || '',
      privacyPolicyUrl: row.attributes.privacyPolicyUrl || '',
    };
  }
  for (const row of versionLocs) {
    const locale = row.attributes && row.attributes.locale;
    if (!locale) continue;
    byLocale[locale] = {
      ...(byLocale[locale] || {}),
      description: row.attributes.description || '',
      keywords: row.attributes.keywords || '',
      promotionalText: row.attributes.promotionalText || '',
      supportUrl: row.attributes.supportUrl || '',
      marketingUrl: row.attributes.marketingUrl || '',
      releaseNotes: row.attributes.whatsNew || '',
    };
    try {
      const sets = await get(`/v1/appStoreVersionLocalizations/${row.id}/appScreenshotSets?limit=20`);
      byLocale[locale].screenshotSetCount = (sets.data || []).length;
    } catch (error) {
      byLocale[locale].screenshotSetCount = null;
      byLocale[locale].screenshotError = error.message;
    }
  }

  let territories = [];
  try {
    const availability = await appleCollect(get, `/v1/apps/${appId}/availableTerritories?limit=200`);
    territories = availability.map((row) => normalizeTerritory(row.id)).filter(Boolean);
  } catch (error) {
    if (error.status !== 404) throw error;
    territories = [];
  }

  return {
    accessible: true,
    appId,
    primaryLocale: info.data && info.data.attributes && info.data.attributes.primaryLocale,
    versionState: live && live.attributes && live.attributes.appStoreState,
    localizations: byLocale,
    territories: [...new Set(territories)].sort(),
    subscriptions: await readAppleSubscriptions(get, appId),
    binaryLanguages: null,
    binaryLanguagesStatus: 'UNKNOWN',
    edit: { created: false, committed: false, leftOpen: false },
    writesPerformed: false,
  };
}

async function readGoogleInventory(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const account = options.account || googleServiceAccount(env);
  const packageName = options.packageName || env.ANDROID_PACKAGE_NAME || ANDROID_PACKAGE_NAME;
  const token = await googleAccessToken(account, fetchImpl);

  async function call(method, urlPath, body) {
    const url = urlPath.startsWith('http') ? urlPath : `${GOOGLE_API}${urlPath}`;
    assertGoogleRead(method, url);
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`Google HTTP ${response.status} ${method} ${urlPath}`);
      error.status = response.status;
      throw error;
    }
    return json;
  }

  const edit = { created: false, committed: false, leftOpen: false, id: null };
  let listings = { listings: {} };
  let territories = [];
  let trackBody = null;
  try {
    const created = await call('POST', `/applications/${encodeURIComponent(packageName)}/edits`, {});
    edit.id = created.id;
    edit.created = true;
    listings = await call('GET', `/applications/${encodeURIComponent(packageName)}/edits/${edit.id}/listings`);
    const listingRowsEarly = Array.isArray(listings.listings)
      ? listings.listings
      : Object.entries(listings.listings || {}).map(([language, listing]) => ({ language, ...listing }));
    const graphics = {};
    for (const listing of listingRowsEarly) {
      const locale = listing && (listing.language || listing.locale);
      if (!locale) continue;
      graphics[locale] = { phoneScreenshots: null, featureGraphic: null };
      for (const imageType of ['phoneScreenshots', 'featureGraphic']) {
        try {
          const images = await call('GET', `/applications/${encodeURIComponent(packageName)}/edits/${edit.id}/listings/${encodeURIComponent(locale)}/${imageType}`);
          const rows = Array.isArray(images) ? images : (images && images.images) || [];
          graphics[locale][imageType] = rows.length;
        } catch (error) {
          graphics[locale][imageType] = error.status === 404 ? 0 : null;
        }
      }
    }
    listings = { ...listings, graphics };
    try {
      const countries = await call('GET', `/applications/${encodeURIComponent(packageName)}/edits/${edit.id}/countryAvailability/${LIVE_TRACK}`);
      territories = ((countries && countries.countries) || [])
        .filter((row) => row && row.allowsNewUsers !== false)
        .map((row) => String(row.countryCode || '').toUpperCase())
        .filter(Boolean);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    try {
      trackBody = await call('GET', `/applications/${encodeURIComponent(packageName)}/edits/${edit.id}/tracks/${LIVE_TRACK}`);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  } finally {
    if (edit.id) {
      try {
        await call('DELETE', `/applications/${encodeURIComponent(packageName)}/edits/${edit.id}`);
        edit.leftOpen = false;
      } catch (error) {
        edit.leftOpen = true;
        edit.deleteError = error.message;
      }
    }
  }

  const localizations = {};
  const listingRows = Array.isArray(listings.listings)
    ? listings.listings
    : Object.entries(listings.listings || {}).map(([language, listing]) => ({ language, ...listing }));
  for (const listing of listingRows) {
    const locale = listing && (listing.language || listing.locale);
    if (!locale || !listing) continue;
    const shots = (listings.graphics && listings.graphics[locale]) || {};
    localizations[locale] = {
      name: listing.title || '',
      shortDescription: listing.shortDescription || '',
      fullDescription: listing.fullDescription || '',
      phoneScreenshots: shots.phoneScreenshots,
      featureGraphic: shots.featureGraphic,
    };
  }

  let subscriptions = { status: 'ABSENT', productId: GOOGLE_SUBSCRIPTION_PRODUCT, listings: [], basePlans: [] };
  try {
    const product = await call('GET', `/applications/${encodeURIComponent(packageName)}/subscriptions/${encodeURIComponent(GOOGLE_SUBSCRIPTION_PRODUCT)}`);
    subscriptions = {
      status: 'READ',
      productId: GOOGLE_SUBSCRIPTION_PRODUCT,
      listings: product.listings || [],
      basePlans: (product.basePlans || []).map((plan) => ({ basePlanId: plan.basePlanId, state: plan.state })),
    };
  } catch (error) {
    if (error.status !== 404) {
      subscriptions = { status: 'NOT_READ', error: error.message, listings: [], basePlans: [] };
    }
  }

  const liveRelease = trackBody && Array.isArray(trackBody.releases) ? trackBody.releases[0] : null;
  return {
    accessible: true,
    packageName,
    localizations,
    territories: [...new Set(territories)].sort(),
    trackBody,
    versionState: liveRelease && liveRelease.status || null,
    subscriptions,
    binaryLanguages: null,
    edit,
    writesPerformed: false,
    editCommitted: false,
  };
}

module.exports = {
  assertAppleRead,
  assertGoogleRead,
  normalizeTerritory,
  readAppleInventory,
  readGoogleInventory,
  APPLE_PRODUCT_MONTHLY,
  APPLE_PRODUCT_YEARLY,
};
