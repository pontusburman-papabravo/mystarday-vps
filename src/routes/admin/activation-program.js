'use strict';

/**
 * Admin — activation program experiment analytics (Fas 6B–6C).
 */

const express = require('express');
const {
  parseWindowDays,
  buildActivationRetentionReport,
  buildActivationFunnel,
  formatReportAsCsv,
} = require('../../lib/activation-program-cohort-analytics');
const { RETENTION_WINDOWS } = require('../../lib/activation-program-retention');
const stuckFamiliesDb = require('../../../db/activation-stuck-families');

const router = express.Router();

function parseWindow(req) {
  return parseWindowDays(req.query.window ?? '14');
}

/**
 * GET /api/admin/activation-program/retention?window=14|30|60
 */
router.get('/activation-program/retention', async (req, res) => {
  try {
    const windowDays = parseWindow(req);
    if (windowDays == null) {
      return res.status(400).json({
        error: `Ogiltigt window — tillåtna värden: ${RETENTION_WINDOWS.join(', ')}`,
      });
    }

    const report = await buildActivationRetentionReport({ windowDays });
    res.json(report);
  } catch (err) {
    console.error('[ADMIN activation-program] retention error:', err);
    res.status(500).json({
      error: 'Kunde inte hämta aktiverings-retention',
      detail: err.message,
    });
  }
});

/**
 * GET /api/admin/activation-program/funnel?window=14|30|60
 */
router.get('/activation-program/funnel', async (req, res) => {
  try {
    const windowDays = parseWindow(req);
    if (windowDays == null) {
      return res.status(400).json({
        error: `Ogiltigt window — tillåtna värden: ${RETENTION_WINDOWS.join(', ')}`,
      });
    }

    const funnel = await buildActivationFunnel({ windowDays });
    res.json(funnel);
  } catch (err) {
    console.error('[ADMIN activation-program] funnel error:', err);
    res.status(500).json({
      error: 'Kunde inte hämta aktiverings-funnel',
      detail: err.message,
    });
  }
});

/**
 * GET /api/admin/activation-program/retention/export?window=14|30|60
 */
router.get('/activation-program/retention/export', async (req, res) => {
  try {
    const windowDays = parseWindow(req);
    if (windowDays == null) {
      return res.status(400).json({
        error: `Ogiltigt window — tillåtna värden: ${RETENTION_WINDOWS.join(', ')}`,
      });
    }

    const [report, funnel] = await Promise.all([
      buildActivationRetentionReport({ windowDays }),
      buildActivationFunnel({ windowDays }),
    ]);

    const csv = formatReportAsCsv(report, funnel);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="activation-program-${windowDays}d-${date}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error('[ADMIN activation-program] export error:', err);
    res.status(500).json({ error: 'Kunde inte exportera aktiverings-data' });
  }
});

/**
 * GET /api/admin/activation-program/stuck-families?maxAgeDays=14&minAgeHours=48&limit=100
 */
router.get('/activation-program/stuck-families', async (req, res) => {
  try {
    const maxAgeDays = Math.min(Math.max(parseInt(req.query.maxAgeDays, 10) || 14, 1), 90);
    const minAgeHours = Math.min(Math.max(parseInt(req.query.minAgeHours, 10) || 48, 1), 168);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const families = await stuckFamiliesDb.listStuckFamilies({ maxAgeDays, minAgeHours, limit });
    res.json({
      generatedAt: new Date().toISOString(),
      maxAgeDays,
      minAgeHours,
      count: families.length,
      families,
    });
  } catch (err) {
    console.error('[ADMIN activation-program] stuck-families error:', err);
    res.status(500).json({
      error: 'Kunde inte hämta fastnade familjer',
      detail: err.message,
    });
  }
});

module.exports = router;
