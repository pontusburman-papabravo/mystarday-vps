'use strict';

const express = require('express');
const { listReferralStats } = require('../../../db/referral');

const router = express.Router();

router.get('/referrals', async (req, res) => {
  try {
    const rows = await listReferralStats();
    res.json({ referrals: rows });
  } catch (err) {
    console.error('[ADMIN referrals] list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta värvningsdata' });
  }
});

module.exports = router;
