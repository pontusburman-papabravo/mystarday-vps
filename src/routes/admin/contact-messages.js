/**
 * Admin contact messages — Fas 3A/3B inbox API.
 */
const express = require('express');
const contactMessages = require('../../../db/contact-messages');

const router = express.Router();

const VALID_TYPES = ['bug', 'feedback', 'contact', 'language'];
const VALID_INBOX = ['unread', 'active', 'answered', 'archived'];

router.get('/contact-messages', async (req, res, next) => {
  try {
    const type = VALID_TYPES.includes(req.query.type) ? req.query.type : undefined;
    const status = contactMessages.MESSAGE_STATUSES.includes(req.query.status)
      ? req.query.status
      : undefined;
    const inbox = VALID_INBOX.includes(req.query.inbox) ? req.query.inbox : undefined;
    const followup = req.query.followup === '1' || req.query.followup === 'true';
    const rows = await contactMessages.listMessages({ type, status, inbox, followup });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/contact-messages/unread-count', async (req, res, next) => {
  try {
    const counts = await contactMessages.getMessageCounts();
    res.json({
      unreadCount: counts.unread_count || 0,
      needsFollowUpCount: counts.needs_follow_up_count || 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/contact-messages/counts', async (req, res, next) => {
  try {
    const counts = await contactMessages.getMessageCounts();
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

router.patch('/contact-messages/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const row = await contactMessages.updateMessageStatus(
      req.params.id,
      status,
      req.user.id
    );
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Status uppdaterad', ...row });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.patch('/contact-messages/:id/family', async (req, res, next) => {
  try {
    const { family_id: familyId } = req.body || {};
    const row = await contactMessages.linkMessageFamily(req.params.id, familyId || null);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Familjkoppling uppdaterad', ...row });
  } catch (err) {
    next(err);
  }
});

router.put('/contact-messages/:id/read', async (req, res, next) => {
  try {
    const { is_read: isRead } = req.body || {};
    if (typeof isRead !== 'boolean') {
      return res.status(400).json({ error: 'is_read krävs (boolean)' });
    }
    const row = await contactMessages.setMessageRead(req.params.id, isRead, req.user.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: isRead ? 'Markerat som läst' : 'Markerat som oläst', ...row });
  } catch (err) {
    next(err);
  }
});

router.put('/contact-messages/:id/note', async (req, res, next) => {
  try {
    const { note } = req.body || {};
    const row = await contactMessages.saveMessageNote(req.params.id, note, req.user.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Anteckning sparad', ...row });
  } catch (err) {
    next(err);
  }
});

router.delete('/contact-messages/:id', async (req, res, next) => {
  try {
    const row = await contactMessages.deleteMessage(req.params.id);
    if (!row) return res.status(404).json({ error: 'Meddelandet hittades inte' });
    res.json({ message: 'Meddelandet har tagits bort' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
