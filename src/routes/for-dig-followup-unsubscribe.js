'use strict';

/**
 * Public För dig outcome follow-up unsubscribe.
 * Token is HMAC-signed; no auth required; only this opt-out can change.
 */

const express = require('express');
const { verifyUnsubToken } = require('../lib/for-dig-followup-unsub-token');
const {
  optOutByUnsubToken,
  undoOptOutByUnsubToken,
} = require('../../db/for-dig-followup-email-preference');
const {
  renderFollowupOptedOutPage,
  renderFollowupUndoPage,
  renderFollowupUnsubErrorPage,
} = require('../lib/for-dig-followup-unsub-pages');

const router = express.Router();

function rejectInvalid(res, status = 400) {
  console.warn('[FOR-DIG-FOLLOWUP-UNSUB] rejected invalid_token');
  return res.status(status).send(renderFollowupUnsubErrorPage());
}

async function handleOptOut(req, res) {
  const verified = verifyUnsubToken(req.query.t);
  if (!verified.ok) return rejectInvalid(res);

  try {
    const result = await optOutByUnsubToken(verified.unsubToken);
    if (!result.ok) return rejectInvalid(res);
    const undoAction = `/for-dig/followup-unsubscribe?t=${encodeURIComponent(String(req.query.t))}&action=undo`;
    return res.send(renderFollowupOptedOutPage({ undoAction }));
  } catch (err) {
    console.error('[FOR-DIG-FOLLOWUP-UNSUB] opt-out failed:', err.message);
    return res.status(500).send(renderFollowupUnsubErrorPage());
  }
}

async function handlePost(req, res) {
  const verified = verifyUnsubToken(req.query.t);
  if (!verified.ok) {
    if (req.query.action === 'undo') return rejectInvalid(res);
    console.warn('[FOR-DIG-FOLLOWUP-UNSUB] rejected invalid_token');
    return res.status(400).end();
  }

  try {
    if (req.query.action === 'undo') {
      const result = await undoOptOutByUnsubToken(verified.unsubToken);
      if (!result.ok) return rejectInvalid(res);
      return res.send(renderFollowupUndoPage());
    }
    const result = await optOutByUnsubToken(verified.unsubToken);
    if (!result.ok) return res.status(400).end();
    return res.status(200).end();
  } catch (err) {
    console.error('[FOR-DIG-FOLLOWUP-UNSUB] post failed:', err.message);
    return res.status(500).end();
  }
}

router.get('/for-dig/followup-unsubscribe', handleOptOut);
router.post('/for-dig/followup-unsubscribe', handlePost);

module.exports = router;
