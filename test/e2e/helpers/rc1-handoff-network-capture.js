'use strict';

const {
  decodeCdpBody,
  sanitizeLogoutBodyFromText,
  sanitizeVerifyPinPickerBodyFromText,
  summarizeSetCookieNames,
  sanitizeErrorMessage,
} = require('./rc1-handoff-cdp-body');

const HANDOFF_COOKIE = 'stjarndag_parent_session';
const LOGOUT_PATH = '/api/auth/logout';
const VERIFY_PIN_PICKER_PATH = '/api/family/verify-pin-picker';

function cookieNamesFromHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return [];
  return cookieHeader.split(';').map((part) => part.trim().split('=')[0]).filter(Boolean);
}

function cookieNamesFromSetCookieLines(lines) {
  const names = [];
  for (const line of lines) {
    const name = String(line).split('=')[0]?.trim();
    if (name) names.push(name);
  }
  return names;
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
    responseSetCookieNames: [],
    loadingFinished: false,
    loadingFailed: null,
    cdpBody: null,
    cdpBodyError: null,
    bodyCapturePromise: null,
    bodyCaptureResolve: null,
  };
}

function ensureBodyCapturePromise(state) {
  if (!state.bodyCapturePromise) {
    state.bodyCapturePromise = new Promise((resolve) => {
      state.bodyCaptureResolve = resolve;
    });
  }
  return state.bodyCapturePromise;
}

function finishBodyCapture(state, payload) {
  if (state.bodyCaptureResolve) {
    state.bodyCaptureResolve(payload);
    state.bodyCaptureResolve = null;
  }
}

async function fetchCdpResponseBody(client, requestId) {
  try {
    const result = await client.send('Network.getResponseBody', { requestId });
    const rawText = decodeCdpBody(result.body, result.base64Encoded === true);
    const sanitized = sanitizeLogoutBodyFromText(rawText);
    return {
      bodyCaptureOk: true,
      base64Encoded: result.base64Encoded === true,
      ...sanitized,
      cdpError: null,
    };
  } catch (err) {
    return {
      bodyCaptureOk: false,
      base64Encoded: null,
      bodyLength: 0,
      jsonParseOk: false,
      sessionRestored: null,
      needsParentPin: null,
      loggedOut: null,
      handoffAvailable: null,
      code: null,
      switchChild: null,
      cdpError: {
        name: err.name || 'Error',
        message: sanitizeErrorMessage(err.message || 'getResponseBody_failed'),
      },
    };
  }
}

async function fetchCdpPickerResponseBody(client, requestId) {
  try {
    const result = await client.send('Network.getResponseBody', { requestId });
    const rawText = decodeCdpBody(result.body, result.base64Encoded === true);
    const sanitized = sanitizeVerifyPinPickerBodyFromText(rawText);
    return {
      bodyCaptureOk: true,
      base64Encoded: result.base64Encoded === true,
      ...sanitized,
      cdpError: null,
    };
  } catch (err) {
    return {
      bodyCaptureOk: false,
      base64Encoded: null,
      bodyLength: 0,
      jsonParseOk: false,
      ok: null,
      code: null,
      hasParent: false,
      hasCsrfToken: false,
      cdpError: {
        name: err.name || 'Error',
        message: sanitizeErrorMessage(err.message || 'getResponseBody_failed'),
      },
    };
  }
}

function createPickerRequestState() {
  return {
    requestId: null,
    pathname: null,
    method: null,
    status: null,
    responseHeaders: null,
    correlationId: null,
    responseSetCookieNames: [],
    loadingFinished: false,
    loadingFailed: null,
    cdpBody: null,
    bodyCapturePromise: null,
    bodyCaptureResolve: null,
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
    this.pickerByRequestId = new Map();
    this.logoutCapture = null;
    this.pickerCapture = null;
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
        ensureBodyCapturePromise(state);
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
      if (request?.method === 'POST' && pathname === VERIFY_PIN_PICKER_PATH) {
        const state = createPickerRequestState();
        state.requestId = requestId;
        state.pathname = pathname;
        state.method = request.method;
        ensureBodyCapturePromise(state);
        this.pickerByRequestId.set(requestId, state);
        this.pickerCapture = state;
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
        const client = this.client;
        void (async () => {
          const early = await fetchCdpResponseBody(client, requestId);
          if (early.jsonParseOk) {
            state.cdpBody = early;
            finishBodyCapture(state, early);
          }
        })();
      }
      if (this.childLoginCapture?.requestId === requestId) {
        this.childLoginCapture.status = response.status;
      }
      const pickerState = this.pickerByRequestId.get(requestId);
      if (pickerState) {
        pickerState.status = response.status;
        pickerState.responseHeaders = sanitizeResponseHeaders(response.headers);
        pickerState.correlationId = response.headers?.['x-request-id']
          || response.headers?.['X-Request-ID']
          || null;
        const client = this.client;
        void (async () => {
          const early = await fetchCdpPickerResponseBody(client, requestId);
          if (early.jsonParseOk) {
            pickerState.cdpBody = early;
            finishBodyCapture(pickerState, early);
          }
        })();
      }
    });

    bind('Network.responseReceivedExtraInfo', (params) => {
      const logoutState = this.logoutByRequestId.get(params.requestId);
      if (logoutState) {
        const headers = params.headers || {};
        const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
        const lines = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
        logoutState.responseSetCookieNames = cookieNamesFromSetCookieLines(lines);
      }
      if (this.childLoginCapture?.requestId === params.requestId) {
        const headers = params.headers || {};
        const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
        const lines = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
        this.childLoginCapture.setCookieNames = cookieNamesFromSetCookieLines(lines);
      }
      const pickerState = this.pickerByRequestId.get(params.requestId);
      if (pickerState) {
        const headers = params.headers || {};
        const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
        const lines = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
        pickerState.responseSetCookieNames = cookieNamesFromSetCookieLines(lines);
      }
    });

    bind('Network.loadingFailed', (params) => {
      const state = this.logoutByRequestId.get(params.requestId);
      if (state) {
        state.loadingFailed = {
          errorText: sanitizeErrorMessage(params.errorText || 'loading_failed'),
          canceled: params.canceled === true,
        };
        finishBodyCapture(state, {
          bodyCaptureOk: false,
          cdpError: { name: 'LoadingFailed', message: state.loadingFailed.errorText },
        });
      }
      const pickerState = this.pickerByRequestId.get(params.requestId);
      if (pickerState) {
        pickerState.loadingFailed = {
          errorText: sanitizeErrorMessage(params.errorText || 'loading_failed'),
          canceled: params.canceled === true,
        };
        finishBodyCapture(pickerState, {
          bodyCaptureOk: false,
          cdpError: { name: 'LoadingFailed', message: pickerState.loadingFailed.errorText },
        });
      }
    });

    bind('Network.loadingFinished', (params) => {
      const state = this.logoutByRequestId.get(params.requestId);
      if (state) {
        state.loadingFinished = true;
        const client = this.client;
        const { requestId } = params;
        void (async () => {
          const cdpBody = await fetchCdpResponseBody(client, requestId);
          state.cdpBody = cdpBody;
          finishBodyCapture(state, cdpBody);
        })();
      }
      const pickerState = this.pickerByRequestId.get(params.requestId);
      if (pickerState) {
        pickerState.loadingFinished = true;
        const client = this.client;
        const { requestId } = params;
        void (async () => {
          const cdpBody = await fetchCdpPickerResponseBody(client, requestId);
          pickerState.cdpBody = cdpBody;
          finishBodyCapture(pickerState, cdpBody);
        })();
      }
    });
  }

  async waitForPickerCdpBody(timeoutMs = 8000) {
    const state = this.pickerCapture;
    if (!state) return null;
    ensureBodyCapturePromise(state);
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const result = await Promise.race([state.bodyCapturePromise, timeout]);
    clearTimeout(timer);
    if (result) return result;
    if (state.cdpBody) return state.cdpBody;
    return {
      bodyCaptureOk: false,
      cdpError: { name: 'Timeout', message: 'picker_cdp_body_timeout' },
    };
  }

  async retryPickerCdpBody() {
    const state = this.pickerCapture;
    if (!state?.requestId || !this.client) return null;
    return fetchCdpPickerResponseBody(this.client, state.requestId);
  }

  getPickerWireCapture() {
    if (!this.pickerCapture) return null;
    const c = this.pickerCapture;
    const cdp = c.cdpBody || {};
    const setCookieSummary = summarizeSetCookieNames(c.responseSetCookieNames);
    return {
      status: c.status,
      requestId: c.requestId,
      correlationId: c.correlationId,
      loadingFinished: c.loadingFinished,
      loadingFailed: c.loadingFailed,
      pickerSetCookies: setCookieSummary,
      cdpBody: {
        status: c.status,
        bodyReadOk: cdp.jsonParseOk === true,
        ok: cdp.ok === true,
        code: cdp.code || null,
        hasParent: cdp.hasParent === true,
        hasCsrfToken: cdp.hasCsrfToken === true,
        requestId: c.requestId,
      },
    };
  }

  async waitForLogoutCdpBody(timeoutMs = 8000) {
    const state = this.logoutCapture;
    if (!state) return null;
    ensureBodyCapturePromise(state);
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const result = await Promise.race([state.bodyCapturePromise, timeout]);
    clearTimeout(timer);
    if (result) return result;
    if (state.cdpBody) return state.cdpBody;
    return {
      bodyCaptureOk: false,
      cdpError: { name: 'Timeout', message: 'logout_cdp_body_timeout' },
    };
  }

  getLogoutWireCapture() {
    if (!this.logoutCapture) return null;
    const c = this.logoutCapture;
    const setCookieSummary = summarizeSetCookieNames(c.responseSetCookieNames);
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
      loadingFinished: c.loadingFinished,
      loadingFailed: c.loadingFailed,
      logoutSetCookies: setCookieSummary,
      cdpBody: c.cdpBody || null,
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
  sanitizeLogoutBodyFromText,
};
