'use strict';

/**
 * Admin — För dig outcome follow-up email batches.
 * Mounted behind requireAdmin in src/routes/admin.js.
 */

const express = require('express');
const followupDb = require('../../../db/for-dig-outcome-followup');

const router = express.Router();

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err.statusCode || 500;
      if (status >= 500) {
        console.error('[ADMIN for-dig-outcome-followup]', err);
      }
      res.status(status).json({ error: err.message || 'Kunde inte hantera utskicket' });
    }
  };
}

router.get('/for-dig/outcome-followup/pilot-preview', asyncRoute(async (req, res) => {
  const preview = await followupDb.previewPilotSelection({
    maxRecipients: req.query.max_recipients,
  });
  res.json(preview);
}));

router.get('/for-dig/outcome-followup/batches', asyncRoute(async (_req, res) => {
  const batches = await followupDb.listBatches();
  res.json({ batches });
}));

router.post('/for-dig/outcome-followup/batches', asyncRoute(async (req, res) => {
  const batch = await followupDb.createBatch({ subject: req.body?.subject });
  res.status(201).json({ batch });
}));

router.post('/for-dig/outcome-followup/batches/:id/prepare-from-pending', asyncRoute(async (req, res) => {
  const result = await followupDb.prepareFromPending(req.params.id, {
    maxRecipients: req.body?.max_recipients,
  });
  res.json({
    batch_id: result.batchId,
    pending_total: result.pendingTotal,
    pending_item_count: result.pending_item_count,
    unique_parents: result.unique_parents,
    eligible_parents: result.eligible_parents,
    opted_out: result.opted_out,
    inserted: result.inserted,
    skipped: result.skipped,
    max_recipients: result.max_recipients,
    excluded_already_emailed_items: result.excluded_already_emailed_items,
  });
}));

router.get('/for-dig/outcome-followup/batches/:id/preview', asyncRoute(async (req, res) => {
  const preview = await followupDb.previewBatch(req.params.id);
  res.json(preview);
}));

router.post('/for-dig/outcome-followup/batches/:id/send', asyncRoute(async (req, res) => {
  const result = await followupDb.sendBatch(req.params.id);
  res.json(result);
}));

router.get('/for-dig/outcome-followup/batches/:id/stats', asyncRoute(async (req, res) => {
  const stats = await followupDb.getBatchStats(req.params.id);
  res.json(stats);
}));

router.get('/for-dig/outcome-followup/batches/:id/recipients-tracking', asyncRoute(async (req, res) => {
  const recipients = await followupDb.getRecipientsTracking(req.params.id);
  res.json({ recipients });
}));

module.exports = router;
