/**
 * Pedagog daily-log API — Modell A read (E12).
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { requireComponent } = require('../middleware/require-component');
const db = require('../lib/db');
const { logPedagogEvent } = require('../lib/pedagog-audit');

const router = express.Router();
router.use(requireParent);
router.use(requireComponent('pedagog'));

async function verifyPedagogChild(pedagogId, childId) {
  const { rows } = await db.query(
    `SELECT 1 FROM parent_child
     WHERE parent_id = $1 AND child_id = $2 AND role = 'pedagog' AND revoked_at IS NULL`,
    [pedagogId, childId]
  );
  return rows.length > 0;
}

router.get('/', async (req, res) => {
  try {
    const { childId, date } = req.query;
    if (!childId || !date) {
      return res.status(400).json({ error: 'childId och date krävs' });
    }

    const ok = await verifyPedagogChild(req.user.id, childId);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    const { rows } = await db.query(
      `SELECT dli.id, dli.activity_template_id, dli.completed, dli.completed_at,
              dli.completed_by, dli.completion_comment, dli.completion_source,
              at.name, at.icon AS emoji
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN activity_template at ON at.id = dli.activity_template_id
       WHERE dl.child_id = $1 AND dl.date = $2::date
       ORDER BY dli.sort_order ASC NULLS LAST, at.name ASC`,
      [childId, date]
    );

    await logPedagogEvent({
      familyId: req.user.familyId,
      childId,
      pedagogId: req.user.id,
      action: 'pedagog_child_viewed',
      metadata: { date },
    });

    res.json({ items: rows });
  } catch (err) {
    console.error('[PEDAGOG-DAILY-LOG] GET error:', err);
    res.status(500).json({ error: 'Kunde inte hämta daglogg' });
  }
});

router.patch('/items/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const { completed, completion_comment: comment } = req.body;

    const { rows } = await db.query(
      `SELECT dli.*, dl.child_id, dl.date, c.family_id
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE dli.id = $1`,
      [itemId]
    );
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Aktivitet hittades inte' });

    const ok = await verifyPedagogChild(req.user.id, item.child_id);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    // Modell A (§4.4.11): first completion wins. Any prior completion that was
    // not made by a pedagog (home: parent/child, or legacy NULL) blocks re-completion.
    if (item.completed && item.completed_by !== 'pedagog') {
      return res.status(409).json({
        error: 'Aktiviteten är redan klar hemma',
        code: 'ACTIVITY_ALREADY_COMPLETED',
      });
    }

    if (completed === false) {
      return res.status(400).json({ error: 'Pedagog kan inte avmarkera aktivitet' });
    }

    await db.query(
      `UPDATE daily_log_item
       SET completed = true,
           completed_at = NOW(),
           completed_by = 'pedagog',
           completed_by_parent_id = $2,
           completion_source = 'school',
           completion_comment = COALESCE($3, completion_comment)
       WHERE id = $1`,
      [itemId, req.user.id, comment || null]
    );

    await logPedagogEvent({
      familyId: item.family_id,
      childId: item.child_id,
      pedagogId: req.user.id,
      action: 'pedagog_activity_completed',
      metadata: { item_id: itemId, date: item.date },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[PEDAGOG-DAILY-LOG] PATCH error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera aktivitet' });
  }
});

module.exports = router;
