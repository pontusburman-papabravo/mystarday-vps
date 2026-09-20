'use strict';

/**
 * Public För dig outcome follow-up answers.
 * Token is HMAC-signed; no login required; GET never writes.
 */

const express = require('express');
const { UUID_RE, verifyAnswerToken } = require('../lib/for-dig-followup-answer-token');
const {
  getRecipientById,
  listAnswerableItems,
  parseOutcomeScore,
  submitFollowupAnswer,
} = require('../../db/for-dig-outcome-followup');
const {
  renderAnswerQuestionPage,
  renderAnswerConfirmPage,
  renderAnswerThanksPage,
  renderAnswerAlreadyPage,
  renderAnswerErrorPage,
} = require('../lib/for-dig-followup-answer-pages');

const router = express.Router();
router.use(express.urlencoded({ extended: false }));

function rejectInvalid(res, status = 400) {
  console.warn('[FOR-DIG-FOLLOWUP-ANSWER] rejected invalid_token');
  return res.status(status).send(renderAnswerErrorPage());
}

function tokenFrom(req) {
  return req.body && req.body.t != null ? req.body.t : req.query.t;
}

async function loadAnswerContext(rawToken) {
  const verified = verifyAnswerToken(rawToken);
  if (!verified.ok) return { ok: false, reason: 'invalid_token' };
  const recipient = await getRecipientById(verified.recipientId);
  if (!recipient) return { ok: false, reason: 'invalid_token' };
  const items = await listAnswerableItems(verified.recipientId);
  return {
    ok: true,
    token: rawToken,
    recipientId: verified.recipientId,
    items,
  };
}

async function handleGet(req, res) {
  try {
    const context = await loadAnswerContext(req.query.t);
    if (!context.ok) return rejectInvalid(res);

    if (!context.items.length) {
      return res.send(renderAnswerAlreadyPage());
    }

    const item = context.items[0];
    const score = parseOutcomeScore(req.query.score);
    if (score) {
      return res.send(renderAnswerConfirmPage({
        token: String(req.query.t),
        item,
        score,
      }));
    }
    return res.send(renderAnswerQuestionPage({
      token: String(req.query.t),
      item,
      remainingCount: context.items.length,
    }));
  } catch (err) {
    console.error('[FOR-DIG-FOLLOWUP-ANSWER] get failed:', err.message);
    return res.status(500).send(renderAnswerErrorPage());
  }
}

async function handlePost(req, res) {
  const verified = verifyAnswerToken(tokenFrom(req));
  if (!verified.ok) return rejectInvalid(res);

  const childId = String(req.body.child_id || '');
  const goalSlug = String(req.body.goal_slug || '');
  if (!UUID_RE.test(childId) || !goalSlug) return rejectInvalid(res);

  try {
    const result = await submitFollowupAnswer({
      recipientId: verified.recipientId,
      childId,
      goalSlug,
      score: req.body.score,
    });
    if (!result.ok && result.reason === 'invalid_score') return rejectInvalid(res);
    if (!result.ok && result.reason === 'already_answered') {
      return res.send(renderAnswerAlreadyPage());
    }
    if (!result.ok) return rejectInvalid(res);

    const nextItem = (result.remaining || [])[0] || null;
    return res.send(renderAnswerThanksPage({
      nextItem,
      token: String(tokenFrom(req)),
    }));
  } catch (err) {
    console.error('[FOR-DIG-FOLLOWUP-ANSWER] post failed:', err.message);
    return res.status(500).send(renderAnswerErrorPage());
  }
}

router.get('/for-dig/hur-gick-det', handleGet);
router.post('/for-dig/hur-gick-det', handlePost);

module.exports = router;
