/**
 * Lock published pedagog notes after their calendar day (§4.4.5).
 */

const db = require('./db');

async function lockPublishedNotesPastDate() {
  const { rowCount } = await db.query(`
    UPDATE pedagog_notes pn
    SET note_status = 'locked',
        updated_at = NOW()
    FROM child c
    JOIN family f ON f.id = c.family_id
    WHERE pn.child_id = c.id
      AND pn.note_status = 'published'
      AND pn.date < (NOW() AT TIME ZONE COALESCE(f.timezone, 'Europe/Stockholm'))::date
  `);
  return rowCount || 0;
}

module.exports = { lockPublishedNotesPastDate };
