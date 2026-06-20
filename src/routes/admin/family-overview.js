/**
 * Family kontrollcenter — Fas 3D.
 */
const express = require('express');
const familyOverview = require('../../../db/family-overview');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/families/:id/overview', async (req, res, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ error: 'Ogiltigt family-id' });
    }
    const overview = await familyOverview.getFamilyOverview(req.params.id);
    if (!overview) return res.status(404).json({ error: 'Familjen hittades inte' });
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
