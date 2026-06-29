'use strict';

const express = require('express');
const {
  loadLatestReport,
  runJourneyDailyAnalysisJob,
  msUntilNextRun,
  ANALYSIS_HOUR_STOCKHOLM,
} = require('../../lib/journey-daily-analysis-scheduler');

const router = express.Router();

router.get('/journey-daily-analysis/latest', async (req, res) => {
  try {
    const report = await loadLatestReport();
    res.json({
      report,
      nextRunInMs: msUntilNextRun(),
      scheduleHourStockholm: ANALYSIS_HOUR_STOCKHOLM,
    });
  } catch (err) {
    console.error('[ADMIN] journey-daily-analysis latest error:', err);
    res.status(500).json({ error: 'Kunde inte hämta analys' });
  }
});

router.post('/journey-daily-analysis/run', async (req, res) => {
  try {
    const report = await runJourneyDailyAnalysisJob();
    if (!report) {
      return res.status(409).json({ error: 'Analys körs redan på annan instans' });
    }
    res.json({ ok: true, report });
  } catch (err) {
    console.error('[ADMIN] journey-daily-analysis run error:', err);
    res.status(500).json({ error: err.message || 'Analys misslyckades' });
  }
});

module.exports = router;
