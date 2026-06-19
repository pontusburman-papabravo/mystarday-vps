/**
 * Pedagog school activities CRUD (§4.4.12, E12).
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
    const { childId } = req.query;
    if (!childId) return res.status(400).json({ error: 'childId krävs' });

    const ok = await verifyPedagogChild(req.user.id, childId);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    const { rows } = await db.query(
      `SELECT id, name, icon, created_at
       FROM pedagog_school_activity
       WHERE child_id = $1
       ORDER BY created_at ASC`,
      [childId]
    );
    res.json({ activities: rows });
  } catch (err) {
    console.error('[PEDAGOG-SCHOOL] GET error:', err);
    res.status(500).json({ error: 'Kunde inte hämta skolaktiviteter' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { childId, name, icon } = req.body;
    if (!childId || !name?.trim()) {
      return res.status(400).json({ error: 'childId och name krävs' });
    }

    const ok = await verifyPedagogChild(req.user.id, childId);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const { rows } = await db.query(
      `INSERT INTO pedagog_school_activity (family_id, child_id, name, icon, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fam.rows[0].family_id, childId, name.trim(), icon || null, req.user.id]
    );

    await logPedagogEvent({
      familyId: fam.rows[0].family_id,
      childId,
      pedagogId: req.user.id,
      action: 'pedagog_school_activity_created',
      metadata: { activity_id: rows[0].id },
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[PEDAGOG-SCHOOL] POST error:', err);
    res.status(500).json({ error: 'Kunde inte skapa aktivitet' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT psa.*, c.family_id
       FROM pedagog_school_activity psa
       JOIN child c ON c.id = psa.child_id
       WHERE psa.id = $1 AND psa.created_by = $2`,
      [req.params.id, req.user.id]
    );
    const act = rows[0];
    if (!act) return res.status(404).json({ error: 'Aktivitet hittades inte' });

    const ok = await verifyPedagogChild(req.user.id, act.child_id);
    if (!ok) return res.status(403).json({ error: 'Åtkomst nekad' });

    await db.query('DELETE FROM pedagog_school_activity WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[PEDAGOG-SCHOOL] DELETE error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort aktivitet' });
  }
});

module.exports = router;
