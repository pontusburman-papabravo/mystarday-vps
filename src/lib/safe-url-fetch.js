'use strict';

const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');
const { getR2PublicHostname } = require('./safe-url-fetch-hosts');

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const IMAGE_MAGIC = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function isPrivateOrBlockedIp(ip) {
  if (!ip) return true;
  const kind = net.isIP(ip);
  if (kind === 4) {
    const parts = ip.split('.').map((n) => parseInt(n, 10));
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] >= 224) return true;
    return false;
  }
  if (kind === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:')) return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('::ffff:127.')) return true;
    if (lower.startsWith('::ffff:10.')) return true;
    if (lower.startsWith('::ffff:192.168.')) return true;
    return false;
  }
  return true;
}

async function resolveHostAllowed(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;

  if (net.isIP(host)) {
    return !isPrivateOrBlockedIp(host);
  }

  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length) return false;
  for (const entry of addresses) {
    if (isPrivateOrBlockedIp(entry.address)) return false;
  }
  return true;
}

function hostnameAllowedByPolicy(hostname, options = {}) {
  const host = String(hostname || '').toLowerCase();
  const allowHosts = options.allowHostnames || [];
  for (const allowed of allowHosts) {
    if (host === allowed || host.endsWith('.' + allowed)) return true;
  }
  const r2Host = getR2PublicHostname();
  if (r2Host && (host === r2Host || host.endsWith('.' + r2Host))) return true;
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      const appHost = new URL(appUrl).hostname.toLowerCase();
      if (host === appHost) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function detectImageMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  for (const rule of IMAGE_MAGIC) {
    if (rule.bytes.every((b, i) => buffer[i] === b)) {
      if (rule.mime === 'image/webp' && buffer.length >= 12) {
        const riff = buffer.slice(8, 12).toString('ascii');
        if (riff !== 'WEBP') continue;
      }
      return rule.mime;
    }
  }
  return null;
}

async function pickConnectAddress(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host) {
    const err = new Error('blocked_host');
    err.code = 'BLOCKED_HOST';
    throw err;
  }
  if (net.isIP(host)) {
    if (isPrivateOrBlockedIp(host)) {
      const err = new Error('blocked_host');
      err.code = 'BLOCKED_HOST';
      throw err;
    }
    return { address: host, family: net.isIP(host) === 6 ? 6 : 4 };
  }
  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length) {
    const err = new Error('blocked_host');
    err.code = 'BLOCKED_HOST';
    throw err;
  }
  for (const entry of addresses) {
    if (!isPrivateOrBlockedIp(entry.address)) {
      return entry;
    }
  }
  const err = new Error('blocked_host');
  err.code = 'BLOCKED_HOST';
  throw err;
}

/**
 * HTTP(S) GET with DNS pinning — connects to a pre-resolved public IP and verifies socket remoteAddress.
 */
function pinnedHttpGet(currentUrl, timeoutMs, maxBytes = DEFAULT_MAX_BYTES) {
  return new Promise((resolve, reject) => {
    pickConnectAddress(currentUrl.hostname)
      .then((target) => {
        const isHttps = currentUrl.protocol === 'https:';
        const mod = isHttps ? https : http;
        const defaultPort = isHttps ? 443 : 80;
        const port = currentUrl.port ? Number(currentUrl.port) : defaultPort;
        const path = `${currentUrl.pathname || '/'}${currentUrl.search || ''}`;

        const req = mod.request(
          {
            host: target.address,
            port,
            path,
            method: 'GET',
            headers: {
              Host: currentUrl.hostname,
              Accept: 'image/*',
              Connection: 'close',
            },
            servername: isHttps ? currentUrl.hostname : undefined,
            family: target.family,
            timeout: timeoutMs,
          },
          (res) => {
            const chunks = [];
            let total = 0;
            let tooLarge = false;
            res.on('data', (chunk) => {
              if (tooLarge) return;
              total += chunk.length;
              if (total > maxBytes) {
                tooLarge = true;
                req.destroy();
                const err = new Error('too_large');
                err.code = 'TOO_LARGE';
                reject(err);
                return;
              }
              chunks.push(chunk);
            });
            res.on('end', () => {
              if (tooLarge) return;
              resolve({
                status: res.statusCode || 0,
                headers: res.headers,
                body: Buffer.concat(chunks),
              });
            });
          }
        );

        req.on('socket', (socket) => {
          socket.once('connect', () => {
            const remote = socket.remoteAddress;
            if (isPrivateOrBlockedIp(remote)) {
              req.destroy();
              const err = new Error('blocked_host');
              err.code = 'BLOCKED_HOST';
              reject(err);
            }
          });
        });

        req.on('timeout', () => {
          req.destroy();
          const err = new Error('timeout');
          err.code = 'TIMEOUT';
          reject(err);
        });
        req.on('error', (err) => {
          if (err.code === 'ABORT_ERR') {
            const timeoutErr = new Error('timeout');
            timeoutErr.code = 'TIMEOUT';
            reject(timeoutErr);
            return;
          }
          reject(err);
        });
        req.end();
      })
      .catch(reject);
  });
}

/**
 * Fetch a remote image URL with SSRF protections.
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
async function safeFetchImageUrl(urlString, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  const allowHostnames = options.allowHostnames || [];

  let currentUrl;
  try {
    currentUrl = new URL(urlString);
  } catch {
    const err = new Error('invalid_url');
    err.code = 'INVALID_URL';
    throw err;
  }

  if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
    const err = new Error('invalid_protocol');
    err.code = 'INVALID_PROTOCOL';
    throw err;
  }

  let redirectCount = 0;
  while (true) {
    const hostOkPolicy = hostnameAllowedByPolicy(currentUrl.hostname, { allowHostnames });
    if (!hostOkPolicy) {
      const hostOk = await resolveHostAllowed(currentUrl.hostname);
      if (!hostOk) {
        const err = new Error('blocked_host');
        err.code = 'BLOCKED_HOST';
        throw err;
      }
    }

    try {
      const response = await pinnedHttpGet(currentUrl, timeoutMs, maxBytes);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.location;
        if (!location || redirectCount >= MAX_REDIRECTS) {
          const err = new Error('redirect_limit');
          err.code = 'REDIRECT_LIMIT';
          throw err;
        }
        redirectCount += 1;
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        const err = new Error('fetch_failed');
        err.code = 'FETCH_FAILED';
        err.status = response.status;
        throw err;
      }

      const buffer = response.body;
      if (!buffer || buffer.length === 0) {
        const err = new Error('empty_body');
        err.code = 'EMPTY_BODY';
        throw err;
      }
      if (buffer.length > maxBytes) {
        const err = new Error('too_large');
        err.code = 'TOO_LARGE';
        throw err;
      }

      const magicMime = detectImageMime(buffer);
      if (!magicMime) {
        const err = new Error('not_image');
        err.code = 'NOT_IMAGE';
        throw err;
      }
      const headerMime = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const contentType = headerMime.startsWith('image/') ? headerMime : magicMime;
      return { buffer, contentType };
    } catch (fetchErr) {
      if (fetchErr.code === 'TIMEOUT') {
        throw fetchErr;
      }
      throw fetchErr;
    }
  }
}

module.exports = {
  safeFetchImageUrl,
  isPrivateOrBlockedIp,
  resolveHostAllowed,
  pickConnectAddress,
  detectImageMime,
  DEFAULT_MAX_BYTES,
  DEFAULT_TIMEOUT_MS,
};
