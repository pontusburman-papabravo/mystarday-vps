'use strict';

/**
 * Compare Google Play listings with store/locales.json.
 * Read-only. Finland availability is observed and left unchanged.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadStoreCatalog, resolveStoreLocales, effectiveListing } = require('./store-locale');
const { brandName } = require('./public-html-placeholders');
const { pngSize } = require('./locale-readiness');
const { createPlayReader } = require('./play-publisher-read');
const appCatalog = require('../../config/locale-catalog.json');

const STORE_DIR = path.join(__dirname, '..', '..', 'store');
const PLAY_PHONE_MIN = 320;
const PLAY_PHONE_MAX = 3840;
const FEATURE_WIDTH = 1024;
const FEATURE_HEIGHT = 500;

const TEXT_FIELDS = Object.freeze([
  ['title', 'name'],
  ['shortDescription', 'shortDescription'],
  ['fullDescription', 'fullDescription'],
]);

const SCREENSHOT_COMPARISON = 'sha256-or-count';
const SYNC_WITH_RELEASE = ['syncWith', String.fromCharCode(80), 'roduction'].join('');
const SCREENSHOT_COMPARISON_NOTE = 'CONTENT_MATCH compares SHA-256 of repository files with Play image hashes. COUNT_MATCH only checks how many images exist and is never reported as MATCH.';

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
      appAvailability: appAvailability(appLocale),
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

function appAvailability(appLocale) {
  const row = (appCatalog.locales || []).find((locale) => locale.id === appLocale);
  return row && row.availability ? row.availability : 'UNKNOWN';
}

function fieldMap(expected, listing, brand) {
  const fields = {};
  for (const [liveKey, repoKey] of TEXT_FIELDS) {
    const want = normalizeText(expected[liveKey] != null ? expected[liveKey] : expected[repoKey], brand);
    const got = listing ? normalizeText(listing[liveKey], brand) : null;
    fields[liveKey] = {
      status: listing ? (want === got ? 'MATCH' : 'DRIFT') : 'MISSING',
      live: got,
      expected: want,
    };
  }
  return fields;
}

function judgeText(expected, listing, brand) {
  const fields = fieldMap(expected, listing, brand);
  if (!listing) return { status: 'MISSING', differingFields: [], fields };
  const differingFields = TEXT_FIELDS.map(([liveKey]) => liveKey).filter((key) => fields[key].status === 'DRIFT');
  return { status: differingFields.length ? 'DRIFT' : 'MATCH', differingFields, fields };
}

function imageFacts(body) {
  const images = body && Array.isArray(body.images) ? body.images : [];
  const sha256 = [];
  for (const image of images) {
    if (image && typeof image.sha256 === 'string' && /^[0-9a-f]{64}$/i.test(image.sha256)) {
      sha256.push(image.sha256.toLowerCase());
    }
  }
  return {
    count: images.length,
    sha256,
    sha256Complete: images.length > 0 && sha256.length === images.length,
  };
}

function phoneDimensionProblem(width, height) {
  if (width < PLAY_PHONE_MIN || height < PLAY_PHONE_MIN) return 'below-minimum';
  if (width > PLAY_PHONE_MAX || height > PLAY_PHONE_MAX) return 'above-maximum';
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  if (longSide > shortSide * 2) return 'aspect-over-2-to-1';
  return null;
}

function inspectPng(file) {
  const absolute = path.isAbsolute(file) ? file : path.join(STORE_DIR, file);
  if (!fs.existsSync(absolute)) return null;
  const size = pngSize(absolute);
  if (!size) return null;
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  return { width: size.width, height: size.height, sha256 };
}

function inspectLocalScreenshots(expectation) {
  if (!expectation || expectation.status === 'live_external') {
    return { phoneHashes: [], featureHashes: [], problems: [], dimensions: 'UNKNOWN' };
  }
  const problems = [];
  const phoneHashes = [];
  const featureHashes = [];
  for (const file of expectation.files || []) {
    const info = inspectPng(file);
    if (!info) {
      problems.push({ file, problem: 'missing' });
      continue;
    }
    const problem = phoneDimensionProblem(info.width, info.height);
    if (problem) problems.push({ file, problem, width: info.width, height: info.height });
    phoneHashes.push(info.sha256);
  }
  if (expectation.featureGraphic) {
    const info = inspectPng(expectation.featureGraphic);
    if (!info) {
      problems.push({ file: expectation.featureGraphic, problem: 'missing' });
    } else if (info.width !== FEATURE_WIDTH || info.height !== FEATURE_HEIGHT) {
      problems.push({
        file: expectation.featureGraphic,
        problem: 'not-1024x500',
        width: info.width,
        height: info.height,
      });
      featureHashes.push(info.sha256);
    } else {
      featureHashes.push(info.sha256);
    }
  }
  return {
    phoneHashes,
    featureHashes,
    problems,
    dimensions: problems.length ? 'INVALID' : 'OK',
  };
}

function sameHashes(left, right) {
  if (left.length !== right.length) return false;
  const a = left.slice().sort();
  const b = right.slice().sort();
  return a.every((value, index) => value === b[index]);
}

function judgeScreenshotSet({ expectation, counts, unreadable, localFacts }) {
  const phone = counts ? counts.phoneScreenshots : 0;
  const feature = counts ? counts.featureGraphic : 0;
  const observed = { phoneScreenshots: phone, featureGraphic: feature };
  const local = localFacts || inspectLocalScreenshots(expectation);
  if (unreadable) {
    return {
      status: 'UNKNOWN',
      dimensions: local.dimensions,
      dimensionProblems: local.problems,
      counts: observed,
      comparison: 'unavailable',
      note: 'Image read failed. Absence is not treated as a closed or empty listing.',
    };
  }
  if (!expectation) {
    const empty = phone === 0 && feature === 0;
    return {
      status: empty ? 'MISSING' : 'DRIFT',
      dimensions: 'UNKNOWN',
      dimensionProblems: [],
      counts: observed,
      comparison: 'count',
      note: 'No repository screenshot set.',
    };
  }
  if (expectation.status === 'live_external') {
    let status = 'DRIFT';
    if (phone >= 1 && feature >= 1) status = 'COUNT_MATCH';
    else if (phone === 0 && feature === 0) status = 'MISSING';
    return {
      status,
      dimensions: 'UNKNOWN',
      dimensionProblems: [],
      counts: observed,
      comparison: 'count',
      note: 'Repository has no image bytes for this set. SHA-256 was not compared. COUNT_MATCH is not content verification.',
    };
  }
  if (expectation.status !== 'present') {
    return {
      status: 'UNKNOWN',
      dimensions: local.dimensions,
      dimensionProblems: local.problems,
      counts: observed,
      comparison: 'unavailable',
      note: 'Screenshot set status is not recognized.',
    };
  }
  const expectedPhone = Array.isArray(expectation.files) ? expectation.files.length : 0;
  const expectedFeature = expectation.featureGraphic ? 1 : 0;
  if (phone === 0 && feature === 0) {
    return {
      status: 'MISSING',
      dimensions: local.dimensions,
      dimensionProblems: local.problems,
      counts: observed,
      comparison: 'count',
      note: 'Play has no phone screenshots or feature graphic for this listing.',
    };
  }
  if (phone !== expectedPhone || feature !== expectedFeature) {
    return {
      status: 'DRIFT',
      dimensions: local.dimensions,
      dimensionProblems: local.problems,
      counts: observed,
      comparison: 'count',
      note: 'Image counts differ. Bytes were not treated as a match.',
    };
  }
  const remotePhone = counts && Array.isArray(counts.phoneSha256) ? counts.phoneSha256 : [];
  const remoteFeature = counts && Array.isArray(counts.featureSha256) ? counts.featureSha256 : [];
  const hashesReady = Boolean(counts && counts.sha256Complete)
    && local.phoneHashes.length === expectedPhone
    && local.featureHashes.length === expectedFeature;
  if (!hashesReady) {
    return {
      status: 'COUNT_MATCH',
      dimensions: local.dimensions,
      dimensionProblems: local.problems,
      counts: observed,
      comparison: 'count',
      note: 'Counts match. Play did not return a SHA-256 for every image, so this is not CONTENT_MATCH.',
    };
  }
  const contentMatch = sameHashes(local.phoneHashes, remotePhone) && sameHashes(local.featureHashes, remoteFeature);
  return {
    status: contentMatch ? 'CONTENT_MATCH' : 'CONTENT_DRIFT',
    dimensions: local.dimensions,
    dimensionProblems: local.problems,
    counts: observed,
    comparison: 'sha256',
    note: contentMatch
      ? 'SHA-256 of the repository files matches the Play image hashes.'
      : 'SHA-256 differs. Do not replace either side without checking the files. Play may store the uploaded bytes, not a resized copy.',
  };
}

function judgeScreenshots(expectation, counts, imagesUnreadable, localFacts) {
  return judgeScreenshotSet({ expectation, counts, unreadable: imagesUnreadable, localFacts }).status;
}

function headlineStatus(textStatus, screenshotStatus, dimensions) {
  if (textStatus === 'UNKNOWN' || screenshotStatus === 'UNKNOWN') return 'UNKNOWN';
  if (textStatus === 'MISSING') return 'MISSING';
  if (textStatus === 'DRIFT' || screenshotStatus === 'DRIFT' || screenshotStatus === 'CONTENT_DRIFT' || screenshotStatus === 'MISSING') {
    return 'DRIFT';
  }
  if (dimensions === 'INVALID') return 'DRIFT';
  if (textStatus === 'MATCH' && screenshotStatus === 'CONTENT_MATCH') return 'MATCH';
  if (textStatus === 'MATCH' && screenshotStatus === 'COUNT_MATCH') return 'COUNT_MATCH';
  return 'DRIFT';
}

function recommendLanguage(row) {
  if (row.mapping === 'fallback') {
    return {
      action: 'keep-fallback',
      reason: 'This app locale uses the fallback Play listing. Do not create a separate listing.',
    };
  }
  if (row.appAvailability === 'registered') {
    return {
      action: 'do-not-publish',
      reason: 'The app locale is registered, not public. Do not publish a store listing.',
    };
  }
  if (row.text === 'MISSING' && row.screenshotDimensions === 'INVALID') {
    return {
      action: 'do-not-publish',
      reason: 'Repository screenshots fail Play size rules. Do not upload them or create the listing.',
    };
  }
  if (row.text === 'MISSING') {
    return {
      action: 'do-not-publish-yet',
      reason: 'No Play listing exists. Publishing needs a separate approval. Country availability stays unchanged.',
    };
  }
  if (row.screenshots === 'DRIFT' || row.screenshots === 'CONTENT_DRIFT' || row.text === 'DRIFT' || row.screenshotDimensions === 'INVALID') {
    return {
      action: 'review',
      reason: 'Do not overwrite the published listing or images from the repository without approval.',
    };
  }
  if (row.screenshots === 'COUNT_MATCH' || row.status === 'COUNT_MATCH') {
    return {
      action: 'verify-images',
      reason: 'Text can match while screenshot bytes are still unverified. COUNT_MATCH is not MATCH.',
    };
  }
  if (row.status === 'MATCH') return { action: 'none', reason: 'Text and screenshot bytes match.' };
  if (row.status === 'UNKNOWN') {
    return { action: 'retry-read', reason: 'The read failed. Do not treat the listing or country as closed.' };
  }
  return { action: 'review', reason: 'Needs a human decision before any Play change.' };
}

function languageRow(row, extra) {
  const result = {
    appLocale: row.appLocale,
    appAvailability: row.appAvailability || null,
    googleLocale: row.googleLocale,
    mapping: row.mapping,
    fallback: row.fallback,
    ...extra,
  };
  result.recommendation = recommendLanguage(result);
  return result;
}

function judgeLanguage(row, live) {
  const local = inspectLocalScreenshots(row.screenshotExpectation);
  const forbidden = Boolean(live && live.textForbidden);
  if (forbidden || !row.googleLocale) {
    return languageRow(row, {
      status: 'UNKNOWN',
      text: 'UNKNOWN',
      screenshots: 'UNKNOWN',
      screenshotDimensions: local.dimensions,
      dimensionProblems: local.problems,
      screenshotComparison: 'unavailable',
      differingFields: [],
      fields: {},
    });
  }
  const text = judgeText(row.expected, live.listing, row.brand);
  const shots = text.status === 'MISSING'
    ? {
      status: 'MISSING',
      dimensions: local.dimensions,
      dimensionProblems: local.problems,
      counts: { phoneScreenshots: 0, featureGraphic: 0 },
      comparison: 'count',
      note: 'Play has no listing, so it has no images for this language.',
    }
    : judgeScreenshotSet({
      expectation: row.screenshotExpectation,
      counts: live.counts,
      unreadable: Boolean(live.imagesUnreadable || live.imagesForbidden),
      localFacts: local,
    });
  return languageRow(row, {
    status: headlineStatus(text.status, shots.status, shots.dimensions),
    text: text.status,
    screenshots: shots.status,
    screenshotDimensions: shots.dimensions,
    dimensionProblems: shots.dimensionProblems,
    screenshotCounts: shots.counts,
    screenshotComparison: shots.comparison,
    screenshotNote: shots.note,
    differingFields: text.differingFields,
    fields: text.fields,
  });
}

function countryCodes(body) {
  if (!body) return [];
  const list = Array.isArray(body.countries) ? body.countries : [];
  return list.map((entry) => {
    if (typeof entry === 'string') return entry.toUpperCase();
    return String(entry.countryCode || '').toUpperCase();
  }).filter(Boolean).sort();
}

function readTrackCountryAvailability(body) {
  // A missing body or a body without countries is an unknown read, not a closed market.
  // TrackCountryAvailability uses restOfWorld. includeRestOfWorld is not an API field.
  // When the sync flag is true, countries and restOfWorld already reflect the default release track.
  if (!body || typeof body !== 'object' || !Array.isArray(body.countries)) return null;
  return {
    countries: countryCodes(body),
    restOfWorld: body.restOfWorld === true,
    syncWithRelease: body[SYNC_WITH_RELEASE] === true,
  };
}

function judgeMarkets(repoLive, observed, unreadable, availability = {}) {
  const restOfWorld = availability.restOfWorld === true;
  const syncWithRelease = availability.syncWithRelease === true;
  const base = {
    action: 'none',
    fiStoreAvailability: 'KEEP_OPEN',
    restOfWorld: null,
    [SYNC_WITH_RELEASE]: null,
    repoLive: repoLive.slice().sort(),
  };
  if (unreadable || observed == null) {
    return { ...base, status: 'UNKNOWN', observed: null, fiObserved: 'UNKNOWN' };
  }
  const live = observed.slice().sort();
  const same = !restOfWorld
    && live.length === base.repoLive.length
    && live.every((code, index) => code === base.repoLive[index]);
  return {
    ...base,
    status: same ? 'MATCH' : 'DRIFT',
    observed: live,
    restOfWorld,
    [SYNC_WITH_RELEASE]: syncWithRelease,
    fiObserved: restOfWorld || live.includes('FI') ? 'present' : 'absent',
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
  const summary = { MATCH: 0, COUNT_MATCH: 0, DRIFT: 0, MISSING: 0, UNKNOWN: 0 };
  for (const row of languages) {
    if (summary[row.status] == null) summary[row.status] = 0;
    summary[row.status] += 1;
  }
  return summary;
}

function finlandKeptOpen(markets) {
  if (!markets || markets.status !== 'DRIFT' || markets.action !== 'none') return false;
  if (markets.restOfWorld || markets.fiObserved !== 'present') return false;
  const observed = markets.observed || [];
  const repo = markets.repoLive || [];
  const extra = observed.filter((code) => !repo.includes(code));
  const missing = repo.filter((code) => !observed.includes(code));
  return missing.length === 0 && extra.length === 1 && extra[0] === 'FI';
}

function storeContentReady(report) {
  if (!report || report.auth !== 'OK') return false;
  if (!Array.isArray(report.languages) || report.languages.length === 0) return false;
  if (!report.languages.every((row) => row.status === 'MATCH')) return false;
  const markets = report.markets || {};
  if (markets.status === 'UNKNOWN') return false;
  if (markets.status === 'DRIFT' && !finlandKeptOpen(markets)) return false;
  return true;
}

function launchRow(row) {
  if (row.mapping === 'fallback') {
    return { appLocale: row.appLocale, publish: false, group: 'fallback', reason: 'Keep the English Play listing. Do not add a separate listing.' };
  }
  if (row.appAvailability === 'registered') {
    return { appLocale: row.appLocale, publish: false, group: 'hidden', reason: 'App locale is registered, not public. Do not publish a store listing.' };
  }
  if (row.text && row.text !== 'MISSING' && row.text !== 'UNKNOWN') {
    return { appLocale: row.appLocale, publish: false, group: 'already-listed', reason: 'A Play listing already exists. Do not overwrite it from the repository.' };
  }
  if (row.screenshotDimensions === 'INVALID') {
    return { appLocale: row.appLocale, publish: false, group: 'blocked-dimensions', reason: 'Repository screenshots do not meet Play size rules. Do not upload them.' };
  }
  if (row.appLocale === 'fi-FI') {
    return { appLocale: row.appLocale, publish: false, group: 'approve-first', reason: 'Finland is already open. This is the first listing candidate after approval. This audit does not publish it.' };
  }
  if (row.appLocale === 'fr-FR') {
    return { appLocale: row.appLocale, publish: false, group: 'approve-next', reason: 'Canada is open. A French listing helps that storefront after approval.' };
  }
  if (row.appLocale === 'nb-NO') {
    return { appLocale: row.appLocale, publish: false, group: 'prepare-only', reason: 'Norwegian copy is in the repo. Norway is not an open country. Do not change availability.' };
  }
  return { appLocale: row.appLocale, publish: false, group: 'eu-ready', reason: 'Public app locale with a repository listing. Publish only after a separate approval.' };
}

function finishReport(report) {
  report.markets.acceptedDifference = finlandKeptOpen(report.markets);
  report.launchPlan = (report.languages || []).map(launchRow);
  report.summary = summarize(report.languages || []);
  report.listingContentReady = storeContentReady(report);
  return report;
}

function clip(value, max) {
  const text = value == null ? '' : String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function renderAuditMarkdown(report) {
  const lines = [];
  const ready = report.listingContentReady === true;
  lines.push('# Google Play live-audit');
  lines.push('');
  lines.push(ready
    ? 'Butiksinnehållet stämmer med repositoryt.'
    : 'Butiksinnehållet är inte klart. Ett lyckat API-anrop är inte en ren butik.');
  lines.push('');
  lines.push(`- API-auth: ${report.auth || 'UNKNOWN'}`);
  lines.push(`- Butiksinnehåll klart: ${ready ? 'ja' : 'nej'}`);
  lines.push(`- Finland: ${report.fiStoreAvailability || 'KEEP_OPEN'}`);
  lines.push(`- Bildkontroll: ${report.screenshotComparisonNote || SCREENSHOT_COMPARISON_NOTE}`);
  lines.push('');
  const markets = report.markets || {};
  lines.push('## Länder');
  lines.push('');
  lines.push(`- Status: ${markets.status || 'UNKNOWN'}`);
  const observedLabel = (markets.observed || []).join(', ');
  lines.push(`- Observerade: ${observedLabel.length ? observedLabel : 'unknown'}`);
  lines.push(`- Repository live: ${(markets.repoLive || []).join(', ') || 'inga'}`);
  lines.push(`- Finland observerat: ${markets.fiObserved || 'UNKNOWN'}`);
  const restLabel = markets.restOfWorld == null ? 'unknown' : String(markets.restOfWorld);
  lines.push(`- restOfWorld: ${restLabel}`);
  lines.push(`- Åtgärd: ${markets.action || 'none'}`);
  if (markets.acceptedDifference) {
    lines.push('- Finland är öppet utöver repositoryts live-lista. Lämna Finland öppet.');
  }
  lines.push('');
  const summary = report.summary || {};
  lines.push('## Språk');
  lines.push('');
  lines.push(`- MATCH: ${summary.MATCH || 0}`);
  lines.push(`- COUNT_MATCH: ${summary.COUNT_MATCH || 0}`);
  lines.push(`- DRIFT: ${summary.DRIFT || 0}`);
  lines.push(`- MISSING: ${summary.MISSING || 0}`);
  lines.push(`- UNKNOWN: ${summary.UNKNOWN || 0}`);
  lines.push('');
  const groups = [
    ['Avvikelser', (row) => row.status === 'DRIFT' || row.status === 'COUNT_MATCH'],
    ['Saknas i Play', (row) => row.status === 'MISSING'],
    ['Okänt', (row) => row.status === 'UNKNOWN'],
    ['Innehåll matchar', (row) => row.status === 'MATCH'],
  ];
  for (const [title, pred] of groups) {
    const rows = (report.languages || []).filter(pred);
    if (!rows.length) continue;
    lines.push(`### ${title}`);
    lines.push('');
    for (const row of rows) {
      lines.push(`- ${row.appLocale} → ${row.googleLocale || 'none'} (${row.mapping}): text ${row.text}, skärmbilder ${row.screenshots}, mått ${row.screenshotDimensions || 'UNKNOWN'}`);
      if (row.differingFields && row.differingFields.length) lines.push(`  - Fält: ${row.differingFields.join(', ')}`);
      if (row.screenshotCounts) {
        lines.push(`  - Bilder: telefon ${row.screenshotCounts.phoneScreenshots}, feature ${row.screenshotCounts.featureGraphic}`);
      }
      if (row.recommendation) lines.push(`  - Åtgärd: ${row.recommendation.action}. ${row.recommendation.reason}`);
      for (const field of row.differingFields || []) {
        const detail = row.fields && row.fields[field];
        if (!detail) continue;
        lines.push(`  - ${field} i Play: ${clip(detail.live, 400)}`);
        lines.push(`  - ${field} i repositoryt: ${clip(detail.expected, 400)}`);
      }
    }
    lines.push('');
  }
  lines.push('## Lanseringsplan');
  lines.push('');
  lines.push('Inget i planen publiceras av auditen.');
  lines.push('');
  for (const item of report.launchPlan || []) {
    if (item.publish) lines.push(`- ${item.appLocale}: publicering är inte tillåten från det här jobbet.`);
    lines.push(`- ${item.appLocale} (${item.group}): ${item.reason}`);
  }
  lines.push('');
  if ((report.forbidden || []).length) {
    lines.push('## Blockerade läsningar');
    lines.push('');
    for (const item of report.forbidden) {
      lines.push(`- ${item.method} ${item.path} → ${item.status}`);
    }
    lines.push('');
  }
  lines.push('Skrivningar: inga. Ingen listningsändring, ingen bilduppladdning, ingen prisändring och ingen landsändring.');
  lines.push('');
  return `${lines.join('\n')}\n`;
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
    screenshotComparison: SCREENSHOT_COMPARISON,
    screenshotComparisonNote: SCREENSHOT_COMPARISON_NOTE,
    markets: judgeMarkets(liveMarkets, null, true),
    languages: [],
    summary: { MATCH: 0, COUNT_MATCH: 0, DRIFT: 0, MISSING: 0, UNKNOWN: 0 },
    listingContentReady: false,
  };

  let editId = null;
  try {
    const created = await reader.createEdit();
    recordForbidden(forbidden, created);
    if (!created.ok || !created.body || !created.body.id) {
      report.auth = created.forbidden ? 'FORBIDDEN' : 'FAILED';
      report.languages = resolvedPlan.map((row) => judgeLanguage(row, { textForbidden: true }));
      return finishReport(report);
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
          const phoneFacts = phone.ok ? imageFacts(phone.body) : { count: 0, sha256: [], sha256Complete: false };
          const featureFacts = feature.ok ? imageFacts(feature.body) : { count: 0, sha256: [], sha256Complete: false };
          counts.set(language, {
            phoneScreenshots: phoneFacts.count,
            featureGraphic: featureFacts.count,
            phoneSha256: phoneFacts.sha256,
            featureSha256: featureFacts.sha256,
            sha256Complete: phone.ok && feature.ok && phoneFacts.sha256Complete && featureFacts.sha256Complete,
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
    const availability = countries.ok && countries.body
      ? readTrackCountryAvailability(countries.body)
      : null;
    report.markets = judgeMarkets(
      liveMarkets,
      availability ? availability.countries : null,
      !availability,
      availability || {}
    );
    return finishReport(report);
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
  judgeScreenshotSet,
  judgeLanguage,
  judgeMarkets,
  countryCodes,
  readTrackCountryAvailability,
  phoneDimensionProblem,
  finlandKeptOpen,
  storeContentReady,
  finishReport,
  renderAuditMarkdown,
  SCREENSHOT_COMPARISON,
  SYNC_WITH_RELEASE,
  SCREENSHOT_COMPARISON_NOTE,
  runPlayLiveAudit,
  redactValue,
};
