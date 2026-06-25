/**
 * Fetch Resend domain open/click tracking configuration for admin diagnostics.
 * Cached in memory — Resend domain settings change rarely.
 */
const config = require('./config');

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { fetchedAt: 0, status: null };

function sendingDomain() {
  const from = config.email.from || '';
  const at = from.lastIndexOf('@');
  return at >= 0 ? from.slice(at + 1).toLowerCase() : null;
}

function normalizeDomainRow(row) {
  if (!row) return null;
  const trackingSubdomain = row.tracking_subdomain || row.trackingSubdomain || null;
  const records = Array.isArray(row.records) ? row.records : [];
  const trackingRecord = records.find((r) => r.record === 'Tracking' || r.type === 'Tracking');
  const trackingVerified = trackingRecord
    ? trackingRecord.status === 'verified'
    : Boolean(trackingSubdomain && row.status === 'verified');

  return {
    domain: row.name,
    status: row.status || 'unknown',
    open_tracking: Boolean(row.open_tracking ?? row.openTracking),
    click_tracking: Boolean(row.click_tracking ?? row.clickTracking),
    tracking_subdomain: trackingSubdomain,
    tracking_active: Boolean(
      trackingSubdomain
      && trackingVerified
      && ((row.open_tracking ?? row.openTracking) || (row.click_tracking ?? row.clickTracking))
    ),
  };
}

async function fetchDomainStatus() {
  const apiKey = process.env.RESEND_API_KEY;
  const domain = sendingDomain();
  if (!apiKey || !domain) {
    return {
      available: false,
      domain,
      reason: !apiKey ? 'RESEND_API_KEY saknas' : 'Kunde inte läsa avsändardomän',
    };
  }

  try {
    const listRes = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    const listData = await listRes.json().catch(() => ({}));
    if (!listRes.ok) {
      return {
        available: false,
        domain,
        reason: listData.message || `Resend API ${listRes.status}`,
      };
    }

    const domains = listData.data || [];
    const match = domains.find((d) => String(d.name || '').toLowerCase() === domain);
    if (!match) {
      return {
        available: false,
        domain,
        reason: `Domänen ${domain} hittades inte i Resend`,
      };
    }

    const detailRes = await fetch(`https://api.resend.com/domains/${match.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    const detailData = await detailRes.json().catch(() => ({}));
    if (!detailRes.ok) {
      return {
        available: false,
        domain,
        reason: detailData.message || `Resend API ${detailRes.status}`,
      };
    }

    const normalized = normalizeDomainRow(detailData);
    return { available: true, ...normalized };
  } catch (err) {
    return {
      available: false,
      domain,
      reason: err.message || 'Resend API-fel',
    };
  }
}

async function getDomainTrackingStatus() {
  const now = Date.now();
  if (cache.status && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.status;
  }
  const status = await fetchDomainStatus();
  cache = { fetchedAt: now, status };
  return status;
}

/** Test helper — reset in-memory cache between tests. */
function clearDomainStatusCache() {
  cache = { fetchedAt: 0, status: null };
}

module.exports = {
  getDomainTrackingStatus,
  clearDomainStatusCache,
  sendingDomain,
};
