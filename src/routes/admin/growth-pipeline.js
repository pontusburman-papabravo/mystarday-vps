/**
 * Growth lead pipeline API — Fas 3C.
 */
const express = require('express');
const growthLeads = require('../../../db/growth-leads');

const router = express.Router();

router.get('/growth-pipeline', async (req, res, next) => {
  try {
    const status = req.query.status;
    const leadType = req.query.type;
    const [leads, statusCounts] = await Promise.all([
      growthLeads.listPipeline({ status, leadType: leadType }),
      growthLeads.countByStatus(),
    ]);
    res.json({ leads, statusCounts, statuses: growthLeads.LEAD_STATUSES });
  } catch (err) {
    next(err);
  }
});

router.patch('/growth-leads/:type/:id', async (req, res, next) => {
  try {
    const row = await growthLeads.updateLead(req.params.type, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Lead hittades inte' });
    res.json({ message: 'Lead uppdaterad', lead: row });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
