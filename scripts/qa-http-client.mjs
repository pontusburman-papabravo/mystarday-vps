/**
 * Shared HTTP client for live QA scripts (VPS IP + Host header support).
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import httpLib from 'http';

export function createQaClient({ baseUrl, host = '', qaSecret = '' } = {}) {
  const BASE = (baseUrl || process.env.QA_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const HOST = host || process.env.QA_HOST || '';
  const QA_SECRET = qaSecret || process.env.QA_SECRET || '';
  const TLS_INSECURE = /^https:\/\/\d+\.\d+\.\d+\.\d+/.test(BASE);

  const cookies = new Map();
  let csrf = null;

  function parseSetCookie(header) {
    if (!header) return;
    const parts = Array.isArray(header) ? header : [header];
    for (const line of parts) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  function clearCookies() {
    cookies.clear();
    csrf = null;
  }

  async function http(method, urlPath, { json, csrf: useCsrf, headers: extra = {} } = {}) {
    const urlStr = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`;
    const url = new URL(urlStr);
    const headers = { Accept: 'application/json', ...extra };
    if (json) headers['Content-Type'] = 'application/json';
    if (HOST) headers.Host = HOST;
    if (QA_SECRET) headers['X-QA-Secret'] = QA_SECRET;
    const ch = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    if (ch) headers.Cookie = ch;
    if (useCsrf && csrf) headers['X-CSRF-Token'] = csrf;

    const body = json ? JSON.stringify(json) : null;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    return new Promise((resolve, reject) => {
      const lib = url.protocol === 'https:' ? https : httpLib;
      lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers,
          rejectUnauthorized: !TLS_INSECURE,
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if (res.headers['set-cookie']) parseSetCookie(res.headers['set-cookie']);
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch { data = { _raw: text.slice(0, 800) }; }
            resolve({ status: res.statusCode, data, text, headers: res.headers });
          });
        }
      ).on('error', reject).end(body || undefined);
    });
  }

  async function login(email, password) {
    clearCookies();
    const r = await http('POST', '/api/auth/login', { json: { email, password } });
    if (r.status !== 200) throw new Error(`Login ${email} → ${r.status}`);
    csrf = r.data?.csrfToken || cookies.get('csrf_token');
    if (!csrf) csrf = (await http('GET', '/api/auth/csrf-token')).data?.csrfToken;
    return r.data?.user;
  }

  async function qaToken(email, kind) {
    const r = await http('GET', `/api/qa/token?email=${encodeURIComponent(email)}&kind=${kind}`);
    return r.status === 200 ? r.data?.token : null;
  }

  return { http, login, clearCookies, qaToken, get csrf() { return csrf; }, cookies };
}

export function loadLiveCreds(rootDir) {
  const p = path.join(rootDir, 'docs/qa-live-credentials.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
