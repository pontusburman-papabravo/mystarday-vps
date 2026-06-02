/**
 * Shared HTTP helpers for migration CLI tools (cookie jar + admin login).
 */

const fetch = require('node-fetch');

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  absorb(response) {
    const raw = response.headers.raw()['set-cookie'];
    if (!raw) return;
    for (const line of raw) {
      const part = line.split(';')[0];
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      this.cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

/**
 * @param {string} baseUrl
 * @param {string} path
 * @param {{ method?: string, jar?: CookieJar, bearer?: string, csrf?: string, body?: object }} opts
 */
async function apiRequest(baseUrl, path, opts = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const headers = { Accept: 'application/json' };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (opts.bearer) {
    headers.Authorization = `Bearer ${opts.bearer}`;
  } else if (opts.jar?.header()) {
    headers.Cookie = opts.jar.header();
  }
  if (opts.csrf) {
    headers['X-CSRF-Token'] = opts.csrf;
  }

  const response = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (opts.jar) {
    opts.jar.absorb(response);
  }

  return response;
}

async function adminLogin(baseUrl, email, password) {
  const jar = new CookieJar();
  const response = await apiRequest(baseUrl, '/api/auth/login', {
    method: 'POST',
    jar,
    body: { email: email.trim(), password },
  });
  const body = await readJson(response);
  if (!response.ok) {
    const err = new Error(body.error || `Login failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  if (!body.user?.isAdmin) {
    throw new Error('Kontot är inte admin');
  }
  if (!body.csrfToken) {
    throw new Error('Inget csrfToken i login-svar');
  }
  return { jar, csrfToken: body.csrfToken, user: body.user };
}

module.exports = {
  CookieJar,
  apiRequest,
  readJson,
  adminLogin,
};
