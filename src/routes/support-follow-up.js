'use strict';

/**
 * Public follow-up onto an existing contact_message (signed token, no login).
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const contactMessages = require('../../db/contact-messages');
const { verifySupportFollowUpToken } = require('../lib/support-follow-up-token');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `support-follow-up:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'För många försök. Försök igen om en timme.' });
  },
});

router.post('/follow-up', limiter, async (req, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const verified = verifySupportFollowUpToken(token);
    if (!verified.ok) {
      return res.status(400).json({ error: 'Länken är ogiltig. Be oss skicka ett nytt svar.' });
    }
    if (message.length < 10) {
      return res.status(400).json({ error: 'Skriv minst 10 tecken så vi förstår vad som händer.' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: 'Svaret får vara högst 5000 tecken.' });
    }

    const row = await contactMessages.recordUserFollowUp(verified.messageId, { body: message });
    if (!row) {
      return res.status(404).json({ error: 'Ärendet hittades inte.' });
    }
    res.json({ message: 'Tack! Vi har tagit emot svaret.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
