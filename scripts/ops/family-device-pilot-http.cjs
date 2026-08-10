'use strict';

function createCookieJar() {
  const map = new Map();
  return {
    store(response) {
      const list = response.headers.getSetCookie?.() || [];
      for (const c of list) {
        const part = c.split(';')[0];
        const i = part.indexOf('=');
        if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
      }
    },
    header() {
      return [...map].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    get(name) {
      return map.get(name);
    },
    keys() {
      return [...map.keys()];
    },
    /** Cold start: trusted device only */
    trustedOnly() {
      const td = map.get('trusted_device');
      return td ? { trusted_device: td } : {};
    },
    clearAccessTokens() {
      map.delete('access_token');
      map.delete('refresh_token');
    },
  };
}

async function readJson(res, track5xx, track429) {
  if (res.status === 429 && track429) {
    track429.push({ status: 429, url: res.url });
  }
  if (res.status >= 500 && track5xx) {
    track5xx.push({ status: res.status, url: res.url });
  }
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body, text };
}

module.exports = {
  createCookieJar,
  readJson,
};
