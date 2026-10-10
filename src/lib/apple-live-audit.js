'use strict';

/**
 * Read the canonical iOS app from App Store Connect.
 * Live and editable versions stay separate. Raw Apple state strings are kept.
 */

const { IOS_BUNDLE_ID } = require('../../config/iap-product-contract');
const {
  APPS_URL,
  assertId,
  assessConfig,
  createAppStoreConnectToken,
  getCollection,
  readCredentials,
  scrubReport,
} = require('./app-store-connect-api');
const { nameMatchesExpected } = require('./app-store-connect-read');

const EXPECTED_APP_ID = '6774493098';
const LIVE_VERSION_STATES = Object.freeze(['READY_FOR_SALE', 'READY_FOR_DISTRIBUTION']);
const EDITABLE_VERSION_STATES = Object.freeze([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
]);
const LIVE_INFO_STATES = Object.freeze(['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE', 'APPROVED']);
const EDITABLE_INFO_STATES = Object.freeze([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
]);

function stateOf(resource) {
  const attributes = resource && resource.attributes ? resource.attributes : {};
  return String(attributes.appStoreState || attributes.state || '');
}

function pickSingular(resources) {
  if (!resources || resources.length === 0) return { selection: 'none', resource: null };
  if (resources.length > 1) return { selection: 'ambiguous', resource: null, candidates: resources.map(summaryVersion) };
  return { selection: 'one', resource: resources[0] };
}

function summaryVersion(resource) {
  const attributes = resource && resource.attributes ? resource.attributes : {};
  return {
    id: resource && resource.id ? String(resource.id) : '',
    platform: attributes.platform || '',
    versionString: attributes.versionString || '',
    appStoreState: stateOf(resource),
    createdDate: attributes.createdDate || '',
  };
}

function summaryInfo(resource) {
  return {
    id: resource && resource.id ? String(resource.id) : '',
    state: stateOf(resource),
  };
}

function selectByState(resources, states) {
  const wanted = new Set(states);
  return (resources || []).filter((resource) => wanted.has(stateOf(resource)));
}

function selectVersions(resources) {
  const ios = (resources || []).filter((resource) => {
    const platform = resource && resource.attributes ? resource.attributes.platform : 'IOS';
    return !platform || platform === 'IOS';
  });
  const live = pickSingular(selectByState(ios, LIVE_VERSION_STATES));
  const editable = pickSingular(selectByState(ios, EDITABLE_VERSION_STATES));
  return {
    observed: ios.map(summaryVersion),
    live,
    editable,
  };
}

function selectAppInfos(resources) {
  const live = pickSingular(selectByState(resources, LIVE_INFO_STATES));
  const editable = pickSingular(selectByState(resources, EDITABLE_INFO_STATES));
  return {
    observed: (resources || []).map(summaryInfo),
    live,
    editable,
  };
}

function textAttr(attributes, key) {
  const value = attributes ? attributes[key] : null;
  return typeof value === 'string' ? value : null;
}

function publicInfoLocalization(resource) {
  const attributes = resource && resource.attributes ? resource.attributes : {};
  return {
    id: resource && resource.id ? String(resource.id) : '',
    locale: textAttr(attributes, 'locale') || '',
    name: textAttr(attributes, 'name'),
    subtitle: textAttr(attributes, 'subtitle'),
    privacyPolicyUrl: textAttr(attributes, 'privacyPolicyUrl'),
  };
}

function publicVersionLocalization(resource) {
  const attributes = resource && resource.attributes ? resource.attributes : {};
  return {
    id: resource && resource.id ? String(resource.id) : '',
    locale: textAttr(attributes, 'locale') || '',
    description: textAttr(attributes, 'description'),
    keywords: textAttr(attributes, 'keywords'),
    promotionalText: textAttr(attributes, 'promotionalText'),
    supportUrl: textAttr(attributes, 'supportUrl'),
    marketingUrl: textAttr(attributes, 'marketingUrl'),
    whatsNew: textAttr(attributes, 'whatsNew'),
  };
}

function publicScreenshot(resource, order) {
  const attributes = resource && resource.attributes ? resource.attributes : {};
  const image = attributes.imageAsset && typeof attributes.imageAsset === 'object' ? attributes.imageAsset : {};
  const delivery = attributes.assetDeliveryState && typeof attributes.assetDeliveryState === 'object'
    ? attributes.assetDeliveryState
    : {};
  return {
    id: resource && resource.id ? String(resource.id) : '',
    order,
    fileName: textAttr(attributes, 'fileName'),
    fileSize: Number.isInteger(attributes.fileSize) ? attributes.fileSize : null,
    sourceFileChecksum: textAttr(attributes, 'sourceFileChecksum'),
    width: Number.isInteger(image.width) ? image.width : null,
    height: Number.isInteger(image.height) ? image.height : null,
    assetState: typeof delivery.state === 'string' ? delivery.state : null,
  };
}

function emptyAudit(config, extras) {
  return {
    schema: 1,
    readOnly: true,
    method: 'GET',
    httpStatus: null,
    authResult: 'not_attempted',
    classification: extras.classification,
    missingConfig: config.missingConfig,
    invalidConfig: config.invalidConfig,
    configured: config.configured,
    privateKeyFormat: config.privateKeyFormat,
    app: null,
    listedAppCount: 0,
    appsListComplete: false,
    appInfos: { live: null, editable: null, observed: [], liveSelection: 'unreadable', editableSelection: 'unreadable' },
    versions: { live: null, editable: null, observed: [], liveSelection: 'unreadable', editableSelection: 'unreadable' },
    appleLocales: [],
    partialFailures: [],
    pagesRead: 0,
    ...extras,
  };
}

function failure(resource, result) {
  return {
    resource,
    status: result.status == null ? null : result.status,
    classification: result.classification || 'api_error',
    code: result.appleError ? result.appleError.code : null,
  };
}

function incompleteList(resource, result) {
  return {
    resource,
    status: result && result.status != null ? result.status : 200,
    classification: 'api_error',
    code: result && result.appleError && result.appleError.code ? result.appleError.code : 'INCOMPLETE_LIST',
  };
}

async function readLocalizations(url, mapRow, options, partialFailures, resource) {
  const page = await getCollection(url, options);
  options.pagesRead += page.pagesRead || 0;
  if (!page.ok) {
    partialFailures.push(failure(resource, page));
    return { rows: [], listComplete: false, blocked: page };
  }
  if (page.listComplete !== true) partialFailures.push(incompleteList(resource, page));
  return {
    rows: page.data.map(mapRow),
    listComplete: page.listComplete === true,
    blocked: null,
  };
}

function safeResourceId(id, partialFailures, resource) {
  try {
    return assertId(id);
  } catch (error) {
    partialFailures.push({
      resource,
      status: null,
      classification: 'api_error',
      code: error && error.code ? error.code : 'APPLE_CONNECT_URL_BLOCKED',
    });
    return null;
  }
}

async function readScreenshotSets(localization, options, partialFailures) {
  const localizationId = safeResourceId(localization.id, partialFailures, `screenshot-sets:${localization.locale}`);
  if (!localizationId) return { listComplete: false, sets: [] };
  const setsPage = await getCollection(
    `${APPLE_ORIGIN()}/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?limit=200`,
    options,
  );
  options.pagesRead += setsPage.pagesRead || 0;
  if (!setsPage.ok) {
    partialFailures.push(failure(`screenshot-sets:${localization.locale}`, setsPage));
    return { listComplete: false, sets: [] };
  }
  const sets = [];
  let complete = setsPage.listComplete === true;
  if (!complete) partialFailures.push(incompleteList(`screenshot-sets:${localization.locale}`, setsPage));
  for (const set of setsPage.data) {
    const displayType = set.attributes && typeof set.attributes.screenshotDisplayType === 'string'
      ? set.attributes.screenshotDisplayType
      : '';
    const setId = safeResourceId(set.id, partialFailures, `screenshots:${localization.locale}:${displayType}`);
    if (!setId) {
      complete = false;
      sets.push({ id: String(set.id || ''), screenshotDisplayType: displayType, listComplete: false, screenshots: [] });
      continue;
    }
    const shots = await getCollection(
      `${APPLE_ORIGIN()}/v1/appScreenshotSets/${setId}/appScreenshots?limit=200`,
      options,
    );
    options.pagesRead += shots.pagesRead || 0;
    if (!shots.ok) {
      complete = false;
      partialFailures.push(failure(`screenshots:${localization.locale}:${displayType}`, shots));
      sets.push({
        id: String(set.id),
        screenshotDisplayType: displayType,
        listComplete: false,
        screenshots: [],
      });
      if (shots.status === 401) return { listComplete: false, sets, authBlocked: shots };
      continue;
    }
    sets.push({
      id: String(set.id),
      screenshotDisplayType: displayType,
      listComplete: shots.listComplete === true,
      screenshots: shots.data.map((shot, index) => publicScreenshot(shot, index)),
    });
    if (shots.listComplete !== true) {
      complete = false;
      partialFailures.push(incompleteList(`screenshots:${localization.locale}:${displayType}`, shots));
    }
  }
  return { listComplete: complete, sets };
}

function APPLE_ORIGIN() {
  return 'https://api.appstoreconnect.apple.com';
}

async function readVersionDetail(resource, options, partialFailures) {
  const summary = summaryVersion(resource);
  const versionId = safeResourceId(summary.id, partialFailures, `version:${summary.id}`);
  if (!versionId) return { detail: null, authBlocked: null };
  const localizations = await readLocalizations(
    `${APPLE_ORIGIN()}/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=200`,
    publicVersionLocalization,
    options,
    partialFailures,
    `version-localizations:${summary.id}`,
  );
  if (localizations.blocked && localizations.blocked.status === 401) {
    return { detail: null, authBlocked: localizations.blocked };
  }
  const rows = [];
  for (const row of localizations.rows) {
    const screenshots = await readScreenshotSets(row, options, partialFailures);
    if (screenshots.authBlocked) return { detail: null, authBlocked: screenshots.authBlocked };
    rows.push({ ...row, screenshots: { listComplete: screenshots.listComplete, sets: screenshots.sets } });
  }
  return {
    detail: {
      ...summary,
      localizationListComplete: localizations.listComplete,
      localizations: rows,
    },
    authBlocked: null,
  };
}

async function readInfoDetail(resource, options, partialFailures) {
  const summary = summaryInfo(resource);
  const infoId = safeResourceId(summary.id, partialFailures, `app-info:${summary.id}`);
  if (!infoId) return { detail: null, authBlocked: null };
  const localizations = await readLocalizations(
    `${APPLE_ORIGIN()}/v1/appInfos/${infoId}/appInfoLocalizations?limit=200`,
    publicInfoLocalization,
    options,
    partialFailures,
    `app-info-localizations:${summary.id}`,
  );
  if (localizations.blocked && localizations.blocked.status === 401) {
    return { detail: null, authBlocked: localizations.blocked };
  }
  return {
    detail: {
      ...summary,
      localizationListComplete: localizations.listComplete,
      localizations: localizations.rows,
    },
    authBlocked: null,
  };
}

function localesOn(detail) {
  if (!detail || !Array.isArray(detail.localizations)) return [];
  return detail.localizations.map((row) => row.locale).filter(Boolean).sort();
}

async function collectAppleLiveAudit(options = {}) {
  const credentials = readCredentials(options.env || process.env);
  const config = assessConfig(credentials);
  const secrets = { ...credentials, token: '' };
  if (config.missingConfig.length > 0) {
    return scrubReport(emptyAudit(config, { classification: 'config_missing' }), secrets);
  }
  if (config.invalidConfig.length > 0) {
    return scrubReport(emptyAudit(config, { classification: 'config_invalid' }), secrets);
  }

  let token = '';
  try {
    token = createAppStoreConnectToken({
      privateKey: credentials.privateKey,
      keyId: credentials.keyId,
      issuerId: credentials.issuerId,
      nowSec: options.nowSec,
    });
  } catch (error) {
    return scrubReport(emptyAudit(config, {
      classification: 'config_invalid',
      partialFailures: [{
        resource: 'token',
        status: null,
        classification: 'config_invalid',
        code: 'TOKEN_SIGN_FAILED',
        detail: error && error.message ? error.message : 'sign failed',
      }],
    }), secrets);
  }
  secrets.token = token;
  const call = {
    token,
    fetchImpl: options.fetchImpl,
    sleepImpl: options.sleepImpl,
    maxRetries: options.maxRetries,
    maxPages: options.maxPages,
    pagesRead: 0,
  };
  const partialFailures = [];

  const apps = await getCollection(`${APPS_URL}?limit=200`, call);
  call.pagesRead += apps.pagesRead || 0;
  if (!apps.ok) {
    const statusClass = apps.classification === 'auth_error' || apps.classification === 'permission_error'
      ? apps
      : { classification: 'api_error', authResult: apps.authResult || 'request_failed' };
    return scrubReport(emptyAudit(config, {
      classification: statusClass.classification,
      authResult: statusClass.authResult,
      httpStatus: apps.status,
      pagesRead: call.pagesRead,
      partialFailures: [failure('apps', apps)],
    }), secrets);
  }

  const matched = apps.data.filter((item) => {
    const bundleId = item.attributes && item.attributes.bundleId;
    return bundleId === IOS_BUNDLE_ID;
  });
  const appResource = matched[0] || null;
  const attributes = appResource && appResource.attributes ? appResource.attributes : {};
  const app = appResource ? {
    id: String(appResource.id),
    bundleId: attributes.bundleId || '',
    name: attributes.name || '',
    primaryLocale: attributes.primaryLocale || '',
    bundleMatch: attributes.bundleId === IOS_BUNDLE_ID,
    idMatch: String(appResource.id) === EXPECTED_APP_ID,
    nameMatch: nameMatchesExpected(attributes.name || ''),
  } : null;

  const appsComplete = apps.listComplete === true;
  if (!appsComplete) partialFailures.push(incompleteList('apps', apps));
  if (!app || !app.bundleMatch || !app.idMatch) {
    return scrubReport(emptyAudit(config, {
      classification: appsComplete ? 'app_not_accessible' : 'partial',
      authResult: 'authenticated',
      httpStatus: 200,
      app,
      listedAppCount: apps.data.length,
      appsListComplete: appsComplete,
      pagesRead: call.pagesRead,
      partialFailures,
    }), secrets);
  }

  const appId = safeResourceId(app.id, partialFailures, 'app');
  if (!appId) {
    return scrubReport(emptyAudit(config, {
      classification: 'api_error',
      authResult: 'authenticated',
      httpStatus: 200,
      app,
      pagesRead: call.pagesRead,
      partialFailures,
    }), secrets);
  }
  const infos = await getCollection(`${APPLE_ORIGIN()}/v1/apps/${appId}/appInfos?limit=200`, call);
  call.pagesRead += infos.pagesRead || 0;
  if (infos.status === 401) {
    return scrubReport(emptyAudit(config, {
      classification: 'auth_error',
      authResult: 'unauthenticated',
      httpStatus: 401,
      app,
      pagesRead: call.pagesRead,
      partialFailures: [failure('app-infos', infos)],
    }), secrets);
  }
  const infosComplete = infos.ok && infos.listComplete === true;
  const infoSelection = infosComplete ? selectAppInfos(infos.data) : null;
  const appInfos = {
    observed: infos.ok ? infos.data.map(summaryInfo) : [],
    liveSelection: infosComplete ? infoSelection.live.selection : 'unreadable',
    editableSelection: infosComplete ? infoSelection.editable.selection : 'unreadable',
    live: null,
    editable: null,
  };
  if (!infos.ok) partialFailures.push(failure('app-infos', infos));
  else if (!infosComplete) partialFailures.push(incompleteList('app-infos', infos));

  const versionsPage = await getCollection(
    `${APPLE_ORIGIN()}/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=200`,
    call,
  );
  call.pagesRead += versionsPage.pagesRead || 0;
  if (versionsPage.status === 401) {
    return scrubReport(emptyAudit(config, {
      classification: 'auth_error',
      authResult: 'unauthenticated',
      httpStatus: 401,
      app,
      appInfos,
      pagesRead: call.pagesRead,
      partialFailures: partialFailures.concat(failure('app-store-versions', versionsPage)),
    }), secrets);
  }
  const versionSelection = versionsPage.ok && versionsPage.listComplete
    ? selectVersions(versionsPage.data)
    : null;
  const versions = {
    observed: versionsPage.ok ? versionsPage.data.map(summaryVersion) : [],
    liveSelection: versionSelection ? versionSelection.live.selection : 'unreadable',
    editableSelection: versionSelection ? versionSelection.editable.selection : 'unreadable',
    live: null,
    editable: null,
  };
  if (!versionsPage.ok) partialFailures.push(failure('app-store-versions', versionsPage));
  if (versionsPage.ok && versionsPage.listComplete !== true) {
    partialFailures.push(incompleteList('app-store-versions', versionsPage));
  }

  if (infoSelection && infoSelection.live.resource) {
    const detail = await readInfoDetail(infoSelection.live.resource, call, partialFailures);
    if (detail.authBlocked) {
      return scrubReport(emptyAudit(config, {
        classification: 'auth_error',
        authResult: 'unauthenticated',
        httpStatus: 401,
        app,
        pagesRead: call.pagesRead,
        partialFailures,
      }), secrets);
    }
    appInfos.live = detail.detail;
  }
  if (infoSelection && infoSelection.editable.resource) {
    const detail = await readInfoDetail(infoSelection.editable.resource, call, partialFailures);
    if (detail.authBlocked) {
      return scrubReport(emptyAudit(config, {
        classification: 'auth_error',
        authResult: 'unauthenticated',
        httpStatus: 401,
        app,
        pagesRead: call.pagesRead,
        partialFailures,
      }), secrets);
    }
    appInfos.editable = detail.detail;
  }
  if (versionSelection && versionSelection.live.resource) {
    const detail = await readVersionDetail(versionSelection.live.resource, call, partialFailures);
    if (detail.authBlocked) {
      return scrubReport(emptyAudit(config, {
        classification: 'auth_error',
        authResult: 'unauthenticated',
        httpStatus: 401,
        app,
        pagesRead: call.pagesRead,
        partialFailures,
      }), secrets);
    }
    versions.live = detail.detail;
  }
  if (versionSelection && versionSelection.editable.resource) {
    const detail = await readVersionDetail(versionSelection.editable.resource, call, partialFailures);
    if (detail.authBlocked) {
      return scrubReport(emptyAudit(config, {
        classification: 'auth_error',
        authResult: 'unauthenticated',
        httpStatus: 401,
        app,
        pagesRead: call.pagesRead,
        partialFailures,
      }), secrets);
    }
    versions.editable = detail.detail;
  }

  const appleLocales = [...new Set(localesOn(versions.live).concat(localesOn(appInfos.live)))].sort();
  const classification = partialFailures.length > 0 ? 'partial' : 'ok';
  const report = emptyAudit(config, {
    classification,
    authResult: 'authenticated',
    httpStatus: 200,
    app,
    listedAppCount: apps.data.length,
    appsListComplete: apps.listComplete === true,
    appInfos,
    versions,
    appleLocales,
    partialFailures,
    pagesRead: call.pagesRead,
  });
  secrets.token = token;
  const scrubbed = scrubReport(report, secrets);
  token = '';
  secrets.token = '';
  return scrubbed;
}

function renderAuditMarkdown(report) {
  const live = report.versions && report.versions.live;
  const editable = report.versions && report.versions.editable;
  const complete = report.classification === 'ok';
  const lines = [
    '# Apple Live Audit',
    '',
    complete
      ? 'Complete read-only GET against api.appstoreconnect.apple.com. No store changes.'
      : 'INCOMPLETE: this is not a fully approved live audit. Missing or unreadable Apple data is not a complete store picture.',
    '',
    'Read-only GET against api.appstoreconnect.apple.com. No store changes.',
    '',
    `- HTTP status: ${report.httpStatus == null ? 'not called' : report.httpStatus}`,
    `- Authentication: ${report.authResult}`,
    `- Classification: ${report.classification}`,
    `- Missing configuration: ${report.missingConfig.length ? report.missingConfig.join(', ') : 'none'}`,
    `- App id match: ${report.app ? String(report.app.idMatch) : 'no app'}`,
    `- Bundle match: ${report.app ? String(report.app.bundleMatch) : 'no app'}`,
    `- Live version selection: ${report.versions.liveSelection}`,
    `- Live version: ${live ? `${live.versionString} ${live.appStoreState}` : 'none'}`,
    `- Editable version selection: ${report.versions.editableSelection}`,
    `- Editable version: ${editable ? `${editable.versionString} ${editable.appStoreState}` : 'none'}`,
    `- Locales on the live version or live app info: ${report.appleLocales.length ? report.appleLocales.join(', ') : 'none'}`,
    `- Partial failures: ${report.partialFailures.length}`,
    '',
  ];
  if (report.versions.observed.length) {
    lines.push('## Observed iOS versions');
    lines.push('');
    for (const version of report.versions.observed) {
      lines.push(`- ${version.versionString || version.id}: ${version.appStoreState}`);
    }
    lines.push('');
  }
  lines.push('401 is an authentication failure. 403 is a permission failure. Other HTTP statuses are API errors.');
  lines.push('A locale missing from an incomplete or forbidden response is not treated as absent.');
  lines.push('');
  return lines.join('\n');
}

function exitCodeForAudit(report) {
  if (report && report.classification === 'ok') return 0;
  if (report && (report.classification === 'config_missing' || report.classification === 'config_invalid')) return 2;
  return 1;
}

module.exports = {
  EDITABLE_INFO_STATES,
  EDITABLE_VERSION_STATES,
  EXPECTED_APP_ID,
  LIVE_INFO_STATES,
  LIVE_VERSION_STATES,
  collectAppleLiveAudit,
  exitCodeForAudit,
  publicInfoLocalization,
  publicScreenshot,
  publicVersionLocalization,
  renderAuditMarkdown,
  selectAppInfos,
  selectVersions,
};
