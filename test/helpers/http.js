'use strict';

/**
 * Parse Set-Cookie headers into a simple name → value map.
 */
function parseCookies(setCookie) {
  const jar = {};
  const headers = Array.isArray(setCookie)
    ? setCookie
    : (setCookie ? [setCookie] : []);
  for (const header of headers) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) {
      jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookies(jar, setCookie) {
  return { ...jar, ...parseCookies(setCookie) };
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

/**
 * Integration tests load src/lib/db via createApp(). End the pool so Node does not
 * wait ~idleTimeoutMillis before exiting (30s hang in CI).
 */
async function endAppDbPoolIfLoaded() {
  if (process.env.NODE_ENV !== 'test') return;
  try {
    const dbPath = require.resolve('../../src/lib/db');
    const cached = require.cache[dbPath];
    if (cached?.exports?.pool) {
      await cached.exports.pool.end();
      delete require.cache[dbPath];
    }
  } catch {
    // db module never loaded
  }
}

/**
 * Start createApp() on an ephemeral port. Returns { app, server, baseUrl, close }.
 */
async function listenApp(createApp) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    // Avoid integration tests waiting on server.close() for idle keep-alive sockets.
    s.keepAliveTimeout = 1;
    s.headersTimeout = 2_000;
  });
  const { port } = server.address();
  return {
    app,
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await endAppDbPoolIfLoaded();
    },
  };
}

module.exports = {
  parseCookies,
  cookieHeader,
  mergeCookies,
  getSetCookieHeaders,
  listenApp,
};
