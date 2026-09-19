'use strict';

const CACHE_NAME_RE = /^stjarndag-v(\d+)$/;

function cacheVersionNumber(name) {
  const m = String(name || '').match(CACHE_NAME_RE);
  return m ? Number(m[1]) : NaN;
}

/** Numeric compare — string 'stjarndag-v1000' < 'stjarndag-v492' lexicographically. */
function isCacheAtLeast(cacheName, minVersion) {
  const n = cacheVersionNumber(cacheName);
  return Number.isFinite(n) && n >= minVersion;
}

module.exports = { cacheVersionNumber, isCacheAtLeast };
