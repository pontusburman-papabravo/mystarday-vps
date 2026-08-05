'use strict';

const express = require('express');
const { requireParent } = require('../../middleware/auth');
const {
  buildServerDiagnostics,
  mergeClientDiagnostics,
  assertAllowlistedPayload,
  formatClipboardText,
} = require('../../lib/support-diagnostics');

const router = express.Router();

/**
 * POST /api/account/support-diagnostics
 * Opt-in: parent taps "copy" in settings; client may send non-PII device context.
 * Response is allowlisted metadata only (+ correlation_id on this request).
 */
router.post('/support-diagnostics', requireParent, (req, res) => {
  const server = buildServerDiagnostics(req);
  const client = req.body && typeof req.body === 'object' ? req.body : {};
  const payload = mergeClientDiagnostics(server, client);
  try {
    assertAllowlistedPayload(payload);
  } catch (err) {
    return res.status(400).json({ error: 'invalid_client_context' });
  }
  res.set('X-Request-ID', req.id);
  res.json({
    diagnostics: payload,
    clipboard_text: formatClipboardText(payload),
  });
});

module.exports = router;
