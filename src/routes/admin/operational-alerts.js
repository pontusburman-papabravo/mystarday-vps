/**
 * Admin operational alerts — dismiss activation advisor cards on Start page.
 */
const express = require('express');
const adminOperationalAlerts = require('../../../db/admin-operational-alerts');

const router = express.Router();

// POST /api/admin/operational-alerts/:id/dismiss
router.post('/operational-alerts/:id/dismiss', async (req, res, next) => {
  try {
    const row = await adminOperationalAlerts.dismiss(req.params.id, req.user.id);
    if (!row) {
      return res.status(404).json({ error: 'Alert hittades inte eller är redan avfärdad' });
    }
    res.json({ ok: true, id: row.id });
  } catch (err) {
    console.error('[ADMIN] operational-alert dismiss error:', err);
    next(err);
  }
});

module.exports = router;
