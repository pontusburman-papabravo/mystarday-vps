'use strict';

/**
 * Public market registration gate status (pre-auth).
 */

const express = require('express');
const {
  GATE_KEYS,
  isMarketOpenForRegistration,
  deriveMarketRegion,
  normalizeCountryCode,
} = require('../lib/market-region');
const { REGISTRATION_COUNTRIES } = require('../../config/market-countries');

const router = express.Router();

// GET /api/market/registration-gates
router.get('/registration-gates', async (req, res) => {
  try {
    const [se, eu, uk, us, other] = await Promise.all([
      isMarketOpenForRegistration('SE'),
      isMarketOpenForRegistration('DE'),
      isMarketOpenForRegistration('GB'),
      isMarketOpenForRegistration('US'),
      isMarketOpenForRegistration('ZZ'),
    ]);
    res.json({
      market_se_open: se,
      market_eu_open: eu,
      market_uk_open: uk,
      market_us_open: us,
      market_other_open: other,
    });
  } catch (err) {
    console.error('[MARKET] registration-gates error:', err);
    res.status(500).json({ error: 'Kunde inte hämta marknadsstatus' });
  }
});

// GET /api/market/countries — registration country list with open flags
router.get('/countries', async (req, res) => {
  try {
    const countries = await Promise.all(
      REGISTRATION_COUNTRIES.map(async (entry) => ({
        code: entry.code,
        labels: entry.labels,
        group: entry.group || null,
        market_region: deriveMarketRegion(entry.code),
        open: await isMarketOpenForRegistration(entry.code),
      }))
    );
    res.json({ countries });
  } catch (err) {
    console.error('[MARKET] countries error:', err);
    res.status(500).json({ error: 'Kunde inte hämta länder' });
  }
});

module.exports = router;
