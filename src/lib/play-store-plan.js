'use strict';

/**
 * Build and apply a Google Play store-listing plan.
 * Dry-run opens an edit, reads it, and deletes it. Apply commits only after
 * the approved digest still matches a fresh read. A commit is pending review,
 * not proof that the public store has changed.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const appCatalog = require('../../config/locale-catalog.json');
const { pngSize } = require('./locale-readiness');
const { countryCodes, languagePlan, normalizeText, PACKAGE_NAME } = require('./play-live-audit');
const { createPlayReader } = require('./play-publisher-read');
const { createPlayWriter, FULL_MAX, SHORT_MAX, TITLE_MAX } = require('./play-publisher-write');

const STORE_DIR = path.join(__dirname, '..', '..', 'store');
const CONFIRMATION = 'PUBLISH_APPROVED_PLAN';
const ENVIRONMENT_NAME = 'store-publishing';
const TEXT_LIMITS = Object.freeze({
  title: TITLE_MAX,
  shortDescription: SHORT_MAX,
  fullDescription: FULL_MAX,
});
const MAX_PHONE = 8;
const FEATURE_WIDTH = 1024;
const FEATURE_HEIGHT = 500;

function appAvailability(appLocale) {
  const row = (appCatalog.locales || []).find((locale) => locale.id === appLocale);
  return row && row.availability ? row.availability : 'UNKNOWN';
}

function phoneProblem(width, height) {
  if (width < 320 || height < 320) return 'below-minimum';
  if (width > 3840 || height > 3840) return 'above-maximum';
  if (Math.max(width, height) > Math.min(width, height) * 2) return 'aspect-over-2-to-1';
  return null;
}

function defaultReadLocal(file) {
  const absolute = path.isAbsolute(file) ? file : path.join(STORE_DIR, file);
  if (!fs.existsSync(absolute)) return { file, problem: 'missing' };
  const size = pngSize(absolute);
  if (!size) return { file, problem: 'not-png' };
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  return { file, absolute, width: size.width, height: size.height, sha256 };
}

function imageFacts(result) {
  if (result && result.status === 404) return { unreadable: false, ids: [], sha256: [] };
  if (!result || !result.ok || !result.body || !Array.isArray(result.body.images)) {
    return { unreadable: true, ids: [], sha256: [] };
  }
  const ids = [];
  const sha256 = [];
  for (const image of result.body.images) {
    if (!image || typeof image.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(image.id)) {
      return { unreadable: true, ids: [], sha256: [] };
    }
    if (typeof image.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(image.sha256)) {
      return { unreadable: true, ids: [], sha256: [] };
    }
    ids.push(image.id);
    sha256.push(image.sha256.toLowerCase());
  }
  return { unreadable: false, ids, sha256 };
}

function countrySnapshot(result) {
  if (!result || result.ok !== true || !result.body || !Array.isArray(result.body.countries)) {
    return { status: 'UNKNOWN', observed: null, restOfWorld: null, fiObserved: 'UNKNOWN' };
  }
  const observed = countryCodes(result.body);
  const restOfWorld = result.body.restOfWorld === true;
  return {
    status: 'READ',
    observed,
    restOfWorld,
    fiObserved: restOfWorld || observed.includes('FI') ? 'present' : 'absent',
  };
}

function listingView(listing) {
  if (!listing) return null;
  return {
    language: listing.language,
    title: listing.title || '',
    shortDescription: listing.shortDescription || '',
    fullDescription: listing.fullDescription || '',
    video: typeof listing.video === 'string' ? listing.video : '',
  };
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function localSet(expectation, readLocal) {
  const files = [];
  const problems = [];
  for (const file of expectation.files || []) {
    const info = readLocal(file);
    if (!info || info.problem) {
      problems.push({ file, problem: info && info.problem ? info.problem : 'missing' });
      continue;
    }
    const problem = phoneProblem(info.width, info.height);
    if (problem) problems.push({ file, problem, width: info.width, height: info.height });
    else files.push(info);
  }
  let feature = null;
  if (expectation.featureGraphic) {
    const info = readLocal(expectation.featureGraphic);
    if (!info || info.problem) problems.push({ file: expectation.featureGraphic, problem: info && info.problem ? info.problem : 'missing' });
    else if (info.width !== FEATURE_WIDTH || info.height !== FEATURE_HEIGHT) {
      problems.push({ file: expectation.featureGraphic, problem: 'not-1024x500', width: info.width, height: info.height });
    } else feature = info;
  } else {
    problems.push({ file: 'featureGraphic', problem: 'missing' });
  }
  if ((expectation.files || []).length > MAX_PHONE) problems.push({ problem: 'too-many-screenshots' });
  return { files, feature, problems };
}

function textChanges(row, live) {
  const changes = [];
  const blocked = [];
  const brand = row.brand;
  for (const field of Object.keys(TEXT_LIMITS)) {
    const want = normalizeText(row.expected ? row.expected[field] : '', brand);
    const got = live ? normalizeText(live[field], brand) : '';
    if (!want) {
      blocked.push({ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'missing-repo-text', field });
      continue;
    }
    if ([...want].length > TEXT_LIMITS[field]) {
      blocked.push({ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'over-limit', field });
      continue;
    }
    if (want === got) continue;
    changes.push({
      id: `${row.googleLocale}:${field}`,
      locale: row.appLocale,
      googleLocale: row.googleLocale,
      kind: 'text',
      field,
      from: live ? got : null,
      to: want,
      risk: live ? (got ? 'replaces-live-text' : 'fills-empty') : 'new-listing',
    });
  }
  return { changes, blocked };
}

function imageChange(row, liveFacts, readLocal) {
  const expectation = row.screenshotExpectation;
  if (!expectation || expectation.status === 'live_external') {
    return { blocked: [{ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'images-not-in-repo' }] };
  }
  if (expectation.status !== 'present') {
    return { blocked: [{ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'images-not-in-repo' }] };
  }
  const local = localSet(expectation, readLocal);
  if (local.problems.length) {
    return { blocked: [{ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'bad-dimensions', problems: local.problems }] };
  }
  const changes = [];
  for (const [imageType, localItems, remote] of [
    ['phoneScreenshots', local.files, liveFacts ? liveFacts.phone : null],
    ['featureGraphic', local.feature ? [local.feature] : [], liveFacts ? liveFacts.feature : null],
  ]) {
    if (liveFacts && remote && remote.unreadable) {
      return { blocked: [{ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'images-unreadable', imageType }] };
    }
    const from = remote && !remote.unreadable ? remote.sha256 : [];
    const to = localItems.map((item) => item.sha256);
    if (sameList(from, to)) continue;
    changes.push({
      id: `${row.googleLocale}:${imageType}`,
      locale: row.appLocale,
      googleLocale: row.googleLocale,
      kind: 'images',
      imageType,
      from: { sha256: from },
      to: { sha256: to, files: localItems.map((item) => item.file) },
      risk: from.length ? 'replaces-live-images' : 'new-images',
    });
  }
  return { changes };
}

function considerRow(row, listings, images, readLocal) {
  if (row.mapping !== 'direct') {
    return { blocked: [{ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'fallback' }] };
  }
  if (appAvailability(row.appLocale) === 'registered') {
    return { blocked: [{ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'hidden' }] };
  }
  const live = listings.get(row.googleLocale) || null;
  const liveFacts = images.get(row.googleLocale) || null;
  const imagesPlan = imageChange(row, live ? liveFacts : null, readLocal);
  const text = textChanges(row, live);
  const imageBlocked = imagesPlan.blocked || [];
  const imageChanges = imagesPlan.changes || [];
  if (!live && (imageBlocked.length || text.blocked.length || text.changes.length < 3)) {
    return {
      blocked: [{ locale: row.appLocale, googleLocale: row.googleLocale, reason: 'new-listing-without-images' }]
        .concat(text.blocked, imageBlocked),
    };
  }
  if (text.blocked.length) {
    return { changes: imageChanges, blocked: text.blocked.concat(imageBlocked) };
  }
  return { changes: text.changes.concat(imageChanges), blocked: imageBlocked };
}

function parseLocales(value) {
  if (!value || !String(value).trim()) return null;
  return [...new Set(String(value).split(',').map((item) => item.trim()).filter(Boolean))].sort();
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

function digestOf(plan) {
  const body = stable({
    schema: 1,
    packageName: plan.packageName,
    locales: plan.locales,
    countries: plan.countries,
    changes: plan.changes,
    blocked: plan.blocked,
    applyAllowed: plan.applyAllowed,
    blockReason: plan.blockReason,
  });
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

function buildPlan({
  rows,
  listings,
  images,
  countries,
  localesFilter,
  readLocal = defaultReadLocal,
  packageName = PACKAGE_NAME,
}) {
  const selected = parseLocales(localesFilter);
  const known = new Set(rows.map((row) => row.appLocale));
  const changes = [];
  const blocked = [];
  const unknown = selected ? selected.filter((locale) => !known.has(locale)) : [];
  for (const locale of unknown) blocked.push({ locale, googleLocale: null, reason: 'unknown-locale' });
  for (const row of rows) {
    if (selected && !selected.includes(row.appLocale)) continue;
    const result = considerRow(row, listings, images, readLocal);
    for (const change of result.changes || []) changes.push(change);
    for (const item of result.blocked || []) blocked.push(item);
  }
  changes.sort((a, b) => a.id.localeCompare(b.id));
  blocked.sort((a, b) => `${a.locale}:${a.reason}:${a.field || ''}`.localeCompare(`${b.locale}:${b.reason}:${b.field || ''}`));
  let applyAllowed = countries.status === 'READ' && unknown.length === 0;
  let blockReason = null;
  if (countries.status !== 'READ') {
    applyAllowed = false;
    blockReason = 'countries-unknown';
  } else if (unknown.length) {
    applyAllowed = false;
    blockReason = 'unknown-locale';
  } else if (changes.length === 0) {
    applyAllowed = false;
    blockReason = 'no-changes';
  }
  const plan = {
    schema: 1,
    packageName,
    locales: selected || ['*'],
    countries,
    changes,
    blocked,
    applyAllowed,
    blockReason,
  };
  plan.digest = digestOf(plan);
  return plan;
}

function clip(value, max) {
  const text = value == null ? '' : String(value);
  if ([...text].length <= max) return text;
  return `${[...text].slice(0, max).join('')}…`;
}

function reasonText(reason) {
  const labels = {
    fallback: 'Språket använder den engelska listningen. Ingen egen listning skapas.',
    hidden: 'Språket är bara registrerat. Det publiceras inte.',
    'over-limit': 'Texten är längre än Google Plays gräns och skickas inte.',
    'bad-dimensions': 'Skärmbilderna har fel mått. De laddas inte upp.',
    'images-unreadable': 'Play skickade inga bildhashar. Befintliga bilder rörs inte.',
    'images-not-in-repo': 'Repositoryt har inga bildbytes för språket. Bilder i Play lämnas orörda.',
    'new-listing-without-images': 'En ny listning kräver godkända bilder. Den skapas inte.',
    'missing-repo-text': 'Repositoryt saknar text för fältet.',
    'unknown-locale': 'Språkkoden finns inte i repositoryt.',
    'countries-unknown': 'Länderna kunde inte läsas. Inget skrivs.',
    'no-changes': 'Det finns inga tillåtna ändringar.',
  };
  return labels[reason] || reason;
}

function renderPlanMarkdown(report) {
  const lines = [];
  const status = report.status || 'UNKNOWN';
  lines.push('# Google Play-butik');
  lines.push('');
  if (status === 'COMMITTED_PENDING_REVIEW') {
    lines.push('Ändringen är inskickad till Google Play. Den väntar på granskning och är inte verifierad som live.');
  } else if (status === 'DRY_RUN') {
    lines.push('Inget har publicerats. Detta är en förhandsvisning.');
  } else if (status === 'NO_CHANGES') {
    lines.push('Inget har publicerats. Planen innehåller inga ändringar.');
  } else {
    lines.push(`Ingen publicering genomfördes. Status: ${status}.`);
  }
  lines.push('');
  lines.push(`- livePublicationVerified: ${report.livePublicationVerified === true ? 'yes' : 'no'}`);
  lines.push(`- published: no`);
  lines.push('- Länder, priser, spår och versioner ändras inte.');
  lines.push('- Finland lämnas som det är.');
  lines.push('');
  const countries = report.plan ? report.plan.countries : null;
  lines.push('## Länder');
  lines.push('');
  if (!countries || countries.status !== 'READ') {
    lines.push('- Länder: unknown');
  } else {
    const observed = (countries.observed || []).join(', ');
    lines.push(`- Observerade: ${observed.length ? observed : 'none'}`);
    lines.push(`- Finland observerat: ${countries.fiObserved}`);
    lines.push(`- restOfWorld: ${String(countries.restOfWorld)}`);
  }
  lines.push('');
  const plan = report.plan;
  if (plan) {
    lines.push('## Plan');
    lines.push('');
    lines.push(`- SHA-256: ${plan.digest}`);
    lines.push(`- Apply tillåtet: ${plan.applyAllowed ? 'yes' : 'no'}`);
    if (plan.blockReason) lines.push(`- Orsak: ${reasonText(plan.blockReason)}`);
    lines.push(`- Lokaler: ${plan.locales.join(', ')}`);
    lines.push('');
    lines.push('## Ändringar');
    lines.push('');
    if (!plan.changes.length) lines.push('- Inga.');
    for (const change of plan.changes) {
      if (change.kind === 'text') {
        lines.push(`- ${change.locale} ${change.field} (${change.risk})`);
        lines.push(`  - Play: ${clip(change.from, 300)}`);
        lines.push(`  - Repository: ${clip(change.to, 300)}`);
      } else {
        lines.push(`- ${change.locale} ${change.imageType} (${change.risk}): ${change.from.sha256.length} bilder blir ${change.to.sha256.length}`);
      }
    }
    lines.push('');
    lines.push('## Inte med i publiceringen');
    lines.push('');
    if (!plan.blocked.length) lines.push('- Inget.');
    for (const item of plan.blocked) {
      lines.push(`- ${item.locale}: ${reasonText(item.reason)}`);
    }
    lines.push('');
    lines.push('För apply: kör om arbetsflödet på main, ange denna SHA-256, och skriv PUBLISH_APPROVED_PLAN. Godkänn sedan environment store-publishing.');
    lines.push('');
  }
  if (report.blockReason) {
    lines.push(`Blockerad: ${reasonText(report.blockReason)}`);
    lines.push('');
  }
  lines.push('Inga priser, länder eller versioner har ändrats.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function readJson(response) {
  if (response && typeof response.json === 'function') {
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }
  if (response && typeof response.text === 'function') {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }
  return null;
}

async function reviewersApproved({ fetchImpl, repo, runId, token, environmentName = ENVIRONMENT_NAME }) {
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return { ok: false, reason: 'unverified' };
  if (!/^\d{1,20}$/.test(String(runId || ''))) return { ok: false, reason: 'unverified' };
  if (!token) return { ok: false, reason: 'unverified' };
  const fetchFn = fetchImpl || globalThis.fetch;
  let response;
  try {
    response = await fetchFn(`https://api.github.com/repos/${repo}/actions/runs/${runId}/approvals`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'play-store-publish',
      },
    });
  } catch (_) {
    return { ok: false, reason: 'unverified' };
  }
  if (!response || response.status < 200 || response.status >= 300) return { ok: false, reason: 'unverified' };
  const body = await readJson(response);
  const list = Array.isArray(body) ? body : (body && Array.isArray(body.approvals) ? body.approvals : null);
  if (!list) return { ok: false, reason: 'unverified' };
  const approved = list.some((item) => {
    if (!item || String(item.state || '').toLowerCase() !== 'approved') return false;
    const envs = Array.isArray(item.environments) ? item.environments : [];
    return envs.some((env) => env && env.name === environmentName);
  });
  return approved ? { ok: true, reason: 'approved' } : { ok: false, reason: 'missing' };
}

async function readSnapshot(client, editId, rows) {
  const listed = await client.listListings(editId);
  if (!listed.ok) {
    const error = new Error(listed.forbidden ? 'PLAY_FORBIDDEN' : 'PLAY_READ_FAILED');
    error.result = listed;
    throw error;
  }
  const listings = new Map();
  const bodyList = listed.body && Array.isArray(listed.body.listings) ? listed.body.listings : [];
  for (const listing of bodyList) {
    if (listing && listing.language) listings.set(listing.language, listingView(listing));
  }
  const images = new Map();
  const locales = [...new Set(rows.filter((row) => row.mapping === 'direct' && row.googleLocale).map((row) => row.googleLocale))];
  for (const language of locales) {
    if (!listings.has(language)) continue;
    const phone = await client.listImages(editId, language, 'phoneScreenshots');
    const feature = await client.listImages(editId, language, 'featureGraphic');
    images.set(language, { phone: imageFacts(phone), feature: imageFacts(feature) });
  }
  const countries = countrySnapshot(await client.countryAvailability(editId));
  return { listings, images, countries };
}

function bytesFor(file, expectedHash) {
  const info = defaultReadLocal(file);
  if (!info || info.problem || info.sha256 !== expectedHash) {
    throw new Error('PLAY_LOCAL_CHANGED');
  }
  return fs.readFileSync(info.absolute);
}

async function executeChanges(writer, editId, plan, snapshot) {
  const byLocale = new Map();
  for (const change of plan.changes) {
    if (change.kind !== 'text') continue;
    if (!byLocale.has(change.googleLocale)) byLocale.set(change.googleLocale, []);
    byLocale.get(change.googleLocale).push(change);
  }
  for (const [language, changes] of byLocale) {
    const live = snapshot.listings.get(language);
    const body = {
      language,
      title: live ? live.title : '',
      shortDescription: live ? live.shortDescription : '',
      fullDescription: live ? live.fullDescription : '',
    };
    if (live && live.video) body.video = live.video;
    for (const change of changes) body[change.field] = change.to;
    const updated = await writer.updateListing(editId, language, body);
    if (!updated.ok) throw new Error('PLAY_WRITE_FAILED');
  }
  for (const change of plan.changes) {
    if (change.kind !== 'images') continue;
    const remote = snapshot.images.get(change.googleLocale);
    const side = remote
      ? (change.imageType === 'phoneScreenshots' ? remote.phone : remote.feature)
      : null;
    let ids = [];
    if (!side) {
      if (change.from.sha256.length !== 0) throw new Error('PLAY_IMAGE_MISMATCH');
    } else if (side.unreadable || !sameList(side.sha256, change.from.sha256)) {
      throw new Error('PLAY_IMAGE_MISMATCH');
    } else {
      ids = side.ids;
    }
    for (const imageId of ids) {
      const deleted = await writer.deleteImage(editId, change.googleLocale, change.imageType, imageId);
      if (!deleted.ok && deleted.status !== 404) throw new Error('PLAY_WRITE_FAILED');
    }
    for (let index = 0; index < change.to.files.length; index += 1) {
      const bytes = bytesFor(change.to.files[index], change.to.sha256[index]);
      const uploaded = await writer.uploadImage(editId, change.googleLocale, change.imageType, bytes);
      if (!uploaded.ok) throw new Error('PLAY_WRITE_FAILED');
    }
  }
}

function baseReport(extra) {
  return {
    mode: extra.mode,
    status: extra.status,
    published: false,
    livePublicationVerified: false,
    committed: false,
    countryChange: false,
    pricingChange: false,
    trackChange: false,
    packageName: extra.packageName || PACKAGE_NAME,
    plan: extra.plan || null,
    blockReason: extra.blockReason || null,
    edit: { created: false, committed: false, deleted: false },
    ...extra,
    published: false,
    livePublicationVerified: false,
  };
}

async function withEdit(client, mode, work) {
  const created = await client.createEdit();
  if (!created.ok || !created.body || !created.body.id) {
    return baseReport({
      mode,
      status: created.forbidden ? 'FORBIDDEN' : 'FAILED',
      blockReason: created.forbidden ? 'forbidden' : 'edit-create-failed',
    });
  }
  const editId = created.body.id;
  let committed = false;
  let result = null;
  try {
    const outcome = await work(editId);
    committed = outcome.committed === true;
    result = outcome.report;
    result.edit.created = true;
    return result;
  } finally {
    if (!committed) {
      try {
        const deleted = await client.deleteEdit(editId);
        if (result && result.edit) result.edit.deleted = Boolean(deleted.ok || deleted.status === 404);
      } catch (_) {
        if (result && result.edit) result.edit.deleted = false;
      }
    }
  }
}

async function runPlayStorePublish({
  mode = 'dry-run',
  confirmation = '',
  planSha256 = '',
  locales = '',
  ref = '',
  repo = '',
  runId = '',
  githubToken = '',
  playToken,
  packageName = PACKAGE_NAME,
  fetchImpl,
  rows,
  readLocal,
  environmentName = ENVIRONMENT_NAME,
} = {}) {
  const resolvedRows = rows || languagePlan();
  const apply = mode === 'apply';
  if (!playToken) {
    return baseReport({ mode: apply ? 'apply' : 'dry-run', status: 'MISSING_SECRET', blockReason: 'missing-secret' });
  }
  if (!apply) {
    const reader = createPlayReader({ packageName, token: playToken, fetchImpl });
    return withEdit(reader, 'dry-run', async (editId) => {
      const snapshot = await readSnapshot(reader, editId, resolvedRows);
      const plan = buildPlan({
        rows: resolvedRows,
        listings: snapshot.listings,
        images: snapshot.images,
        countries: snapshot.countries,
        localesFilter: locales,
        readLocal,
        packageName,
      });
      const report = baseReport({
        mode: 'dry-run',
        status: 'DRY_RUN',
        plan,
        edit: { created: true, committed: false, deleted: false },
      });
      return { committed: false, report };
    });
  }

  if (ref !== 'refs/heads/main') {
    return baseReport({ mode: 'apply', status: 'APPLY_BLOCKED', blockReason: 'ref' });
  }
  if (String(confirmation || '').trim() !== CONFIRMATION) {
    return baseReport({ mode: 'apply', status: 'APPLY_BLOCKED', blockReason: 'confirmation' });
  }
  const reviewers = await reviewersApproved({
    fetchImpl,
    repo,
    runId,
    token: githubToken,
    environmentName,
  });
  if (!reviewers.ok) {
    return baseReport({ mode: 'apply', status: 'APPLY_BLOCKED', blockReason: reviewers.reason === 'missing' ? 'reviewers-missing' : 'reviewers-unverified' });
  }
  const writer = createPlayWriter({ packageName, token: playToken, fetchImpl });
  writer.gates.refOk = true;
  writer.gates.confirmationOk = true;
  writer.gates.reviewersOk = true;
  return withEdit(writer, 'apply', async (editId) => {
    const snapshot = await readSnapshot(writer, editId, resolvedRows);
    const plan = buildPlan({
      rows: resolvedRows,
      listings: snapshot.listings,
      images: snapshot.images,
      countries: snapshot.countries,
      localesFilter: locales,
      readLocal,
      packageName,
    });
    const approved = String(planSha256 || '').trim().toLowerCase();
    if (!approved || approved !== plan.digest || !plan.applyAllowed) {
      const report = baseReport({
        mode: 'apply',
        status: 'APPLY_BLOCKED',
        blockReason: plan.digest !== approved ? 'plan' : (plan.blockReason || 'plan'),
        plan,
        edit: { created: true, committed: false, deleted: false },
      });
      return { committed: false, report };
    }
    writer.gates.planVerified = true;
    try {
      await executeChanges(writer, editId, plan, snapshot);
    } catch (error) {
      const report = baseReport({
        mode: 'apply',
        status: 'FAILED',
        blockReason: error && error.message ? error.message : 'write-failed',
        plan,
        edit: { created: true, committed: false, deleted: false },
      });
      return { committed: false, report };
    }
    const committedResult = await writer.commitEdit(editId);
    if (!committedResult.ok) {
      const blob = JSON.stringify(committedResult.body || '').toLowerCase();
      const inReview = blob.includes('review');
      const report = baseReport({
        mode: 'apply',
        status: inReview ? 'APPLY_BLOCKED_IN_REVIEW' : 'FAILED',
        blockReason: inReview ? 'in-review' : 'commit-failed',
        plan,
        edit: { created: true, committed: false, deleted: false },
      });
      return { committed: false, report };
    }
    const report = baseReport({
      mode: 'apply',
      status: 'COMMITTED_PENDING_REVIEW',
      plan,
      committed: true,
      edit: { created: true, committed: true, deleted: false },
    });
    return { committed: true, report };
  });
}

module.exports = {
  CONFIRMATION,
  ENVIRONMENT_NAME,
  buildPlan,
  countrySnapshot,
  renderPlanMarkdown,
  reviewersApproved,
  runPlayStorePublish,
};
