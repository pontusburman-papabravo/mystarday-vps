'use strict';

/**
 * Compare an Apple Live Audit with store/locales.json.
 * Read-only. Never proposes a write against a protected or external field.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadStoreCatalog, resolveStoreLocales, effectiveListing, resolveStoreUrl } = require('./store-locale');
const { brandName } = require('./public-html-placeholders');
const { pngSize } = require('./locale-readiness');

const STORE_DIR = path.join(__dirname, '..', '..', 'store');
const PROTECTED_LOCALES = Object.freeze(['sv', 'en-GB']);
const LOCAL_DISPLAY_TYPES = Object.freeze({
  '1290x2796': 'APP_IPHONE_67',
  '1320x2868': 'APP_IPHONE_69',
  '1260x2736': 'APP_IPHONE_69',
  '1284x2778': 'APP_IPHONE_65',
  '1242x2688': 'APP_IPHONE_65',
  '1242x2208': 'APP_IPHONE_55',
});

const APP_INFO_FIELDS = Object.freeze([
  ['name', 'name', false],
  ['subtitle', 'subtitle', false],
  ['privacyPolicyUrl', 'privacyPolicyUrl', true],
]);
const VERSION_FIELDS = Object.freeze([
  ['description', 'description', false],
  ['keywords', 'keywords', false],
  ['promotionalText', 'promotionalText', false],
  ['supportUrl', 'supportUrl', true],
  ['marketingUrl', 'marketingUrl', true],
  ['whatsNew', 'releaseNotes', false],
]);

function normalizeText(value, brand) {
  return String(value == null ? '' : value)
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\{\{brand\}\}/g, brand)
    .trim();
}

function normalizeUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    return `${url.origin}${pathname}${url.search}`;
  } catch {
    return text;
  }
}

function expectedField(value, brand, urlField) {
  if (value && typeof value === 'object') {
    if (value.status === 'live_external') return { kind: 'external' };
    if (value.host && value.path) return { kind: 'text', text: normalizeUrl(resolveStoreUrl(value)), url: true };
    return { kind: 'unknown' };
  }
  if (urlField && typeof value === 'string') return { kind: 'text', text: normalizeUrl(value), url: true };
  if (typeof value === 'string') return { kind: 'text', text: normalizeText(value, brand), url: Boolean(urlField) };
  return { kind: 'unknown' };
}

function observedText(value, urlField) {
  if (value == null) return '';
  const text = String(value);
  return urlField ? normalizeUrl(text) : normalizeText(text, '');
}

function classifyField(expected, observed, readable) {
  if (!readable) return 'UNKNOWN';
  if (!expected || expected.kind === 'unknown') return 'UNKNOWN';
  if (expected.kind === 'external') return 'EXTERNAL';
  if (!observed) return 'MISSING';
  return observed === expected.text ? 'MATCH' : 'DRIFT';
}

function rollup(statuses) {
  if (statuses.includes('UNKNOWN')) return 'UNKNOWN';
  if (statuses.includes('DRIFT')) return 'DRIFT';
  if (statuses.includes('MISSING')) return 'MISSING';
  if (statuses.length > 0 && statuses.every((status) => status === 'EXTERNAL')) return 'EXTERNAL';
  if (statuses.includes('EXTERNAL')) return 'MATCH';
  return 'MATCH';
}

function byLocale(detail) {
  const map = new Map();
  if (!detail || !Array.isArray(detail.localizations)) return map;
  for (const row of detail.localizations) map.set(row.locale, row);
  return map;
}

function versionReadable(audit, detail, selection) {
  if (!audit || audit.authResult !== 'authenticated') return false;
  if (audit.classification === 'auth_error' || audit.classification === 'permission_error') return false;
  if (audit.classification === 'app_not_accessible' || audit.classification === 'config_missing' || audit.classification === 'config_invalid') {
    return false;
  }
  return selection === 'one' && detail && detail.localizationListComplete === true;
}

function languageCatalog(catalog = loadStoreCatalog()) {
  const direct = new Map();
  const fallbacks = [];
  for (const appLocale of Object.keys(catalog.locales.appLocales).sort()) {
    const resolved = resolveStoreLocales(appLocale, catalog);
    const apple = resolved.apple;
    if (!apple || !apple.locale) continue;
    if (!apple.direct) {
      fallbacks.push({
        appLocale,
        appleLocale: apple.locale,
        mapping: 'fallback',
      });
      continue;
    }
    if (!direct.has(apple.locale)) {
      direct.set(apple.locale, {
        appleLocale: apple.locale,
        appLocales: [],
        mapping: 'direct',
        listing: effectiveListing('apple', apple.locale, null, catalog),
        screenshots: (catalog.screenshots.sets.apple || {})[apple.locale] || null,
      });
    }
    direct.get(apple.locale).appLocales.push(appLocale);
  }
  return {
    direct: [...direct.values()].sort((a, b) => a.appleLocale.localeCompare(b.appleLocale)),
    fallbacks: fallbacks.sort((a, b) => a.appLocale.localeCompare(b.appLocale)),
  };
}

function checksumMatches(appleChecksum, local) {
  const value = String(appleChecksum || '').trim().toLowerCase();
  if (/^[a-f0-9]{32}$/.test(value)) return value === local.md5;
  if (/^[a-f0-9]{64}$/.test(value)) return value === local.sha256;
  return false;
}

function defaultInspectLocal(relPath) {
  const abs = path.join(STORE_DIR, relPath);
  const buf = fs.readFileSync(abs);
  const size = pngSize(abs);
  return {
    file: relPath,
    width: size ? size.width : null,
    height: size ? size.height : null,
    md5: crypto.createHash('md5').update(buf).digest('hex'),
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
}

function judgeScreenshots(expected, observedLocalization, inspectLocal) {
  if (expected && expected.status === 'live_external') {
    return { status: 'EXTERNAL', reason: 'live_external' };
  }
  if (!expected || !Array.isArray(expected.files) || expected.files.length === 0) {
    return { status: 'UNKNOWN', reason: 'no-repo-set' };
  }
  let local;
  try {
    local = expected.files.map((file) => inspectLocal(file));
  } catch {
    return { status: 'UNKNOWN', reason: 'local-unreadable' };
  }
  if (local.some((item) => !item || !item.width || !item.height)) {
    return { status: 'UNKNOWN', reason: 'local-unreadable' };
  }
  const size = `${local[0].width}x${local[0].height}`;
  if (local.some((item) => `${item.width}x${item.height}` !== size)) {
    return { status: 'UNKNOWN', reason: 'mixed-local-dimensions', localSize: size };
  }
  const displayType = LOCAL_DISPLAY_TYPES[size] || null;
  if (!displayType) {
    return { status: 'UNKNOWN', reason: 'unmapped-local-dimensions', localSize: size, localCount: local.length };
  }
  if (!observedLocalization || !observedLocalization.screenshots || observedLocalization.screenshots.listComplete !== true) {
    return { status: 'UNKNOWN', reason: 'screenshot-list-incomplete', displayType, localCount: local.length };
  }
  const set = observedLocalization.screenshots.sets.find((item) => item.screenshotDisplayType === displayType);
  if (!set) return { status: 'MISSING', displayType, localCount: local.length, appleCount: 0 };
  if (set.listComplete !== true) {
    return { status: 'UNKNOWN', reason: 'screenshot-list-incomplete', displayType, localCount: local.length };
  }
  const shots = set.screenshots || [];
  const sameDimensions = shots.length === local.length && shots.every((shot, index) => (
    shot.width === local[index].width && shot.height === local[index].height
  ));
  if (shots.some((shot) => !shot.sourceFileChecksum)) {
    return {
      status: 'UNKNOWN',
      reason: 'checksum-absent',
      displayType,
      localCount: local.length,
      appleCount: shots.length,
      dimensionsMatch: sameDimensions,
    };
  }
  const identical = shots.length === local.length && shots.every((shot, index) => checksumMatches(shot.sourceFileChecksum, local[index]));
  if (identical) return { status: 'MATCH', displayType, localCount: local.length, appleCount: shots.length };
  return { status: 'DRIFT', displayType, localCount: local.length, appleCount: shots.length, dimensionsMatch: sameDimensions };
}

function compareFields(fields, listing, observedRow, readable, brand, scope) {
  const out = [];
  for (const [appleField, repoField, urlField] of fields) {
    const expected = expectedField(listing ? listing[repoField] : undefined, brand, urlField);
    const observed = observedRow ? observedText(observedRow[appleField], urlField || expected.url) : '';
    const status = classifyField(expected, observed, readable && Boolean(observedRow || expected.kind === 'external'));
    const fieldStatus = !readable
      ? 'UNKNOWN'
      : (!observedRow && expected.kind === 'text' ? 'MISSING' : status);
    out.push({
      field: appleField,
      scope,
      status: fieldStatus,
      expected: fieldStatus === 'DRIFT' || fieldStatus === 'MISSING' ? (expected.text || null) : null,
      observed: fieldStatus === 'DRIFT' ? observed : null,
    });
  }
  return out;
}

function nextAction(row) {
  if (row.mapping === 'fallback') return 'Ingen egen Apple-listning. Storefront använder fallback.';
  if (row.textStatus === 'UNKNOWN' || row.screenshotStatus === 'UNKNOWN') return 'Läsningen är ofullständig. Ingen publicering.';
  if (row.protected && (row.textStatus === 'DRIFT' || row.textStatus === 'MISSING')) {
    return 'Skyddad listning. Lämna text och externt material orört.';
  }
  if (row.textStatus === 'MATCH' && (row.screenshotStatus === 'MATCH' || row.screenshotStatus === 'EXTERNAL')) {
    return 'Ingen textändring.';
  }
  if (!row.editableVersion) return 'Ingen redigerbar iOS-version. Skapa ingen ändring mot live.';
  if (row.textStatus === 'MISSING') return 'Språket saknas på liveversionen. Lägg det på den redigerbara versionen först.';
  if (row.textStatus === 'DRIFT') return 'Texten avviker. Ändra bara den redigerbara versionen, inte live.';
  if (row.screenshotStatus === 'MISSING') return 'Bildset saknas för det lokala skärmformatet.';
  if (row.screenshotStatus === 'DRIFT') return 'Bildchecksummor avviker. Ersätt inte på grund av antal eller mått.';
  return 'Ingen åtgärd.';
}

function buildAppleStorePlan(audit, options = {}) {
  const catalog = options.catalog || loadStoreCatalog();
  const brand = options.brand || brandName();
  const inspectLocal = options.inspectLocal || defaultInspectLocal;
  const languages = languageCatalog(catalog);
  const liveReadable = versionReadable(audit, audit && audit.versions && audit.versions.live, audit && audit.versions && audit.versions.liveSelection);
  const infoReadable = versionReadable(audit, audit && audit.appInfos && audit.appInfos.live, audit && audit.appInfos && audit.appInfos.liveSelection);
  const liveLocs = byLocale(liveReadable ? audit.versions.live : null);
  const infoLocs = byLocale(infoReadable ? audit.appInfos.live : null);
  const editableVersion = audit && audit.versions && audit.versions.editableSelection === 'one'
    ? audit.versions.editable
    : null;
  const rows = [];
  const changes = [];
  const blocked = [];

  for (const language of languages.direct) {
    const info = infoLocs.get(language.appleLocale) || null;
    const version = liveLocs.get(language.appleLocale) || null;
    const fields = compareFields(APP_INFO_FIELDS, language.listing, info, infoReadable, brand, 'appInfo')
      .concat(compareFields(VERSION_FIELDS, language.listing, version, liveReadable, brand, 'version'));
    const externalShots = language.screenshots && language.screenshots.status === 'live_external';
    const shotTarget = version || { screenshots: { listComplete: true, sets: [] } };
    const screenshots = !liveReadable && !externalShots
      ? { status: 'UNKNOWN', reason: 'version-unreadable' }
      : judgeScreenshots(language.screenshots, externalShots ? null : shotTarget, inspectLocal);
    const textStatus = rollup(fields.map((field) => field.status));
    const protectedLocale = PROTECTED_LOCALES.includes(language.appleLocale);
    const row = {
      appleLocale: language.appleLocale,
      appLocales: language.appLocales,
      mapping: 'direct',
      protected: protectedLocale,
      onLiveVersion: Boolean(version),
      textStatus,
      screenshotStatus: screenshots.status,
      screenshotDetail: screenshots,
      fields,
      versionState: audit && audit.versions && audit.versions.live ? audit.versions.live.appStoreState : null,
      editableState: editableVersion ? editableVersion.appStoreState : null,
      editableVersion: Boolean(editableVersion),
      blockers: [],
    };
    if (protectedLocale) row.blockers.push('protected-listing');
    if (textStatus === 'UNKNOWN' || screenshots.status === 'UNKNOWN') row.blockers.push('unknown-read');
    if (!editableVersion && (textStatus === 'DRIFT' || textStatus === 'MISSING' || screenshots.status === 'MISSING' || screenshots.status === 'DRIFT')) {
      row.blockers.push('no-editable-version');
    }
    row.nextAction = nextAction(row);
    rows.push(row);
    for (const field of fields) {
      if (field.status !== 'DRIFT' && field.status !== 'MISSING') continue;
      const item = {
        id: `${language.appleLocale}:${field.field}`,
        locale: language.appleLocale,
        field: field.field,
        scope: field.scope,
        classification: field.status,
      };
      if (protectedLocale || field.status === 'EXTERNAL') {
        blocked.push({ ...item, reason: protectedLocale ? 'protected-listing' : 'external' });
      } else if (!editableVersion) {
        blocked.push({ ...item, reason: 'no-editable-version' });
      } else {
        changes.push({
          ...item,
          versionTarget: editableVersion.id,
          versionState: editableVersion.appStoreState,
          expectedSha256: crypto.createHash('sha256').update(field.expected || '').digest('hex'),
        });
      }
    }
    if (!protectedLocale && (screenshots.status === 'DRIFT' || screenshots.status === 'MISSING')) {
      const item = {
        id: `${language.appleLocale}:screenshots`,
        locale: language.appleLocale,
        field: 'screenshots',
        scope: 'screenshots',
        classification: screenshots.status,
        displayType: screenshots.displayType || null,
      };
      if (!editableVersion) blocked.push({ ...item, reason: 'no-editable-version' });
      else changes.push({ ...item, versionTarget: editableVersion.id, versionState: editableVersion.appStoreState });
    }
  }

  for (const fallback of languages.fallbacks) {
    rows.push({
      appleLocale: fallback.appleLocale,
      appLocales: [fallback.appLocale],
      mapping: 'fallback',
      protected: false,
      onLiveVersion: false,
      textStatus: 'EXTERNAL',
      screenshotStatus: 'EXTERNAL',
      screenshotDetail: { status: 'EXTERNAL', reason: 'fallback' },
      fields: [],
      versionState: null,
      editableState: editableVersion ? editableVersion.appStoreState : null,
      editableVersion: Boolean(editableVersion),
      blockers: [],
      nextAction: 'Ingen egen Apple-listning. Storefront använder fallback.',
    });
  }

  rows.sort((a, b) => `${a.mapping}:${a.appleLocale}:${a.appLocales.join(',')}`.localeCompare(`${b.mapping}:${b.appleLocale}:${b.appLocales.join(',')}`));
  changes.sort((a, b) => a.id.localeCompare(b.id));
  blocked.sort((a, b) => `${a.id}:${a.reason}`.localeCompare(`${b.id}:${b.reason}`));
  const plan = {
    schema: 1,
    readOnly: true,
    applyAllowed: false,
    blockReason: 'read-only-dry-run',
    auditClassification: audit && audit.classification ? audit.classification : 'unknown',
    liveVersion: audit && audit.versions && audit.versions.live
      ? { id: audit.versions.live.id, versionString: audit.versions.live.versionString, appStoreState: audit.versions.live.appStoreState }
      : null,
    editableVersion: editableVersion
      ? { id: editableVersion.id, versionString: editableVersion.versionString, appStoreState: editableVersion.appStoreState }
      : null,
    rows,
    changes,
    blocked,
    priority: rows
      .filter((row) => row.mapping === 'direct' && !row.protected)
      .filter((row) => row.textStatus === 'DRIFT' || row.textStatus === 'MISSING')
      .filter((row) => row.screenshotStatus === 'MATCH' || row.screenshotStatus === 'MISSING' || row.screenshotStatus === 'EXTERNAL')
      .map((row) => row.appleLocale),
  };
  plan.digest = digestOf(plan);
  return plan;
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
    schema: plan.schema,
    applyAllowed: false,
    blockReason: plan.blockReason,
    changes: plan.changes,
    blocked: plan.blocked,
  });
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

function renderPlanMarkdown(plan) {
  const lines = [
    '# Apple store dry-run',
    '',
    plan.auditClassification === 'ok'
      ? 'Read-only comparison of a complete audit. applyAllowed is false. No Apple write is described as done.'
      : `INCOMPLETE: audit classification is ${plan.auditClassification || 'unknown'}. This dry-run is not a fully approved live picture.`,
    '',
    'Read-only comparison. applyAllowed is false. No Apple write is described as done.',
    '',
    `- Plan SHA-256: ${plan.digest}`,
    `- Live version: ${plan.liveVersion ? `${plan.liveVersion.versionString} (${plan.liveVersion.appStoreState})` : 'none or unknown'}`,
    `- Editable version: ${plan.editableVersion ? `${plan.editableVersion.versionString} (${plan.editableVersion.appStoreState})` : 'none'}`,
    `- Proposed changes kept for a future approval: ${plan.changes.length}`,
    `- Blocked: ${plan.blocked.length}`,
    '',
    '| Språk | Mappning | Text | Bilder | Version | Blockerare | Nästa åtgärd |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of plan.rows) {
    const version = row.mapping === 'fallback'
      ? 'fallback'
      : `${row.versionState || 'unknown'}${row.editableState ? ` / editable ${row.editableState}` : ''}`;
    lines.push(`| ${row.mapping === 'fallback' ? row.appLocales[0] : row.appleLocale} | ${row.mapping} | ${row.textStatus} | ${row.screenshotStatus} | ${version} | ${row.blockers.join(', ') || '—'} | ${row.nextAction} |`);
  }
  lines.push('');
  const unmapped = plan.rows
    .filter((row) => row.screenshotDetail && row.screenshotDetail.reason === 'unmapped-local-dimensions')
    .map((row) => row.appleLocale);
  lines.push(`Prioriterade språk för en framtida redigerbar version: ${plan.priority.length ? plan.priority.join(', ') : 'inga'}.`);
  lines.push(`Lokala bilder utan Apple-skärmformat: ${unmapped.length ? unmapped.join(', ') : 'inga'}.`);
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  LOCAL_DISPLAY_TYPES,
  PROTECTED_LOCALES,
  buildAppleStorePlan,
  classifyField,
  judgeScreenshots,
  languageCatalog,
  renderPlanMarkdown,
};
