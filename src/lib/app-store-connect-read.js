'use strict';

/**
 * Read-only App Store Connect client for the Team API key check.
 * Signs an ES256 JWT and GETs /v1/apps. No other Apple calls.
 */

const jwt = require('jsonwebtoken');
const { IOS_BUNDLE_ID } = require('../../config/iap-product-contract');

const APPS_URL = 'https://api.appstoreconnect.apple.com/v1/apps';
const APPLE_ORIGIN = 'https://api.appstoreconnect.apple.com';
const APPS_PATH = '/v1/apps';
const AUDIENCE = 'appstoreconnect-v1';
const TOKEN_TTL_SEC = 15 * 60;
const MAX_TOKEN_TTL_SEC = 20 * 60;
const MAX_PAGES = 5;
const MAX_TEXT = 300;

const SECRET_NAMES = Object.freeze([
  'APP_STORE_CONNECT_API_PRIVATE_KEY',
  'APP_STORE_CONNECT_KEY_ID',
  'APP_STORE_CONNECT_ISSUER_ID',
]);

const ISSUER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_ID_RE = /^[A-Z0-9]{10}$/;
const NAME_NEEDLES = Object.freeze(['min stjarndag', 'my starday']);

function normalizePrivateKey(raw) {
  if (raw == null) return '';
  let key = String(raw).trim();
  if (
    (key.startsWith('"') && key.endsWith('"'))
    || (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n').trim();
}

function privateKeyFormat(key) {
  if (!key) return 'missing';
  if (/-----BEGIN PRIVATE KEY-----/.test(key) && /-----END PRIVATE KEY-----/.test(key)) {
    return 'pkcs8';
  }
  if (/-----BEGIN EC PRIVATE KEY-----/.test(key) && /-----END EC PRIVATE KEY-----/.test(key)) {
    return 'sec1';
  }
  return 'not_pem';
}

function readCredentials(env) {
  const source = env || {};
  return {
    privateKey: normalizePrivateKey(source.APP_STORE_CONNECT_API_PRIVATE_KEY),
    keyId: String(source.APP_STORE_CONNECT_KEY_ID || '').trim(),
    issuerId: String(source.APP_STORE_CONNECT_ISSUER_ID || '').trim(),
  };
}

function assessConfig(credentials) {
  const missingConfig = [];
  const invalidConfig = [];
  if (!credentials.privateKey) missingConfig.push(SECRET_NAMES[0]);
  if (!credentials.keyId) missingConfig.push(SECRET_NAMES[1]);
  if (!credentials.issuerId) missingConfig.push(SECRET_NAMES[2]);

  const format = privateKeyFormat(credentials.privateKey);
  if (credentials.privateKey && format === 'not_pem') {
    invalidConfig.push({ name: SECRET_NAMES[0], reason: 'expected_pem_private_key' });
  }
  if (credentials.keyId && !KEY_ID_RE.test(credentials.keyId)) {
    invalidConfig.push({ name: SECRET_NAMES[1], reason: 'expected_10_character_key_id' });
  }
  if (credentials.issuerId && !ISSUER_ID_RE.test(credentials.issuerId)) {
    invalidConfig.push({ name: SECRET_NAMES[2], reason: 'expected_uuid_issuer_id' });
  }

  return {
    missingConfig,
    invalidConfig,
    configured: {
      APP_STORE_CONNECT_API_PRIVATE_KEY: Boolean(credentials.privateKey),
      APP_STORE_CONNECT_KEY_ID: Boolean(credentials.keyId),
      APP_STORE_CONNECT_ISSUER_ID: Boolean(credentials.issuerId),
    },
    privateKeyFormat: format,
  };
}

function createAppStoreConnectToken({ privateKey, keyId, issuerId, nowSec }) {
  const key = normalizePrivateKey(privateKey);
  const iat = Number.isInteger(nowSec) ? nowSec : Math.floor(Date.now() / 1000);
  const exp = iat + TOKEN_TTL_SEC;
  if (exp - iat <= 0 || exp - iat > MAX_TOKEN_TTL_SEC) {
    throw Object.assign(new Error('APPLE_CONNECT_TOKEN_TTL'), { code: 'APPLE_CONNECT_TOKEN_TTL' });
  }
  return jwt.sign(
    { iss: issuerId, iat, exp, aud: AUDIENCE },
    key,
    {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: keyId, typ: 'JWT' },
    },
  );
}

function assertReadOnlyRequest(method, urlString) {
  if (String(method || '').toUpperCase() !== 'GET') {
    throw Object.assign(new Error('APPLE_CONNECT_METHOD_BLOCKED'), { code: 'APPLE_CONNECT_METHOD_BLOCKED' });
  }
  let url;
  try {
    url = new URL(urlString);
  } catch {
    throw Object.assign(new Error('APPLE_CONNECT_URL_BLOCKED'), { code: 'APPLE_CONNECT_URL_BLOCKED' });
  }
  if (url.origin !== APPLE_ORIGIN || url.pathname !== APPS_PATH || url.username || url.password) {
    throw Object.assign(new Error('APPLE_CONNECT_URL_BLOCKED'), { code: 'APPLE_CONNECT_URL_BLOCKED' });
  }
  return url;
}

function foldName(value) {
  return String(value || '')
    .toLocaleLowerCase('sv-SE')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function nameMatchesExpected(name) {
  const folded = foldName(name);
  return NAME_NEEDLES.some((needle) => folded.includes(needle));
}

function publicApp(item) {
  const attributes = item && item.attributes ? item.attributes : {};
  const name = typeof attributes.name === 'string' ? attributes.name : '';
  const bundleId = typeof attributes.bundleId === 'string' ? attributes.bundleId : '';
  const id = item && typeof item.id === 'string' ? item.id : '';
  return {
    id,
    name,
    bundleId,
    bundleMatch: bundleId === IOS_BUNDLE_ID,
    nameMatch: nameMatchesExpected(name),
  };
}

function classifyHttpStatus(status) {
  if (status === 401) {
    return { classification: 'auth_error', authResult: 'unauthenticated' };
  }
  if (status === 403) {
    return { classification: 'permission_error', authResult: 'forbidden' };
  }
  if (status >= 200 && status < 300) {
    return { classification: 'ok', authResult: 'authenticated' };
  }
  if (status >= 300 && status < 400) {
    return { classification: 'api_error', authResult: 'request_failed' };
  }
  if (Number.isInteger(status)) {
    return { classification: 'api_error', authResult: 'request_failed' };
  }
  return { classification: 'transport_error', authResult: 'transport_error' };
}

function redactText(value, secrets) {
  let text = String(value ?? '');
  const needles = secrets
    ? [secrets.privateKey, secrets.keyId, secrets.issuerId, secrets.token]
    : [];
  for (const needle of needles) {
    const secret = needle == null ? '' : String(needle);
    if (secret.length >= 8) text = text.split(secret).join('[REDACTED]');
  }
  text = text
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, '[REDACTED]');
  if (/-----BEGIN |PRIVATE KEY|eyJ[A-Za-z0-9_-]/.test(text)) return '[REDACTED]';
  for (const needle of needles) {
    const secret = needle == null ? '' : String(needle);
    if (secret.length >= 8 && text.includes(secret)) return '[REDACTED]';
  }
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

function scrubValue(value, secrets) {
  if (typeof value === 'string') return redactText(value, secrets);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, secrets));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = scrubValue(item, secrets);
    return out;
  }
  return value;
}

function appleErrorFromBody(text) {
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const first = body && Array.isArray(body.errors) ? body.errors[0] : null;
  if (!first || typeof first !== 'object') {
    return {
      code: null,
      title: null,
      detail: text ? String(text).slice(0, MAX_TEXT) : null,
    };
  }
  return {
    code: typeof first.code === 'string' ? first.code.slice(0, 80) : null,
    title: typeof first.title === 'string' ? first.title : null,
    detail: typeof first.detail === 'string' ? first.detail : null,
  };
}

function baseReport(config, extras) {
  return {
    readOnly: true,
    method: 'GET',
    endpoint: APPS_URL,
    httpStatus: null,
    authResult: 'not_attempted',
    classification: extras.classification,
    missingConfig: config.missingConfig,
    invalidConfig: config.invalidConfig,
    configured: config.configured,
    privateKeyFormat: config.privateKeyFormat,
    appleError: null,
    appAccess: {
      found: false,
      expectedBundleId: IOS_BUNDLE_ID,
      matched: [],
      listedAppCount: 0,
      pagesRead: 0,
      listComplete: false,
    },
    ...extras,
  };
}

async function listApps({ token, fetchImpl, maxPages }) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const apps = [];
  const seen = new Set();
  let url = APPS_URL;
  let pagesRead = 0;
  const pageCap = Number.isInteger(maxPages) ? maxPages : MAX_PAGES;

  for (let page = 0; page < pageCap; page += 1) {
    try {
      assertReadOnlyRequest('GET', url);
    } catch (error) {
      return {
        ok: true,
        status: 200,
        apps,
        pagesRead,
        listComplete: false,
        appleError: {
          code: error && error.code ? error.code : 'APPLE_CONNECT_URL_BLOCKED',
          title: 'Stopped before a non-read App Store Connect URL',
          detail: null,
        },
      };
    }
    if (seen.has(url)) {
      return { ok: true, status: 200, apps, pagesRead, listComplete: true };
    }
    seen.add(url);
    pagesRead += 1;
    const response = await fetchFn(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const status = response.status;
    const text = typeof response.text === 'function' ? await response.text() : '';
    if (status !== 200) {
      return {
        ok: false,
        status,
        apps,
        pagesRead,
        listComplete: false,
        appleError: appleErrorFromBody(text),
      };
    }
    let body;
    try {
      body = JSON.parse(text || '{}');
    } catch {
      return {
        ok: false,
        status,
        apps,
        pagesRead,
        listComplete: false,
        appleError: { code: 'INVALID_JSON', title: 'App Store Connect returned a non-JSON body', detail: null },
      };
    }
    const rows = Array.isArray(body.data) ? body.data : [];
    for (const row of rows) apps.push(publicApp(row));
    const next = body.links && typeof body.links.next === 'string' ? body.links.next : '';
    if (!next) {
      return { ok: true, status: 200, apps, pagesRead, listComplete: true, appleError: null };
    }
    url = next;
  }

  return {
    ok: true,
    status: 200,
    apps,
    pagesRead,
    listComplete: false,
    appleError: null,
  };
}

async function verifyAppStoreConnectAccess(options = {}) {
  const credentials = readCredentials(options.env || process.env);
  const config = assessConfig(credentials);
  const secrets = { ...credentials, token: '' };

  if (config.missingConfig.length > 0) {
    return scrubValue(baseReport(config, {
      classification: 'config_missing',
      authResult: 'not_attempted',
    }), secrets);
  }
  if (config.invalidConfig.length > 0) {
    return scrubValue(baseReport(config, {
      classification: 'config_invalid',
      authResult: 'not_attempted',
    }), secrets);
  }

  let token = '';
  try {
    token = createAppStoreConnectToken({
      privateKey: credentials.privateKey,
      keyId: credentials.keyId,
      issuerId: credentials.issuerId,
      nowSec: options.nowSec,
    });
    secrets.token = token;
  } catch (error) {
    return scrubValue(baseReport(config, {
      classification: 'config_invalid',
      authResult: 'not_attempted',
      appleError: {
        code: 'TOKEN_SIGN_FAILED',
        title: 'App Store Connect JWT could not be signed',
        detail: error && error.message ? error.message : 'sign failed',
      },
    }), secrets);
  }

  let listed = null;
  let transportError = null;
  try {
    listed = await listApps({
      token,
      fetchImpl: options.fetchImpl,
      maxPages: options.maxPages,
    });
  } catch (error) {
    transportError = error;
  }

  let report;
  if (transportError) {
    const code = transportError && transportError.code ? transportError.code : 'TRANSPORT';
    const classification = code === 'APPLE_CONNECT_METHOD_BLOCKED' || code === 'APPLE_CONNECT_URL_BLOCKED'
      ? 'api_error'
      : 'transport_error';
    report = baseReport(config, {
      classification,
      authResult: classification === 'transport_error' ? 'transport_error' : 'request_failed',
      appleError: {
        code,
        title: classification === 'transport_error' ? 'App Store Connect request failed' : 'Blocked non-read Apple request',
        detail: transportError && transportError.message ? transportError.message : 'request failed',
      },
    });
  } else {
    const matched = listed.apps.filter((app) => app.bundleMatch);
    const statusClass = classifyHttpStatus(listed.status);
    let classification = statusClass.classification;
    let authResult = statusClass.authResult;
    if (listed.ok && listed.status === 200) {
      authResult = 'authenticated';
      classification = matched.length > 0 ? 'ok' : 'app_not_accessible';
    }
    report = baseReport(config, {
      classification,
      authResult,
      httpStatus: listed.status,
      appleError: listed.ok && matched.length > 0 ? null : (listed.appleError || null),
      appAccess: {
        found: matched.length > 0,
        expectedBundleId: IOS_BUNDLE_ID,
        matched,
        listedAppCount: listed.apps.length,
        pagesRead: listed.pagesRead,
        listComplete: listed.listComplete,
      },
    });
  }

  const scrubbed = scrubValue(report, secrets);
  token = '';
  secrets.token = '';
  secrets.privateKey = '';
  secrets.keyId = '';
  secrets.issuerId = '';
  return scrubbed;
}

function renderReportMarkdown(report) {
  const missing = report.missingConfig.length > 0 ? report.missingConfig.join(', ') : 'none';
  const invalid = report.invalidConfig.length > 0
    ? report.invalidConfig.map((item) => `${item.name} (${item.reason})`).join(', ')
    : 'none';
  const matched = report.appAccess.matched.length > 0
    ? report.appAccess.matched.map((app) => `${app.name} [${app.bundleId}] id=${app.id}`).join('; ')
    : 'none';
  const appleError = report.appleError
    ? `${report.appleError.code || 'none'}: ${report.appleError.title || ''}`.trim()
    : 'none';
  return [
    '# App Store Connect verification',
    '',
    'Read-only GET https://api.appstoreconnect.apple.com/v1/apps.',
    '',
    `- HTTP status: ${report.httpStatus == null ? 'not called' : report.httpStatus}`,
    `- Authentication: ${report.authResult}`,
    `- Classification: ${report.classification}`,
    `- Missing configuration: ${missing}`,
    `- Invalid configuration: ${invalid}`,
    `- Private key format: ${report.privateKeyFormat}`,
    `- App access: ${report.appAccess.found ? 'found' : 'not found'}`,
    `- Expected bundle: ${report.appAccess.expectedBundleId}`,
    `- Matched apps: ${matched}`,
    `- Apps listed: ${report.appAccess.listedAppCount}`,
    `- Pages read: ${report.appAccess.pagesRead}`,
    `- List complete: ${report.appAccess.listComplete ? 'yes' : 'no'}`,
    `- Apple error: ${appleError}`,
    '',
    '401 is an authentication failure. 403 is a permission failure. Other HTTP statuses are API errors.',
    'Team API keys require APP_STORE_CONNECT_ISSUER_ID in addition to the key id and private key.',
    '',
  ].join('\n');
}

function exitCodeForReport(report) {
  if (report.classification === 'ok') return 0;
  if (report.classification === 'config_missing' || report.classification === 'config_invalid') return 2;
  return 1;
}

module.exports = {
  APPS_URL,
  AUDIENCE,
  TOKEN_TTL_SEC,
  assertReadOnlyRequest,
  createAppStoreConnectToken,
  exitCodeForReport,
  renderReportMarkdown,
  verifyAppStoreConnectAccess,
};
