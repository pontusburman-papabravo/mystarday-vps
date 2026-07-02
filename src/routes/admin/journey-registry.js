'use strict';

const express = require('express');
const journeyRegistry = require('../../../db/journey-registry');
const { loadRegistry } = require('../../lib/journey/registry');
const { FLAG_KEYS, isFlagEnabled } = require('../../lib/journey/flags');

const router = express.Router();

router.get('/journey/registry', async (req, res) => {
  try {
    const useDb = await isFlagEnabled(FLAG_KEYS.registryV2);
    const registry = await loadRegistry({ useDb });
    const locale = String(req.query.locale || 'sv');
    let rowCount = null;
    if (useDb) {
      const rows = await journeyRegistry.listActiveRows(locale);
      rowCount = rows.length;
    }
    res.json({
      source: useDb ? 'db' : 'json_fallback',
      row_count: rowCount,
      registry,
    });
  } catch (err) {
    console.error('[ADMIN] journey/registry error:', err);
    res.status(500).json({ error: 'Kunde inte hämta registry' });
  }
});

module.exports = router;
