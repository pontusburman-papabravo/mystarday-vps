'use strict';

/** Notiser is a 7-day archive of successful push sends — not an inbox. */
const ARCHIVE_WINDOW_DAYS = 7;

/**
 * Archive a push only after at least one delivery succeeded.
 * Failed, suppressed, and no-subscription sends stay out.
 * @param {number} sentCount
 */
function shouldArchiveSuccessfulPush(sentCount) {
  return Number(sentCount) > 0;
}

function childIdFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = metadata.child_id;
  if (raw == null) return null;
  const id = String(raw).trim();
  return id || null;
}

/**
 * Child-scoped rows stay visible only while the parent still has access.
 * Rows without child_id (family/news) remain parent-scoped.
 * @param {{ metadata?: object }} row
 * @param {string[]} accessibleChildIds
 */
function isArchiveRowVisible(row, accessibleChildIds) {
  const childId = childIdFromMetadata(row && row.metadata);
  if (!childId) return true;
  return Array.isArray(accessibleChildIds) && accessibleChildIds.includes(childId);
}

function filterArchiveForCurrentAccess(rows, accessibleChildIds) {
  return (rows || []).filter((row) => isArchiveRowVisible(row, accessibleChildIds));
}

/** Strip metadata before sending to the client. */
function publicArchiveRows(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    url: row.url,
    is_read: row.is_read,
    created_at: row.created_at,
  }));
}

/**
 * @param {boolean|null} ok null = loading
 * @param {number} count
 * @returns {'loading'|'error'|'ok_items'|'ok_empty'}
 */
function notificationLoadOutcome(ok, count) {
  if (ok === null) return 'loading';
  if (ok === false) return 'error';
  return Number(count) > 0 ? 'ok_items' : 'ok_empty';
}

module.exports = {
  ARCHIVE_WINDOW_DAYS,
  shouldArchiveSuccessfulPush,
  childIdFromMetadata,
  isArchiveRowVisible,
  filterArchiveForCurrentAccess,
  publicArchiveRows,
  notificationLoadOutcome,
};
