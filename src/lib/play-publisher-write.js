'use strict';

/**
 * Narrow Google Play write client.
 * Dry-run never constructs this client. Mutations stay closed until an
 * approved plan, the confirmation phrase, the protected branch, and an
 * environment approval have all been checked. Country, price, track, and
 * binary endpoints are not represented.
 */

const { IMAGE_TYPES, PUBLISHER_ORIGIN, RELEASE_TRACK } = require('./play-publisher-read');

const REVIEW_BEHAVIOR = 'ERROR_IF_IN_REVIEW';
const TITLE_MAX = 30;
const SHORT_MAX = 80;
const FULL_MAX = 4000;
const LISTING_KEYS = Object.freeze(['language', 'title', 'shortDescription', 'fullDescription', 'video']);

function blocked(method, path) {
  const error = new Error('PLAY_REQUEST_BLOCKED');
  error.method = method;
  error.path = path;
  return error;
}

function assertEditId(editId) {
  if (typeof editId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(editId)) {
    throw blocked('EDIT', 'edit');
  }
  return editId;
}

function assertLanguage(language) {
  if (typeof language !== 'string' || !/^[a-z]{2}(-[A-Z]{2}|-[0-9]{3})?$/.test(language)) {
    throw blocked('EDIT', 'language');
  }
  return language;
}

function applicationBase(packageName) {
  return `${PUBLISHER_ORIGIN}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;
}

function uploadBase(packageName) {
  return `${PUBLISHER_ORIGIN}/upload/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;
}

function searchKeys(parsed) {
  return [...parsed.searchParams.keys()];
}

function classifyPlayWrite(method, url, gates = {}) {
  const parsed = new URL(url);
  if (parsed.searchParams.has('access_token') || parsed.searchParams.has('key')) return null;
  const path = parsed.pathname;
  const allowMutation = gates.allowMutation === true;
  const allowCommit = gates.allowCommit === true;
  if (/\/(inappproducts|monetization|subscriptions|tracks|apks|bundles|deobfuscationFiles|expansionFiles|testers|internalAppSharing)\b/i.test(path)) {
    return null;
  }
  if (path.includes('countryAvailability') && method !== 'GET') return null;
  if (method === 'POST' && parsed.origin === PUBLISHER_ORIGIN && /\/androidpublisher\/v3\/applications\/[^/]+\/edits$/.test(path) && searchKeys(parsed).length === 0) {
    return 'edit-create';
  }
  if (method === 'DELETE' && parsed.origin === PUBLISHER_ORIGIN && /\/androidpublisher\/v3\/applications\/[^/]+\/edits\/[^/]+$/.test(path)) {
    return 'edit-delete';
  }
  if (method === 'GET' && parsed.origin === PUBLISHER_ORIGIN && /\/edits\/[^/]+\/listings$/.test(path)) return 'listings-read';
  if (method === 'PUT' && allowMutation && parsed.origin === PUBLISHER_ORIGIN && /\/edits\/[^/]+\/listings\/[^/]+$/.test(path)) {
    return 'listing-update';
  }
  if (method === 'GET' && parsed.origin === PUBLISHER_ORIGIN && /\/edits\/[^/]+\/listings\/[^/]+\/(phoneScreenshots|featureGraphic)$/.test(path)) {
    return 'images-read';
  }
  if (method === 'DELETE' && allowMutation && parsed.origin === PUBLISHER_ORIGIN && /\/edits\/[^/]+\/listings\/[^/]+\/(phoneScreenshots|featureGraphic)\/[^/]+$/.test(path)) {
    return 'image-delete';
  }
  if (method === 'GET' && parsed.origin === PUBLISHER_ORIGIN && new RegExp(`/edits/[^/]+/countryAvailability/${RELEASE_TRACK}$`).test(path)) {
    return 'countries-read';
  }
  if (method === 'POST' && allowCommit && parsed.origin === PUBLISHER_ORIGIN && /\/edits\/[^/]+:commit$/.test(path)) {
    if (parsed.searchParams.get('changesInReviewBehavior') !== REVIEW_BEHAVIOR) return null;
    if (searchKeys(parsed).some((key) => key !== 'changesInReviewBehavior')) return null;
    return 'edit-commit';
  }
  if (method === 'POST' && allowMutation && parsed.origin === PUBLISHER_ORIGIN && /\/upload\/androidpublisher\/v3\/applications\/[^/]+\/edits\/[^/]+\/listings\/[^/]+\/(phoneScreenshots|featureGraphic)$/.test(path)) {
    if (parsed.searchParams.get('uploadType') !== 'media') return null;
    if (searchKeys(parsed).some((key) => key !== 'uploadType')) return null;
    return 'image-upload';
  }
  return null;
}

function lengthOk(value, max) {
  return [...String(value)].length <= max;
}

function listingPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw blocked('PUT', 'listing');
  for (const key of Object.keys(body)) {
    if (!LISTING_KEYS.includes(key)) throw blocked('PUT', 'listing');
  }
  const out = {};
  for (const key of LISTING_KEYS) {
    if (body[key] == null || body[key] === '') continue;
    if (typeof body[key] !== 'string') throw blocked('PUT', 'listing');
    out[key] = body[key];
  }
  if (!out.language || !out.title || !out.shortDescription || !out.fullDescription) throw blocked('PUT', 'listing');
  if (!lengthOk(out.title, TITLE_MAX) || !lengthOk(out.shortDescription, SHORT_MAX) || !lengthOk(out.fullDescription, FULL_MAX)) {
    throw blocked('PUT', 'listing');
  }
  return out;
}

function createPlayWriter({ packageName, token, fetchImpl }) {
  if (!packageName || !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(packageName)) {
    throw new Error('PLAY_PACKAGE_INVALID');
  }
  const fetchFn = fetchImpl || globalThis.fetch;
  const calls = [];
  const gates = {
    allowMutation: false,
    allowCommit: false,
    planVerified: false,
    confirmationOk: false,
    reviewersOk: false,
    refOk: false,
  };

  function assertReady() {
    if (!gates.planVerified || !gates.confirmationOk || !gates.reviewersOk || !gates.refOk) {
      throw new Error('APPLY_BLOCKED');
    }
  }

  async function request(method, url, requestBody, raw) {
    const kind = classifyPlayWrite(method, url, gates);
    const path = new URL(url).pathname;
    if (!kind) throw blocked(method, path);
    calls.push({ method, path, kind });
    const headers = {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    };
    const init = { method, redirect: 'manual', headers };
    if (raw) {
      headers['content-type'] = 'image/png';
      init.body = requestBody;
    } else if (requestBody !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(requestBody);
    }
    const response = await fetchFn(url, init);
    const status = response.status;
    if (status >= 300 && status < 400) {
      return { ok: false, status, path, method, body: null, forbidden: false };
    }
    let body = null;
    const text = typeof response.text === 'function' ? await response.text() : '';
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (_) {
        body = null;
      }
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      path,
      method,
      body,
      forbidden: status === 403,
    };
  }

  return {
    calls,
    gates,
    createEdit() {
      return request('POST', `${applicationBase(packageName)}/edits`, {});
    },
    deleteEdit(editId) {
      return request('DELETE', `${applicationBase(packageName)}/edits/${assertEditId(editId)}`);
    },
    listListings(editId) {
      return request('GET', `${applicationBase(packageName)}/edits/${assertEditId(editId)}/listings`);
    },
    listImages(editId, language, imageType) {
      if (!IMAGE_TYPES.includes(imageType)) throw blocked('GET', 'images');
      return request(
        'GET',
        `${applicationBase(packageName)}/edits/${assertEditId(editId)}/listings/${assertLanguage(language)}/${imageType}`
      );
    },
    countryAvailability(editId) {
      return request(
        'GET',
        `${applicationBase(packageName)}/edits/${assertEditId(editId)}/countryAvailability/${RELEASE_TRACK}`
      );
    },
    updateListing(editId, language, body) {
      assertReady();
      const payload = listingPayload({ ...body, language: assertLanguage(language) });
      gates.allowMutation = true;
      return request(
        'PUT',
        `${applicationBase(packageName)}/edits/${assertEditId(editId)}/listings/${payload.language}`,
        payload
      ).finally(() => {
        gates.allowMutation = false;
      });
    },
    deleteImage(editId, language, imageType, imageId) {
      assertReady();
      if (!IMAGE_TYPES.includes(imageType) || typeof imageId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(imageId)) {
        throw blocked('DELETE', 'images');
      }
      gates.allowMutation = true;
      return request(
        'DELETE',
        `${applicationBase(packageName)}/edits/${assertEditId(editId)}/listings/${assertLanguage(language)}/${imageType}/${imageId}`
      ).finally(() => {
        gates.allowMutation = false;
      });
    },
    uploadImage(editId, language, imageType, bytes) {
      assertReady();
      if (!IMAGE_TYPES.includes(imageType) || !Buffer.isBuffer(bytes) || bytes.length < 24) {
        throw blocked('POST', 'images');
      }
      gates.allowMutation = true;
      const url = `${uploadBase(packageName)}/edits/${assertEditId(editId)}/listings/${assertLanguage(language)}/${imageType}?uploadType=media`;
      return request('POST', url, bytes, true).finally(() => {
        gates.allowMutation = false;
      });
    },
    commitEdit(editId) {
      assertReady();
      gates.allowCommit = true;
      const url = `${applicationBase(packageName)}/edits/${assertEditId(editId)}:commit?changesInReviewBehavior=${REVIEW_BEHAVIOR}`;
      return request('POST', url).finally(() => {
        gates.allowCommit = false;
      });
    },
  };
}

module.exports = {
  FULL_MAX,
  REVIEW_BEHAVIOR,
  SHORT_MAX,
  TITLE_MAX,
  classifyPlayWrite,
  createPlayWriter,
  listingPayload,
};
