'use strict';

/**
 * Session telemetry — standardized metadata for parent/child session starts.
 * Fire-and-forget; never throws to callers.
 */

const analytics = require('../../db/analytics');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_METADATA_KEYS = new Set([
  'token',
  'token_hash',
  'refresh_token',
  'pin',
  'password',
  'email',
  'name',
  'username',
  'trusted_device_raw',
  'child_id',
  'parent_id',
]);

function normalizePlatform(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'ios' || p === 'android' || p === 'web') return p;
  return 'unknown';
}

function resolveRequestPlatform(req) {
  if (!req) return 'unknown';
  const header = req.headers?.['x-ms-platform'] || req.body?.platform;
  if (header) return normalizePlatform(header);
  const ua = String(req.headers?.['user-agent'] || '').toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('android')) return 'android';
  if (ua) return 'web';
  return 'unknown';
}

function sanitizeMetadata(raw) {
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (FORBIDDEN_METADATA_KEYS.has(key)) continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function buildSessionMetadata({
  actorType,
  actorId,
  trustedDeviceId = null,
  deviceMode = null,
  platform = null,
  source,
  sessionMode,
}) {
  if (!actorType || !actorId || !source || !sessionMode) {
    throw new Error('session telemetry missing required fields');
  }
  if (!['parent', 'child'].includes(actorType)) {
    throw new Error('invalid actor_type');
  }
  if (!UUID_RE.test(actorId)) throw new Error('invalid actor_id');
  if (trustedDeviceId && !UUID_RE.test(trustedDeviceId)) {
    throw new Error('invalid trusted_device_id');
  }

  return sanitizeMetadata({
    actor_type: actorType,
    actor_id: actorId,
    trusted_device_id: trustedDeviceId,
    device_mode: deviceMode,
    platform: normalizePlatform(platform),
    source,
    session_mode: sessionMode,
  });
}

function enrichActorMetadata(metadata, user) {
  if (!user?.id) return sanitizeMetadata(metadata);
  const actorType = user.type === 'child' ? 'child' : 'parent';
  const base = { ...(metadata || {}) };
  if (!base.actor_type) base.actor_type = actorType;
  if (!base.actor_id && UUID_RE.test(user.id)) base.actor_id = user.id;
  if (!base.trusted_device_id && user.trustedDeviceId && UUID_RE.test(user.trustedDeviceId)) {
    base.trusted_device_id = user.trustedDeviceId;
  }
  return sanitizeMetadata(base);
}

function trackSessionStarted(familyId, eventType, fields) {
  if (!familyId || !eventType) return;
  try {
    const metadata = buildSessionMetadata(fields);
    analytics.track(familyId, eventType, metadata);
  } catch (err) {
    console.error('[session-telemetry] trackSessionStarted skipped:', err.message);
  }
}

function classifySessionSource(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'unknown';
  if (metadata.trusted_device_id) return 'trusted_device';
  const source = String(metadata.source || '').toLowerCase();
  if (source.includes('child_login')) return 'child_login';
  if (source.includes('apple')) return 'apple_login';
  if (source.includes('google')) return 'google_login';
  if (source.includes('password') || source === 'parent_login') return 'password_login';
  return source || 'unknown';
}

module.exports = {
  buildSessionMetadata,
  enrichActorMetadata,
  trackSessionStarted,
  resolveRequestPlatform,
  classifySessionSource,
  normalizePlatform,
};
