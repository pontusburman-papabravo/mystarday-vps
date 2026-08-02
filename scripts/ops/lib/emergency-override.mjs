import fs from 'node:fs';
import path from 'node:path';

const ACK_VALUE = 'INCIDENT_ACKNOWLEDGED';
const MAX_MARKER_AGE_MS = 30 * 60 * 1000;

/**
 * Emergency skip is allowed only via a short-lived marker file (never env alone).
 * @returns {{ active: boolean, record?: object }}
 */
export function readEmergencyOverrideMarker(markerPath, env = process.env, nowMs = Date.now()) {
  if (!markerPath || !String(markerPath).trim()) {
    return { active: false };
  }
  const resolved = path.resolve(markerPath);
  if (!fs.existsSync(resolved)) {
    return { active: false };
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    throw new Error('EMERGENCY_MARKER_INVALID_JSON');
  }
  if (raw.acknowledged !== ACK_VALUE) {
    throw new Error('EMERGENCY_MARKER_INVALID_ACK');
  }
  const deploySha = env.DEPLOY_SHA || raw.deploy_sha;
  if (raw.deploy_sha && deploySha && raw.deploy_sha !== deploySha) {
    throw new Error('EMERGENCY_MARKER_SHA_MISMATCH');
  }
  const created = Date.parse(raw.created_at_utc || '');
  if (!Number.isFinite(created)) {
    throw new Error('EMERGENCY_MARKER_MISSING_CREATED_AT');
  }
  if (nowMs - created > MAX_MARKER_AGE_MS) {
    throw new Error('EMERGENCY_MARKER_EXPIRED');
  }
  if (raw.expires_at_utc) {
    const exp = Date.parse(raw.expires_at_utc);
    if (Number.isFinite(exp) && nowMs > exp) {
      throw new Error('EMERGENCY_MARKER_EXPIRED');
    }
  }
  return {
    active: true,
    record: {
      deploy_sha: deploySha || raw.deploy_sha,
      operator: raw.operator || 'unknown',
      created_at_utc: raw.created_at_utc,
      marker_path: resolved,
    },
  };
}

export function logEmergencyOverride(record) {
  const line = `[backup-gate] EMERGENCY OVERRIDE deploy_sha=${record.deploy_sha} operator=${record.operator} utc=${new Date().toISOString()} marker=${record.marker_path}`;
  console.error(line);
}
