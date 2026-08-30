/**
 * src/routes/notification-log.js
 * Owns: parent notification archive — list, mark-as-read, unread count.
 * Does NOT own: push subscription management (routes/push.js), system messages (routes/messages.js).
 *
 * GET  /api/notifications        — list last 7 days of notifications (newest first)
 * GET  /api/notifications/unread-count — count of unread notifications
 * PUT  /api/notifications/:id/read — mark one notification as read
 * PUT  /api/notifications/read-all  — mark all as read
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { getChildrenForParent } = require('../../db/parent-access');
const notificationLog = require('../../db/notification-log');
const {
  filterArchiveForCurrentAccess,
  publicArchiveRows,
} = require('../lib/notification-archive');

const router = express.Router();

async function accessibleChildIdsForArchive(parentId) {
  const children = await getChildrenForParent(parentId, {
    allowedRoles: ['primary', 'shared', 'pedagog'],
  });
  return children.map((child) => child.id);
}

function visibleArchiveRows(rows, accessibleChildIds) {
  return publicArchiveRows(filterArchiveForCurrentAccess(rows, accessibleChildIds));
}

// ─── GET /api/notifications ─────────────────────────────────
router.get('/', requireParent, async (req, res) => {
  try {
    const [rows, accessibleChildIds] = await Promise.all([
      notificationLog.getNotifications(req.user.id),
      accessibleChildIdsForArchive(req.user.id),
    ]);
    res.json(visibleArchiveRows(rows, accessibleChildIds));
  } catch (err) {
    console.error('[NOTIFICATIONS] Get error:', err);
    res.status(500).json({ error: 'Kunde inte hämta notiser' });
  }
});

// ─── GET /api/notifications/unread-count ──────────────────
router.get('/unread-count', requireParent, async (req, res) => {
  try {
    const [rows, accessibleChildIds] = await Promise.all([
      notificationLog.getNotifications(req.user.id),
      accessibleChildIdsForArchive(req.user.id),
    ]);
    const count = visibleArchiveRows(rows, accessibleChildIds)
      .filter((row) => row.is_read === false)
      .length;
    res.json({ count });
  } catch (err) {
    console.error('[NOTIFICATIONS] Count error:', err);
    res.status(500).json({ error: 'Kunde inte räkna notiser' });
  }
});

// ─── PUT /api/notifications/read-all ──────────────────────
// Must be declared before /:id to avoid route conflict
router.put('/read-all', requireParent, async (req, res) => {
  try {
    const updated = await notificationLog.markAllAsRead(req.user.id);
    res.json({ success: true, updated });
  } catch (err) {
    console.error('[NOTIFICATIONS] Mark all read error:', err);
    res.status(500).json({ error: 'Kunde inte markera notiser som lästa' });
  }
});

// ─── PUT /api/notifications/:id/read ──────────────────────
router.put('/:id/read', requireParent, async (req, res) => {
  try {
    const updated = await notificationLog.markAsRead(req.params.id, req.user.id);
    if (!updated) {
      return res.status(404).json({ error: 'Notisen hittades inte' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[NOTIFICATIONS] Mark read error:', err);
    res.status(500).json({ error: 'Kunde inte markera notisen som läst' });
  }
});

module.exports = router;
