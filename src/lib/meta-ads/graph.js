'use strict';

const { getMetaAdsConfig } = require('./config');

class MetaAdsGraphError extends Error {
  constructor(message, { status, code, type } = {}) {
    super(message);
    this.name = 'MetaAdsGraphError';
    this.status = status || 502;
    this.code = code || 'META_ADS_GRAPH';
    this.type = type || null;
  }
}

function createGraphClient(overrides = {}) {
  const config = { ...getMetaAdsConfig(), ...overrides };
  const fetchImpl = overrides.fetchImpl || fetch;
  const accessToken = config.accessToken;
  if (!accessToken) {
    throw new Error('META_ADS_ACCESS_TOKEN saknas');
  }

  async function graph(method, objectPath, body) {
    const path = String(objectPath || '').replace(/^\//, '');
    const url = `https://graph.facebook.com/${config.graphVersion}/${path}`;
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.graphTimeoutMs),
    };
    if (body != null && method !== 'GET') {
      init.body = JSON.stringify(body);
    } else if (method === 'GET' && body && typeof body === 'object') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        if (value != null) params.set(key, String(value));
      }
      const qs = params.toString();
      init.headers = { Authorization: `Bearer ${accessToken}` };
      const getUrl = qs ? `${url}?${qs}` : url;
      const res = await fetchImpl(getUrl, init);
      return parseGraphResponse(res);
    }
    const res = await fetchImpl(url, init);
    return parseGraphResponse(res);
  }

  return { graph, adAccountId: config.adAccountId, pageId: config.pageId };
}

async function parseGraphResponse(res) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data.error) {
    const fb = data.error || {};
    throw new MetaAdsGraphError(fb.message || `Meta Graph HTTP ${res.status}`, {
      status: res.status,
      code: fb.code,
      type: fb.type,
    });
  }
  return data;
}

function createGraphClientFromEnv() {
  return createGraphClient();
}

module.exports = {
  MetaAdsGraphError,
  createGraphClient,
  createGraphClientFromEnv,
};
