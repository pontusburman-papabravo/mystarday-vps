'use strict';

const HANDOFF_COOKIE = 'stjarndag_parent_session';
const LOGOUT_PATH = '/api/auth/logout';

function cookieNamesFromHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return [];
  return cookieHeader.split(';').map((part) => part.trim().split('=')[0]).filter(Boolean);
}

function countNamedCookies(names, cookieName) {
  return names.filter((n) => n === cookieName).length;
}

function parsePostDataSwitchChild(postData) {
  if (!postData || typeof postData !== 'string') {
    return { postDataEmpty: true, switchChildInBody: false };
  }
  const trimmed = postData.trim();
  if (!trimmed) return { postDataEmpty: true, switchChildInBody: false };
  try {
    const parsed = JSON.parse(trimmed);
    return {
      postDataEmpty: false,
      switchChildInBody: parsed?.switchChild === true,
    };
  } catch {
    return {
      postDataEmpty: false,
      switchChildInBody: trimmed.includes('"switchChild":true') || trimmed.includes('"switchChild": true'),
    };
  }
}

function sanitizeResponseHeaders(headers) {
  const out = {};
  if (!headers) return out;
  const allow = [
    'x-request-id',
    'content-type',
    'cache-control',
    'set-cookie',
  ];
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!allow.includes(lower)) continue;
    if (lower === 'set-cookie') {
      const lines = Array.isArray(value) ? value : [value];
      out['set-cookie'] = lines.map((line) => {
        const name = String(line).split('=')[0];
        return `${name}=…`;
      });
    } else {
      out[lower] = value;
    }
  }
  return out;
}

function createLogoutRequestState() {
  return {
    requestId: null,
    url: null,
    pathname: null,
    method: null,
    postData: null,
    switchChildInBody: null,
    postDataEmpty: null,
    cookieHeaderNames: [],
    handoffCookieCount: 0,
    origin: null,
    referer: null,
    status: null,
    responseHeaders: null,
    correlationId: null,
  };
}

/**
 * Chrome DevTools Protocol capture for POST /api/auth/logout (Cookie header via ExtraInfo).
 */
class Rc1HandoffNetworkCapture {
  constructor(page) {
    this.page = page;
    this.client = null;
    this.logoutByRequestId = new Map();
    this.logoutCapture = null;
    this.childLoginCapture = null;
    this._handlers = [];
  }

  async start() {
    if (this.client) return;
    this.client = await this.page.createCDPSession();
    await this.client.send('Network.enable');

    const bind = (event, handler) => {
      this.client.on(event, handler);
      this._handlers.push({ event, handler });
    };

    bind('Network.requestWillBeSent', (params) => {
      const { requestId, request } = params;
      const url = request?.url || '';
      let pathname = '';
      try {
        pathname = new URL(url).pathname;
      } catch {
        pathname = '';
      }
      if (request?.method === 'POST' && pathname === LOGOUT_PATH) {
        const state = createLogoutRequestState();
        state.requestId = requestId;
        state.url = url;
        state.pathname = pathname;
        state.method = request.method;
        state.postData = request.postData || '';
        const sw = parsePostDataSwitchChild(state.postData);
        state.switchChildInBody = sw.switchChildInBody;
        state.postDataEmpty = sw.postDataEmpty;
        const names = cookieNamesFromHeader(request.headers?.Cookie || request.headers?.cookie);
        state.cookieHeaderNames = names;
        state.handoffCookieCount = countNamedCookies(names, HANDOFF_COOKIE);
        state.origin = request.headers?.Origin || request.headers?.origin || null;
        state.referer = request.headers?.Referer || request.headers?.referer || null;
        this.logoutByRequestId.set(requestId, state);
        this.logoutCapture = state;
      }
      if (request?.method === 'POST' && pathname === '/api/auth/child-login') {
        this.childLoginCapture = {
          requestId,
          status: null,
          setCookieNames: [],
        };
      }
    });

    bind('Network.requestWillBeSentExtraInfo', (params) => {
      const state = this.logoutByRequestId.get(params.requestId);
      if (!state) return;
      const headers = params.headers || {};
      const cookieHeader = headers.Cookie || headers.cookie || '';
      const names = cookieNamesFromHeader(cookieHeader);
      if (names.length) {
        state.cookieHeaderNames = names;
        state.handoffCookieCount = countNamedCookies(names, HANDOFF_COOKIE);
      }
    });

    bind('Network.responseReceived', (params) => {
      const { requestId, response } = params;
      const state = this.logoutByRequestId.get(requestId);
      if (state) {
        state.status = response.status;
        state.responseHeaders = sanitizeResponseHeaders(response.headers);
        state.correlationId = response.headers?.['x-request-id']
          || response.headers?.['X-Request-ID']
          || null;
      }
      if (this.childLoginCapture?.requestId === requestId) {
        this.childLoginCapture.status = response.status;
      }
    });

    bind('Network.responseReceivedExtraInfo', (params) => {
      if (this.childLoginCapture?.requestId !== params.requestId) return;
      const headers = params.headers || {};
      const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
      const lines = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
      this.childLoginCapture.setCookieNames = lines.map((line) => String(line).split('=')[0]);
    });
  }

  getLogoutWireCapture() {
    if (!this.logoutCapture) return null;
    const c = this.logoutCapture;
    return {
      pathname: c.pathname,
      method: c.method,
      postDataEmpty: c.postDataEmpty,
      switchChildInBody: c.switchChildInBody,
      cookieHeaderNames: c.cookieHeaderNames,
      handoffCookieCountOnWire: c.handoffCookieCount,
      origin: c.origin,
      referer: c.referer,
      status: c.status,
      responseHeaders: c.responseHeaders,
      requestId: c.requestId,
      correlationId: c.correlationId,
    };
  }

  getChildLoginWireCapture() {
    if (!this.childLoginCapture) return null;
    return {
      status: this.childLoginCapture.status,
      setCookieNames: this.childLoginCapture.setCookieNames,
    };
  }

  async stop() {
    if (!this.client) return;
    for (const { event, handler } of this._handlers) {
      this.client.off(event, handler);
    }
    this._handlers = [];
    await this.client.detach().catch(() => {});
    this.client = null;
  }
}

async function attachHandoffNetworkCapture(page) {
  const capture = new Rc1HandoffNetworkCapture(page);
  await capture.start();
  return capture;
}

module.exports = {
  HANDOFF_COOKIE,
  LOGOUT_PATH,
  cookieNamesFromHeader,
  countNamedCookies,
  parsePostDataSwitchChild,
  attachHandoffNetworkCapture,
  Rc1HandoffNetworkCapture,
};
