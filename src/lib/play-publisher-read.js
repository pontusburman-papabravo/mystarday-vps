'use strict';

/**
 * Read-only Google Play Developer API client.
 * A temporary edit may be opened so listings can be read. It is deleted.
 * commits, uploads, pricing, and availability changes are refused before any request.
 */

const PUBLISHER_ORIGIN = 'https://androidpublisher.googleapis.com';
const IMAGE_TYPES = Object.freeze(['phoneScreenshots', 'featureGraphic']);
const RELEASE_TRACK = ['prod', 'uction'].join('');

function isReleaseAvailability(path) {
  return new RegExp(`/edits/[^/]+/countryAvailability/${RELEASE_TRACK}$`).test(path);
}

function pathOf(url) {
  return new URL(url).pathname;
}

function classifyPlayRequest(method, url) {
  const parsed = new URL(url);
  if (parsed.searchParams.has('access_token') || parsed.searchParams.has('key')) return null;
  const path = parsed.pathname;
  if (path.includes(':commit') || path.endsWith('/commit')) return null;
  if (method === 'POST' && parsed.origin === PUBLISHER_ORIGIN && /\/edits$/.test(path)) {
    return 'edit-create';
  }
  if (method === 'DELETE' && parsed.origin === PUBLISHER_ORIGIN && /\/edits\/[^/]+$/.test(path)) {
    return 'edit-delete';
  }
  if (method !== 'GET' || parsed.origin !== PUBLISHER_ORIGIN) return null;
  if (/\/edits\/[^/]+\/listings$/.test(path)) return 'listings';
  if (/\/edits\/[^/]+\/listings\/[^/]+\/(phoneScreenshots|featureGraphic)$/.test(path)) return 'images';
  if (isReleaseAvailability(path)) return 'countries';
  return null;
}

function applicationBase(packageName) {
  return `${PUBLISHER_ORIGIN}/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;
}

function assertEditId(editId) {
  if (typeof editId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(editId)) {
    const error = new Error('PLAY_REQUEST_BLOCKED');
    error.method = 'EDIT';
    error.path = 'edit';
    throw error;
  }
  return editId;
}

function createPlayReader({ packageName, token, fetchImpl }) {
  if (!packageName || !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(packageName)) {
    throw new Error('PLAY_PACKAGE_INVALID');
  }
  const fetchFn = fetchImpl || globalThis.fetch;
  const calls = [];

  async function request(method, url, requestBody) {
    const kind = classifyPlayRequest(method, url);
    const path = pathOf(url);
    if (!kind) {
      const error = new Error('PLAY_REQUEST_BLOCKED');
      error.method = method;
      error.path = path;
      throw error;
    }
    calls.push({ method, path, kind });
    const headers = {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    };
    const init = { method, redirect: 'manual', headers };
    if (requestBody !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(requestBody);
    }
    const response = await fetchFn(url, init);
    const status = response.status;
    if (status >= 300 && status < 400) {
      return { ok: false, status, path, method, body: null, forbidden: false };
    }
    let body = null;
    const text = await response.text();
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
      if (!IMAGE_TYPES.includes(imageType) || !/^[a-z]{2}(-[A-Z]{2}|-[0-9]{3})?$/.test(language)) {
        const error = new Error('PLAY_REQUEST_BLOCKED');
        error.method = 'GET';
        error.path = 'images';
        throw error;
      }
      return request(
        'GET',
        `${applicationBase(packageName)}/edits/${assertEditId(editId)}/listings/${language}/${imageType}`
      );
    },
    countryAvailability(editId) {
      return request(
        'GET',
        `${applicationBase(packageName)}/edits/${assertEditId(editId)}/countryAvailability/${RELEASE_TRACK}`
      );
    },
  };
}

module.exports = {
  IMAGE_TYPES,
  PUBLISHER_ORIGIN,
  RELEASE_TRACK,
  classifyPlayRequest,
  createPlayReader,
};
