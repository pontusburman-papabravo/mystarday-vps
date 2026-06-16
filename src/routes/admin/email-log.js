/**
 * src/routes/admin/email-log.js
 * Owns: Admin email send log, approval workflow (approve/reject), auto-reject cron.
 * Does NOT own: Email template editing, subscriber management, actual send delivery.
 *
 * All routes require admin auth — applied by the parent admin router before mount.
 */

const express = require('express');
const winBackLog = require('../../../db/win-back-email-log');
const { sendWinBackEmail } = require('../../lib/email');

const router = express.Router();

// GET /api/admin/email-log — all records with summary
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const [records, summary] = await Promise.all([
      winBackLog.getAll({ status }),
      winBackLog.getSummary(),
    ]);
    res.json({ records, summary });
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

// POST /api/admin/email-log/auto-reject — manually trigger stale pending rejection
router.post('/auto-reject', async (req, res) => {
  try {
    const stale = await winBackLog.getStalePending(48);
    let rejected = 0;
    for (const record of stale) {
      await winBackLog.reject(record.id);
      rejected++;
    }
    res.json({ message: `Auto-rejected ${rejected} poster`, count: rejected });
  } catch (err) {
    console.error('[EMAIL-LOG] auto-reject error:', err);
    res.status(500).json({ error: 'Kunde inte köra auto-reject', detail: err.message });
  }
});

// POST /api/admin/email-log/:id/approve — approve and send
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const record = await winBackLog.approve(id);
    if (!record) {
      return res.status(404).json({ error: 'Post hittades inte eller är inte längre väntande' });
    }

    // Send the email
    const result = await sendWinBackEmail({
      to: record.parent_email,
      parentName: record.parent_name,
      childName: record.child_name,
      ctaUrl: `https://mystarday.se/dashboard?utm_source=winback&utm_medium=email`,
    });

    if (result.success) {
      await winBackLog.markSent(id);
      res.json({ message: 'Mejl skickat!', status: 'sent' });
    } else {
      await winBackLog.markFailed(id, result.error || 'Okänt fel');
      res.status(500).json({ error: `Mejl misslyckades: ${result.error}`, status: 'failed' });
    }
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