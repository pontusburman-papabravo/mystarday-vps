/**
 * src/routes/admin/email-log.js
 * Owns: Admin email send log, approval workflow (approve/reject), auto-reject cron.
 * Does NOT own: Email template editing, subscriber management, actual send delivery.
 *
 * All routes require admin auth — applied by the parent admin router before mount.
 */

const express = require('express');
const db = require('../../lib/db');
const winBackLog = require('../../../db/win-back-email-log');
const { attachEngagementToRecords, getEngagementSummary } = require('../../../db/win-back-email-stats');
const { getWinBackStaleHours } = require('../../lib/win-back-config');
const { approveAndSend, isAutoApproveEnabled, AUTO_APPROVE_FLAG_KEY } = require('../../lib/win-back-sender');

const router = express.Router();

// GET /api/admin/email-log — all records with summary
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const [records, summary, engagement] = await Promise.all([
      winBackLog.getAll({ status }),
      winBackLog.getSummary(),
      getEngagementSummary(),
    ]);
    const recordsWithEngagement = await attachEngagementToRecords(records);
    res.json({ records: recordsWithEngagement, summary: { ...summary, engagement } });
  } catch (err) {
    console.error('[EMAIL-LOG] list error:', err);
    res.status(500).json({ error: 'Kunde inte hämta email-logg', detail: err.message });
  }
});

// GET /api/admin/email-log/pending — pending approval records
router.get('/pending', async (req, res) => {
  try {
    const records = await winBackLog.getPending();
    res.json(records);
  } catch (err) {
    console.error('[EMAIL-LOG] pending error:', err);
    res.status(500).json({ error: 'Kunde inte hämta väntande mejl', detail: err.message });
  }
});

// GET /api/admin/email-log/summary — just the summary counts
router.get('/summary', async (req, res) => {
  try {
    const summary = await winBackLog.getSummary();
    res.json(summary);
  } catch (err) {
    console.error('[EMAIL-LOG] summary error:', err);
    res.status(500).json({ error: 'Kunde inte hämta sammanfattning', detail: err.message });
  }
});

// POST /api/admin/email-log/trigger-winback — manually trigger win-back scheduler
router.post('/trigger-winback', async (req, res) => {
  if (process.env.WIN_BACK_ENABLED !== 'true') {
    return res.status(400).json({ error: 'WIN_BACK_ENABLED=false — aktivera i miljövariabler först' });
  }
  try {
    const { runWinBackNow } = require('../../lib/win-back-scheduler');
    await runWinBackNow();
    const pending = await winBackLog.getPending();
    res.json({ message: 'Win-back scheduler körde klart', pending_count: pending.length });
  } catch (err) {
    console.error('[EMAIL-LOG] trigger-winback error:', err);
    res.status(500).json({ error: 'Kunde inte köra win-back scheduler', detail: err.message });
  }
});

// GET /api/admin/email-log/auto-approve — current auto-approve toggle state
router.get('/auto-approve', async (req, res) => {
  try {
    const enabled = await isAutoApproveEnabled();
    res.json({ enabled });
  } catch (err) {
    console.error('[EMAIL-LOG] auto-approve read error:', err);
    res.status(500).json({ error: 'Kunde inte läsa auto-godkännande' });
  }
});

// PUT /api/admin/email-log/auto-approve — toggle auto-approve (upserts the flag)
router.put('/auto-approve', async (req, res) => {
  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled krävs (boolean)' });
  }
  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description, updated_at, updated_by)
       VALUES ($1, $2, 'Skicka win-back-mejl automatiskt utan manuellt godkännande', NOW(), $3)
       ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [AUTO_APPROVE_FLAG_KEY, enabled, req.user?.id || null]
    );
    console.log(`[EMAIL-LOG] win_back_auto_approve set to ${enabled} by admin ${req.user?.id}`);
    res.json({ enabled, message: enabled ? 'Auto-godkännande på — mejl skickas automatiskt' : 'Auto-godkännande av — mejl väntar på manuellt godkännande' });
  } catch (err) {
    console.error('[EMAIL-LOG] auto-approve update error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera auto-godkännande' });
  }
});

// POST /api/admin/email-log/auto-reject — manually trigger stale pending rejection
router.post('/auto-reject', async (req, res) => {
  try {
    const staleHours = getWinBackStaleHours();
    const stale = await winBackLog.getStalePending(staleHours);
    let rejected = 0;
    for (const record of stale) {
      await winBackLog.reject(record.id);
      rejected++;
    }
    res.json({ message: `Auto-rejected ${rejected} poster`, count: rejected, stale_hours: staleHours });
  } catch (err) {
    console.error('[EMAIL-LOG] auto-reject error:', err);
    res.status(500).json({ error: 'Kunde inte köra auto-reject', detail: err.message });
  }
});

// POST /api/admin/email-log/:id/approve — approve and send
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await approveAndSend(id);
    if (result.notFound) {
      return res.status(404).json({ error: 'Post hittades inte eller är inte längre väntande' });
    }
    if (result.ok) {
      return res.json({ message: 'Mejl skickat!', status: 'sent' });
    }
    return res.status(500).json({ error: `Mejl misslyckades: ${result.error}`, status: 'failed' });
  } catch (err) {
    console.error('[EMAIL-LOG] approve error:', err);
    res.status(500).json({ error: 'Kunde inte godkänna mejl' });
  }
});

// POST /api/admin/email-log/:id/reject — reject without sending
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    const record = await winBackLog.reject(id);
    if (!record) {
      return res.status(404).json({ error: 'Post hittades inte eller är redan behandlad' });
    }
    res.json({ message: 'Avvisat — mejlet skickas inte', status: 'rejected' });
  } catch (err) {
    console.error('[EMAIL-LOG] reject error:', err);
    res.status(500).json({ error: 'Kunde inte avvisa mejl' });
  }
});

module.exports = router;