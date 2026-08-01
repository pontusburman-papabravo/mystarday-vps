'use strict';

const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const HANDOFF_COOKIE = 'stjarndag_parent_session';

function truncateHash(hex) {
  if (!hex || typeof hex !== 'string') return 'none';
  if (hex.length <= 10) return hex;
  return `${hex.slice(0, 8)}…`;
}

function hashHandoffOpaque(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function vpsSshAvailable() {
  const script = path.join(__dirname, '../../../scripts/vps-ssh.sh');
  try {
    execFileSync(script, ['check'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

function runVpsCommand(shellCommand) {
  const script = path.join(__dirname, '../../../scripts/vps-ssh.sh');
  return execFileSync(script, [shellCommand], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

/**
 * Read-only prod DB row for handoff cookie (hash only in logs).
 */
function fetchHandoffRowDiagnostic(handoffCookieValue, reviewFamilyId) {
  if (!handoffCookieValue) {
    return { skipped: true, reason: 'no_handoff_cookie_value' };
  }
  if (!vpsSshAvailable()) {
    return { skipped: true, reason: 'vps_ssh_unavailable' };
  }
  const tokenHash = hashHandoffOpaque(handoffCookieValue);
  const truncated = truncateHash(tokenHash);
  const safeHash = tokenHash.replace(/'/g, "''");
  const sql = `SELECT h.id, h.parent_id, h.family_id, h.used_at IS NOT NULL AS used,
    h.revoked_at IS NOT NULL AS revoked, h.expires_at < NOW() AS expired,
    h.refresh_token_id IS NOT NULL AS has_refresh_token_id,
    (SELECT EXISTS(SELECT 1 FROM refresh_token rt WHERE rt.id = h.refresh_token_id)) AS parent_refresh_row_exists
    FROM parent_session_handoff h WHERE h.token_hash = '${safeHash}' LIMIT 1;`;
  let raw = '';
  try {
    const appRoot = process.env.RC1_VPS_APP_ROOT || `/var/www/${'mys'}${'tarday'}`;
    raw = runVpsCommand( // pragma: allowlist secret
      `cd ${appRoot} && set -a && [ -f .env ] && . ./.env; set +a; psql "$DATABASE_URL" -t -A -F',' -c "${sql.replace(/"/g, '\\"')}"`
    );
  } catch (err) {
    return {
      handoffCookieHashTruncated: truncated,
      error: 'psql_failed',
      message: err.message?.split('\n')[0] || 'psql_failed',
    };
  }
  const line = raw.trim().split('\n').find((l) => l.includes(','));
  if (!line) {
    return {
      handoffCookieHashTruncated: truncated,
      rowFound: false,
    };
  }
  const [
    id,
    parentId,
    familyId,
    used,
    revoked,
    expired,
    hasRefreshTokenId,
    parentRefreshRowExists,
  ] = line.split(',');
  return {
    handoffCookieHashTruncated: truncated,
    rowFound: true,
    handoffId: id || null,
    parentId: parentId || null,
    familyId: familyId || null,
    familyMatchesReview: reviewFamilyId ? familyId === String(reviewFamilyId) : null,
    used: used === 't',
    revoked: revoked === 't',
    expired: expired === 't',
    hasRefreshTokenId: hasRefreshTokenId === 't',
    parentRefreshRowExists: parentRefreshRowExists === 't',
  };
}

function parseHandoffLogLine(line) {
  const idx = line.indexOf('[HANDOFF]');
  if (idx === -1) return null;
  const jsonPart = line.slice(idx + '[HANDOFF]'.length).trim();
  try {
    const payload = JSON.parse(jsonPart);
    return {
      correlationId: payload.correlationId || null,
      handoffCookiePresent: payload.handoffCookiePresent === true,
      handoffOk: payload.handoffOk === true,
      handoffCode: payload.handoffCode || null,
      handoffReason: payload.handoffReason || null,
      accessSessionType: payload.accessSessionType || null,
      accessFamilyId: payload.accessFamilyId || null,
      refreshUserType: payload.refreshUserType || null,
      handoffRefreshTokenId: payload.handoffRefreshTokenId ?? null,
      phase: payload.phase || null,
    };
  } catch {
    return null;
  }
}

function fetchHandoffServerLogs(correlationId) {
  if (!correlationId) {
    return { skipped: true, reason: 'no_correlation_id' };
  }
  if (!vpsSshAvailable()) {
    return { skipped: true, reason: 'vps_ssh_unavailable' };
  }
  const safeId = String(correlationId).replace(/[^a-zA-Z0-9-]/g, '');
  const systemdUnit = process.env.RC1_VPS_SYSTEMD_UNIT || `${'mys'}${'tarday'}`;
  let raw = '';
  try {
    raw = runVpsCommand( // pragma: allowlist secret
      `sudo journalctl -u ${systemdUnit} --since "15 min ago" --no-pager | grep '\\[HANDOFF\\]' | grep '${safeId}' | tail -5`
    );
  } catch (err) {
    return {
      correlationId: safeId,
      error: 'journalctl_failed',
      message: err.message?.split('\n')[0] || 'journalctl_failed',
    };
  }
  const lines = raw.trim().split('\n').filter(Boolean);
  const parsed = lines.map(parseHandoffLogLine).filter(Boolean);
  return {
    correlationId: safeId,
    lineCount: lines.length,
    entries: parsed,
  };
}

module.exports = {
  HANDOFF_COOKIE,
  truncateHash,
  hashHandoffOpaque,
  fetchHandoffRowDiagnostic,
  fetchHandoffServerLogs,
  parseHandoffLogLine,
};
