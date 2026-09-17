const { sendApiError } = require('../lib/api-user-error');
/**
 * src/routes/messages.js
 * Owns: user-facing system-message endpoints (unread list, mark-as-read).
 * Does NOT own: admin send-message endpoint (lives in routes/admin.js),
 *               contact messages (routes/contact.js / routes/admin.js).
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const systemMessages = require('../../db/system-messages');

const router = express.Router();

/**
 * GET /api/messages/unread
 * Returns unread system_messages for the authenticated parent's family,
 * filtered by per-parent dismiss state so dismissed messages don't reappear.
 */
router.get('/unread', requireParent, async (req, res) => {
  try {
    const messages = await systemMessages.getUnreadMessagesForParent(
      req.user.familyId,
      req.user.id
    );
    res.json(messages);
  } catch (err) {
    console.error('[MESSAGES] Get unread error:', err);
    sendApiError(res, 500, 'MESSAGES_FETCH_FAILED');
  }
});

/**
 * PUT /api/messages/:id/read
 * Dismisses a system_message for the calling parent — sets is_read = true
 * and records the parent in dismissed_by_parent_ids so it won't reappear.
 * Only succeeds if the message belongs to the caller's family.
 */
router.put('/:id/read', requireParent, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await systemMessages.dismissForParent(id, req.user.familyId, req.user.id);
    if (!updated) {
      return res.status(404).json({ error: 'Meddelandet hittades inte' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[MESSAGES] Mark read error:', err);
    sendApiError(res, 500, 'MESSAGE_UPDATE_FAILED');
  }
});

module.exports = router;
