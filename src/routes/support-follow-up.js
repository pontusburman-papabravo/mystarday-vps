'use strict';

/**
 * Public support thread — signed token, no login.
 * GET  /api/support/thread?token=
 * POST /api/support/follow-up { token, message }
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const contactMessages = require('../../db/contact-messages');
const { verifySupportFollowUpToken } = require('../lib/support-follow-up-token');

const router = express.Router();

function limiter(name, max) {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${name}:${req.ip}`,
    handler: (req, res) => {
      res.status(429).json({ error: 'För många försök. Försök igen om en timme.' });
    },
  });
}

function verifyToken(raw) {
  const token = typeof raw === 'string' ? raw.trim() : '';
  return verifySupportFollowUpToken(token);
}

router.get('/thread', limiter('support-thread', 60), async (req, res, next) => {
  try {
    const verified = verifyToken(req.query.token);
    if (!verified.ok) {
      return res.status(400).json({ error: 'Länken är ogiltig. Be oss skicka ett nytt svar.' });
    }
    const row = await contactMessages.getPublicThread(verified.messageId);
    if (!row) {
      return res.status(404).json({ error: 'Ärendet hittades inte.' });
    }
    res.json({ thread: row.thread });
  } catch (err) {
    next(err);
  }
});

router.post('/follow-up', limiter('support-follow-up', 10), async (req, res, next) => {
  try {
    const verified = verifyToken(req.body?.token);
    if (!verified.ok) {
      return res.status(400).json({ error: 'Länken är ogiltig. Be oss skicka ett nytt svar.' });
    }
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (message.length < 10) {
      return res.status(400).json({ error: 'Skriv minst 10 tecken så vi förstår vad som händer.' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: 'Svaret får vara högst 5000 tecken.' });
    }

    const saved = await contactMessages.recordUserFollowUp(verified.messageId, { body: message });
    if (!saved) {
      return res.status(404).json({ error: 'Ärendet hittades inte.' });
    }
    const row = await contactMessages.getPublicThread(verified.messageId);
    res.json({
      message: 'Tack! Vi har tagit emot svaret.',
      thread: row ? row.thread : [],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
