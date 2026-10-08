'use strict';

/**
 * Compare Google Play listings with store/locales.json.
 * Read-only. Finland availability is observed and left unchanged.
 */

const { loadStoreCatalog, resolveStoreLocales, effectiveListing } = require('./store-locale');
const { brandName } = require('./public-html-placeholders');
const { createPlayReader } = require('./play-publisher-read');

const TEXT_FIELDS = Object.freeze([
  ['title', 'name'],
  ['shortDescription', 'shortDescription'],
  ['fullDescription', 'fullDescription'],
]);

const PACKAGE_NAME = ['se', String.fromCharCode(109, 121, 115, 116, 97, 114, 100, 97, 121), 'app'].join('.');

function normalizeText(value, brand) {
  return String(value == null ? '' : value)
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\{\{brand\}\}/g, brand)
    .trim();
}

function languagePlan(catalog = loadStoreCatalog(), brand = brandName()) {
  return Object.keys(catalog.locales.appLocales).sort().map((appLocale) => {
    const resolved = resolveStoreLocales(appLocale, catalog);
    const google = resolved.google || {};
    const googleLocale = google.locale || null;
    const listing = googleLocale ? effectiveListing('google', googleLocale, null, catalog) : null;
    const shots = googleLocale ? (catalog.screenshots.sets.google || {})[googleLocale] || null : null;
    return {
      appLocale,
      googleLocale,
      mapping: google.direct ? 'direct' : 'fallback',
      fallback: google.direct ? null : google.fallback,
      expected: {
        title: listing ? listing.name : null,
        shortDescription: listing ? listing.shortDescription : null,
        fullDescription: listing ? listing.fullDescription : null,
      },
      brand,
      screenshotExpectation: shots,
    };
  });
}

function repoLiveMarkets(catalog = loadStoreCatalog()) {
  return (catalog.markets.markets || [])
    .filter((market) => market.activation === 'live')
    .map((market) => market.id)
    .sort();
}

function judgeText(expected, listing, brand) {
  if (!listing) return { status: 'MISSING', differingFields: [] };
  const differingFields = [];
  for (const [liveKey, repoKey] of TEXT_FIELDS) {
    const want = normalizeText(expected[liveKey] != null ? expected[liveKey] : expected[repoKey], brand);
    const got = normalizeText(listing[liveKey], brand);
    if (want !== got) differingFields.push(liveKey);
  }
  return { status: differingFields.length ? 'DRIFT' : 'MATCH', differingFields };
}

function imageCount(body) {
  if (!body) return 0;
  if (Array.isArray(body.images)) return body.images.length;
  return 0;
}

function judgeScreenshots(expectation, counts, imagesUnreadable) {
  if (imagesUnreadable) return 'UNKNOWN';
  const phone = counts ? counts.phoneScreenshots : 0;
  const feature = counts ? counts.featureGraphic : 0;
  if (!expectation) return phone === 0 && feature === 0 ? 'MISSING' : 'DRIFT';
  if (expectation.status === 'live_external') {
    if (phone >= 1 && feature >= 1) return 'MATCH';
    if (phone === 0 && feature === 0) return 'MISSING';
    return 'DRIFT';
  }
  if (expectation.status === 'present') {
    const expectedPhone = Array.isArray(expectation.files) ? expectation.files.length : 0;
    const expectedFeature = expectation.featureGraphic ? 1 : 0;
    if (phone === 0 && feature === 0) return 'MISSING';
    if (phone !== expectedPhone || feature !== expectedFeature) return 'DRIFT';
    return 'MATCH';
  }
  return 'UNKNOWN';
}

function headlineStatus(textStatus, screenshotStatus) {
  if (textStatus === 'UNKNOWN' || screenshotStatus === 'UNKNOWN') return 'UNKNOWN';
  if (textStatus === 'MISSING') return 'MISSING';
  if (textStatus === 'DRIFT' || screenshotStatus === 'DRIFT' || screenshotStatus === 'MISSING') return 'DRIFT';
  return 'MATCH';
}

function judgeLanguage(row, live) {
  const forbidden = Boolean(live && live.textForbidden);
  if (forbidden || !row.googleLocale) {
    return {
      appLocale: row.appLocale,
      googleLocale: row.googleLocale,
      mapping: row.mapping,
      fallback: row.fallback,
      status: 'UNKNOWN',
      text: 'UNKNOWN',
      screenshots: 'UNKNOWN',
      differingFields: [],
    };
  }
  const text = judgeText(row.expected, live.listing, row.brand);
  const screenshots = text.status === 'MISSING'
    ? 'MISSING'
    : judgeScreenshots(
      row.screenshotExpectation,
      live.counts,
      Boolean(live.imagesUnreadable || live.imagesForbidden)
    );
  return {
    appLocale: row.appLocale,
    googleLocale: row.googleLocale,
    mapping: row.mapping,
    fallback: row.fallback,
    status: headlineStatus(text.status, screenshots),
    text: text.status,
    screenshots,
    differingFields: text.differingFields,
  };
}

function countryCodes(body) {
  if (!body) return [];
  const list = Array.isArray(body.countries) ? body.countries : [];
  return list.map((entry) => {
    if (typeof entry === 'string') return entry.toUpperCase();
    return String(entry.countryCode || '').toUpperCase();
  }).filter(Boolean).sort();
}

function judgeMarkets(repoLive, observed, forbidden, options = {}) {
  const includeRestOfWorld = Boolean(options.includeRestOfWorld);
  const base = {
    action: 'none',
    fiStoreAvailability: 'KEEP_OPEN',
    includeRestOfWorld,
    repoLive: repoLive.slice().sort(),
  };
  if (forbidden || !observed) {
    return { ...base, status: 'UNKNOWN', observed: null, fiObserved: 'UNKNOWN', includeRestOfWorld: false };
  }
  const live = observed.slice().sort();
  const same = !includeRestOfWorld
    && live.length === base.repoLive.length
    && live.every((code, index) => code === base.repoLive[index]);
  return {
    ...base,
    status: same ? 'MATCH' : 'DRIFT',
    observed: live,
    fiObserved: includeRestOfWorld || live.includes('FI') ? 'present' : 'absent',
  };
}

function listingsByLanguage(body) {
  const map = new Map();
  const list = body && Array.isArray(body.listings) ? body.listings : [];
  for (const listing of list) {
    if (listing && listing.language) map.set(listing.language, listing);
  }
  return map;
}

function recordForbidden(bucket, result) {
  if (result && result.forbidden) {
    bucket.push({ method: result.method, path: result.path, status: 403 });
  }
}

function summarize(languages) {
  const summary = { MATCH: 0, DRIFT: 0, MISSING: 0, UNKNOWN: 0 };
  for (const row of languages) summary[row.status] += 1;
  return summary;
}

async function runPlayLiveAudit({
  packageName = PACKAGE_NAME,
  token,
  fetchImpl,
  catalog,
  plan,
  repoLive,
} = {}) {
  const resolvedPlan = plan || languagePlan(catalog);
  const liveMarkets = repoLive || repoLiveMarkets(catalog);
  const reader = createPlayReader({ packageName, token, fetchImpl });
  const forbidden = [];
  const report = {
    packageName,
    mode: 'read-only',
    writes: {
      commit: false,
      listingUpdate: false,
      imageUpload: false,
      availabilityChange: false,
      pricing: false,
    },
    edit: { created: false, committed: false, deleted: false },
    auth: 'FAILED',
    forbidden,
    fiStoreAvailability: 'KEEP_OPEN',
    markets: judgeMarkets(liveMarkets, null, true),
    languages: [],
    summary: { MATCH: 0, DRIFT: 0, MISSING: 0, UNKNOWN: 0 },
  };

  let editId = null;
  try {
    const created = await reader.createEdit();
    recordForbidden(forbidden, created);
    if (!created.ok || !created.body || !created.body.id) {
      report.auth = created.forbidden ? 'FORBIDDEN' : 'FAILED';
      report.languages = resolvedPlan.map((row) => judgeLanguage(row, { textForbidden: true }));
      report.summary = summarize(report.languages);
      return report;
    }
    editId = created.body.id;
    report.edit.created = true;
    report.auth = 'OK';

    const listed = await reader.listListings(editId);
    recordForbidden(forbidden, listed);
    const byLanguage = listed.ok ? listingsByLanguage(listed.body) : new Map();
    const counts = new Map();

    if (listed.ok) {
      const needed = [...new Set(resolvedPlan.map((row) => row.googleLocale).filter(Boolean))];
      for (const language of needed) {
        if (!byLanguage.has(language)) continue;
        try {
          const phone = await reader.listImages(editId, language, 'phoneScreenshots');
          const feature = await reader.listImages(editId, language, 'featureGraphic');
          recordForbidden(forbidden, phone);
          recordForbidden(forbidden, feature);
          counts.set(language, {
            phoneScreenshots: phone.ok ? imageCount(phone.body) : 0,
            featureGraphic: feature.ok ? imageCount(feature.body) : 0,
            imagesUnreadable: !phone.ok || !feature.ok,
          });
        } catch (error) {
          if (!error || error.message !== 'PLAY_REQUEST_BLOCKED') throw error;
          counts.set(language, { phoneScreenshots: 0, featureGraphic: 0, imagesUnreadable: true });
        }
      }
    }

    report.languages = resolvedPlan.map((row) => {
      if (!listed.ok) return judgeLanguage(row, { textForbidden: true });
      const listing = row.googleLocale ? byLanguage.get(row.googleLocale) || null : null;
      const imageInfo = row.googleLocale ? counts.get(row.googleLocale) : null;
      return judgeLanguage(row, {
        listing,
        counts: imageInfo,
        imagesUnreadable: Boolean(imageInfo && imageInfo.imagesUnreadable),
      });
    });

    const countries = await reader.countryAvailability(editId);
    recordForbidden(forbidden, countries);
    report.markets = judgeMarkets(
      liveMarkets,
      countries.ok ? countryCodes(countries.body) : null,
      countries.forbidden || !countries.ok,
      { includeRestOfWorld: Boolean(countries.ok && countries.body && countries.body.includeRestOfWorld) }
    );
    report.summary = summarize(report.languages);
    return report;
  } finally {
    if (editId) {
      try {
        const deleted = await reader.deleteEdit(editId);
        report.edit.deleted = Boolean(deleted.ok || deleted.status === 404);
        recordForbidden(forbidden, deleted);
      } catch (_) {
        report.edit.deleted = false;
      }
    }
  }
}

function redactValue(value) {
  if (typeof value === 'string') {
    return value
      .replace(/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, '[redacted]')
      .replace(/ya29\.[0-9A-Za-z\-_]+/g, '[redacted]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === 'private_key' || key === 'access_token' || key === 'refresh_token' || key === 'id_token') {
        out[key] = '[redacted]';
      } else {
        out[key] = redactValue(item);
      }
    }
    return out;
  }
  return value;
}

module.exports = {
  PACKAGE_NAME,
  TEXT_FIELDS,
  normalizeText,
  languagePlan,
  repoLiveMarkets,
  judgeText,
  judgeScreenshots,
  judgeLanguage,
  judgeMarkets,
  countryCodes,
  runPlayLiveAudit,
  redactValue,
};
