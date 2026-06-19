/**
 * Pedagog day comments + parent Samarbete API (E12).
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { requireComponent } = require('../middleware/require-component');
const db = require('../lib/db');

const router = express.Router();
router.use(requireParent);

router.get('/', requireComponent('pedagog'), async (req, res) => {
  try {
    const { childId, date } = req.query;
    if (!childId || !date) return res.status(400).json({ error: 'childId och date krävs' });

    const { rows } = await db.query(
      `SELECT pdc.*, p.name AS parent_name
       FROM pedagog_day_comment pdc
       JOIN parent p ON p.id = pdc.parent_id
       JOIN child c ON c.id = pdc.child_id
       WHERE pdc.child_id = $1 AND pdc.date = $2::date AND c.family_id = $3`,
      [childId, date, req.user.familyId]
    );
    res.json({ comments: rows });
  } catch (err) {
    console.error('[PEDAGOG-COMMENTS] GET error:', err);
    res.status(500).json({ error: 'Kunde inte hämta kommentarer' });
  }
});

router.post('/', requireComponent('pedagog'), async (req, res) => {
  try {
    const { childId, date, content } = req.body;
    if (!childId || !date || !content?.trim()) {
      return res.status(400).json({ error: 'childId, date och content krävs' });
    }

    const { rows } = await db.query(
      `INSERT INTO pedagog_day_comment (child_id, parent_id, date, content)
       VALUES ($1, $2, $3::date, $4)
       ON CONFLICT (child_id, parent_id, date) DO UPDATE
         SET content = EXCLUDED.content, created_at = NOW()
       RETURNING *`,
      [childId, req.user.id, date, content.trim()]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[PEDAGOG-COMMENTS] POST error:', err);
    res.status(500).json({ error: 'Kunde inte spara kommentar' });
  }
});

/** Parent Samarbete — published pedagog notes for family */
router.get('/samarbete/notes', requireComponent('pedagog'), async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { childId, limit = 20 } = req.query;

    let sql = `
      SELECT pn.id, pn.date, pn.notes, pn.mood, pn.published_at,
             p.name AS pedagog_name, c.name AS child_name, c.id AS child_id
      FROM pedagog_notes pn
      JOIN parent p ON p.id = pn.pedagog_id
      JOIN child c ON c.id = pn.child_id
      WHERE c.family_id = $1
        AND (pn.note_status = 'published' OR (pn.note_status IS NULL AND pn.is_draft = false))
    `;
    const params = [familyId];
    if (childId) {
      params.push(childId);
      sql += ` AND pn.child_id = $${params.length}`;
    }
    params.push(Math.min(parseInt(limit, 10) || 20, 50));
    sql += ` ORDER BY pn.date DESC, pn.published_at DESC NULLS LAST LIMIT $${params.length}`;

    const { rows } = await db.query(sql, params);
    res.json({ notes: rows });
  } catch (err) {
    console.error('[SAMARBETE] notes error:', err);
    res.status(500).json({ error: 'Kunde inte hämta anteckningar' });
  }
});

module.exports = router;
