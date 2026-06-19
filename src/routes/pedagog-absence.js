/**
 * Pedagog day absence (§4.4.8, E12).
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

router.put('/', async (req, res) => {
  try {
    const { childId, date, reason } = req.body;
    if (!childId || !date) return res.status(400).json({ error: 'childId och date krävs' });

    const ok = await verifyPedagogChild(req.user.id, childId);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const { rows } = await db.query(
      `INSERT INTO pedagog_day_absence (child_id, date, reported_by, reason)
       VALUES ($1, $2::date, $3, $4)
       ON CONFLICT (child_id, date) DO UPDATE
         SET reason = EXCLUDED.reason, reported_by = EXCLUDED.reported_by
       RETURNING *`,
      [childId, date, req.user.id, reason || null]
    );

    await logPedagogEvent({
      familyId: fam.rows[0].family_id,
      childId,
      pedagogId: req.user.id,
      action: 'pedagog_absence_reported',
      metadata: { date },
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('[PEDAGOG-ABSENCE] PUT error:', err);
    res.status(500).json({ error: 'Kunde inte rapportera frånvaro' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { childId, date } = req.query;
    if (!childId || !date) return res.status(400).json({ error: 'childId och date krävs' });

    const ok = await verifyPedagogChild(req.user.id, childId);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    await db.query(
      'DELETE FROM pedagog_day_absence WHERE child_id = $1 AND date = $2::date',
      [childId, date]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PEDAGOG-ABSENCE] DELETE error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort frånvaro' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { childId, date } = req.query;
    if (!childId || !date) return res.status(400).json({ error: 'childId och date krävs' });

    const ok = await verifyPedagogChild(req.user.id, childId);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    const { rows } = await db.query(
      'SELECT * FROM pedagog_day_absence WHERE child_id = $1 AND date = $2::date',
      [childId, date]
    );
    res.json({ absence: rows[0] || null });
  } catch (err) {
    console.error('[PEDAGOG-ABSENCE] GET error:', err);
    res.status(500).json({ error: 'Kunde inte hämta frånvaro' });
  }
});

module.exports = router;
