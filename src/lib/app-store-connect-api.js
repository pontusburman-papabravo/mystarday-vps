'use strict';

/**
 * Strict read-only App Store Connect client for listing audit.
 * GET requests on an allowlisted set of paths. No writes, no IAP, no pricing.
 */

const {
  APPS_URL,
  assessConfig,
  createAppStoreConnectToken,
  readCredentials,
  redactText,
} = require('./app-store-connect-read');

const APPLE_ORIGIN = 'https://api.appstoreconnect.apple.com';
const MAX_PAGES = 10;
const MAX_RETRIES = 4;
const MAX_RETRY_DELAY_MS = 20000;
const ID_RE = /^[A-Za-z0-9]+$/;

const ALLOWED_PATH = /^\/v1\/(?:apps(?:\/[A-Za-z0-9]+(?:\/(?:appInfos|appStoreVersions))?)?|appInfos\/[A-Za-z0-9]+(?:\/appInfoLocalizations)?|appStoreVersions\/[A-Za-z0-9]+(?:\/appStoreVersionLocalizations)?|appStoreVersionLocalizations\/[A-Za-z0-9]+(?:\/appScreenshotSets)?|appScreenshotSets\/[A-Za-z0-9]+(?:\/appScreenshots)?)$/;

function assertAppleRequest(method, urlString) {
  if (String(method || '').toUpperCase() !== 'GET') {
    throw Object.assign(new Error('APPLE_CONNECT_METHOD_BLOCKED'), { code: 'APPLE_CONNECT_METHOD_BLOCKED' });
  }
  return assertAppleGet(urlString);
}

function assertAppleGet(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    throw Object.assign(new Error('APPLE_CONNECT_URL_BLOCKED'), { code: 'APPLE_CONNECT_URL_BLOCKED' });
  }
  if (url.origin !== APPLE_ORIGIN || url.username || url.password || !ALLOWED_PATH.test(url.pathname)) {
    throw Object.assign(new Error('APPLE_CONNECT_URL_BLOCKED'), { code: 'APPLE_CONNECT_URL_BLOCKED' });
  }
  return url;
}

function assertId(id) {
  if (!ID_RE.test(String(id || ''))) {
    throw Object.assign(new Error('APPLE_CONNECT_URL_BLOCKED'), { code: 'APPLE_CONNECT_URL_BLOCKED' });
  }
  return String(id);
}

function classifyHttpStatus(status) {
  if (status === 401) return { classification: 'auth_error', authResult: 'unauthenticated' };
  if (status === 403) return { classification: 'permission_error', authResult: 'forbidden' };
  if (status === 429) return { classification: 'api_error', authResult: 'request_failed' };
  if (status >= 200 && status < 300) return { classification: 'ok', authResult: 'authenticated' };
  if (Number.isInteger(status)) return { classification: 'api_error', authResult: 'request_failed' };
  return { classification: 'transport_error', authResult: 'transport_error' };
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
    return { code: null, title: null, detail: text ? String(text).slice(0, 300) : null };
  }
  return {
    code: typeof first.code === 'string' ? first.code.slice(0, 80) : null,
    title: typeof first.title === 'string' ? first.title : null,
    detail: typeof first.detail === 'string' ? first.detail : null,
  };
}

function retryDelayMs(response, attempt) {
  const header = response.headers && typeof response.headers.get === 'function'
    ? response.headers.get('retry-after')
    : null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  return Math.min(1000 * (2 ** attempt), MAX_RETRY_DELAY_MS);
}

async function getJson(url, options) {
  assertAppleRequest('GET', url);
  const fetchFn = options.fetchImpl || globalThis.fetch;
  const sleep = options.sleepImpl || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const retries = Number.isInteger(options.maxRetries) ? options.maxRetries : MAX_RETRIES;
  let attempt = 0;
  let response;
  let text = '';
  for (;;) {
    response = await fetchFn(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: 'application/json',
      },
    });
    text = typeof response.text === 'function' ? await response.text() : '';
    if (response.status !== 429 || attempt >= retries) break;
    await sleep(retryDelayMs(response, attempt));
    attempt += 1;
  }
  const status = response.status;
  if (status !== 200) {
    return {
      ok: false,
      status,
      ...classifyHttpStatus(status),
      body: null,
      appleError: appleErrorFromBody(text),
      retries: attempt,
    };
  }
  let body;
  try {
    body = JSON.parse(text || '{}');
  } catch {
    return {
      ok: false,
      status,
      classification: 'api_error',
      authResult: 'authenticated',
      body: null,
      appleError: { code: 'INVALID_JSON', title: 'App Store Connect returned a non-JSON body', detail: null },
      retries: attempt,
    };
  }
  return {
    ok: true,
    status,
    classification: 'ok',
    authResult: 'authenticated',
    body,
    appleError: null,
    retries: attempt,
  };
}

function collectionShape(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.data)) return null;
  const links = body.links;
  if (links == null) return { rows: body.data, next: '' };
  if (typeof links !== 'object' || Array.isArray(links)) return null;
  if (!Object.prototype.hasOwnProperty.call(links, 'next') || links.next == null || links.next === '') {
    return { rows: body.data, next: '' };
  }
  if (typeof links.next !== 'string') return null;
  return { rows: body.data, next: links.next };
}

function incompleteCollection(rows, pagesRead, code, title) {
  return {
    ok: code === 'APPLE_CONNECT_PAGINATION_CYCLE',
    status: code === 'APPLE_CONNECT_URL_BLOCKED' ? null : 200,
    classification: 'api_error',
    authResult: code === 'APPLE_CONNECT_URL_BLOCKED' ? 'request_failed' : 'authenticated',
    data: rows,
    pagesRead,
    listComplete: false,
    appleError: { code, title, detail: null },
  };
}

async function getCollection(url, options) {
  const rows = [];
  const seen = new Set();
  const pageCap = Number.isInteger(options.maxPages) ? options.maxPages : MAX_PAGES;
  let pagesRead = 0;
  let current = url;
  while (current) {
    let parsed;
    try {
      parsed = assertAppleGet(current);
    } catch (error) {
      return incompleteCollection(
        rows,
        pagesRead,
        error.code || 'APPLE_CONNECT_URL_BLOCKED',
        'Stopped before a non-read URL',
      );
    }
    const key = parsed.origin + parsed.pathname + parsed.search;
    if (seen.has(key)) {
      return incompleteCollection(
        rows,
        pagesRead,
        'APPLE_CONNECT_PAGINATION_CYCLE',
        'Stopped on a repeated pagination URL',
      );
    }
    seen.add(key);
    if (pagesRead >= pageCap) {
      return incompleteCollection(rows, pagesRead, 'INCOMPLETE_LIST', 'Stopped at the page cap');
    }
    const page = await getJson(current, options);
    pagesRead += 1;
    if (!page.ok) {
      return {
        ...page,
        data: rows,
        pagesRead,
        listComplete: false,
      };
    }
    const shape = collectionShape(page.body);
    if (!shape) {
      return incompleteCollection(
        rows,
        pagesRead,
        'INVALID_COLLECTION',
        'App Store Connect returned a collection without a data array',
      );
    }
    rows.push(...shape.rows);
    if (!shape.next) {
      return {
        ok: true,
        status: 200,
        classification: 'ok',
        authResult: 'authenticated',
        data: rows,
        pagesRead,
        listComplete: true,
        appleError: null,
      };
    }
    current = shape.next;
  }
  return incompleteCollection(rows, pagesRead, 'INCOMPLETE_LIST', 'Pagination ended without a complete collection');
}

function scrubReport(report, secrets) {
  return scrubValue(report, secrets);
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

module.exports = {
  ALLOWED_PATH,
  APPLE_ORIGIN,
  APPS_URL,
  MAX_PAGES,
  MAX_RETRIES,
  assertAppleGet,
  assertAppleRequest,
  assertId,
  assessConfig,
  classifyHttpStatus,
  createAppStoreConnectToken,
  getCollection,
  getJson,
  readCredentials,
  scrubReport,
};
