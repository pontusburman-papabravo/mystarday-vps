/**
 * Landing news CRUD — reads/writes landing_news table.
 * Owns: all queries for landing news items (admin + public).
 * Does NOT own: landing page rendering (see routes/landing.js).
 */

const db = require('../src/lib/db');

function normalizeArchiveFlags({ is_active, is_archived }) {
  let archived = is_archived === true;
  let active = is_active !== false;
  if (archived) {
    active = false;
  } else if (active) {
    archived = false;
  }
  return { is_active: active, is_archived: archived };
}

// ─── Public (landing page) ──────────────────────────────────

/** Returns active items sorted by sort_order ASC */
async function getActiveItems() {
  const res = await db.query(
    `SELECT id, title, body, image_url, button_text, button_url, sort_order
     FROM landing_news
     WHERE is_active = true AND is_archived = false
     ORDER BY sort_order ASC, created_at ASC`
  );
  return res.rows;
}

/** Archived items for public archive page (newest archived first). */
async function getArchivedItems() {
  const res = await db.query(
    `SELECT id, title, body, title_en, body_en, image_url,
            button_text, button_text_en, button_url,
            archived_at, created_at
     FROM landing_news
     WHERE is_archived = true
     ORDER BY archived_at DESC NULLS LAST, sort_order ASC, created_at DESC`
  );
  return res.rows;
}

// ─── Admin ──────────────────────────────────────────────────

/** Returns all items sorted by sort_order ASC */
async function getAllItems() {
  const res = await db.query(
    `SELECT id, title, body, title_en, body_en, image_url, button_text, button_text_en,
            button_url, sort_order, is_active, is_archived, archived_at, created_at, updated_at
     FROM landing_news
     ORDER BY sort_order ASC, created_at ASC`
  );
  return res.rows;
}

/** Returns a single item by id */
async function getItemById(id) {
  const res = await db.query(
    `SELECT id, title, body, title_en, body_en, image_url, button_text, button_text_en,
            button_url, sort_order, is_active, is_archived, archived_at, created_at, updated_at
     FROM landing_news WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

/** Creates a new item, returns the created row */
async function createItem(fields) {
  const flags = normalizeArchiveFlags(fields);
  const res = await db.query(
    `INSERT INTO landing_news (
       title, body, title_en, body_en, image_url, button_text, button_text_en,
       button_url, sort_order, is_active, is_archived, archived_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
       CASE WHEN $11 THEN NOW() ELSE NULL END,
       NOW())
     RETURNING id, title, body, title_en, body_en, image_url, button_text, button_text_en,
               button_url, sort_order, is_active, is_archived, archived_at, created_at, updated_at`,
    [
      fields.title,
      fields.body || null,
      fields.title_en || null,
      fields.body_en || null,
      fields.image_url || null,
      fields.button_text || 'Läs mer',
      fields.button_text_en || null,
      fields.button_url || null,
      fields.sort_order || 0,
      flags.is_active,
      flags.is_archived,
    ]
  );
  return res.rows[0];
}

/** Updates an existing item, returns the updated row */
async function updateItem(id, fields) {
  const flags = normalizeArchiveFlags(fields);
  const res = await db.query(
    `UPDATE landing_news
     SET title = $2, body = $3, title_en = $4, body_en = $5, image_url = $6,
         button_text = $7, button_text_en = $8, button_url = $9, sort_order = $10,
         is_active = $11, is_archived = $12,
         archived_at = CASE
           WHEN $12 AND archived_at IS NULL THEN NOW()
           WHEN NOT $12 THEN NULL
           ELSE archived_at
         END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, body, title_en, body_en, image_url, button_text, button_text_en,
               button_url, sort_order, is_active, is_archived, archived_at, created_at, updated_at`,
    [
      id,
      fields.title,
      fields.body || null,
      fields.title_en || null,
      fields.body_en || null,
      fields.image_url || null,
      fields.button_text || 'Läs mer',
      fields.button_text_en || null,
      fields.button_url || null,
      fields.sort_order || 0,
      flags.is_active,
      flags.is_archived,
    ]
  );
  return res.rows[0] || null;
}

/** Deletes an item by id */
async function deleteItem(id) {
  const res = await db.query(`DELETE FROM landing_news WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}

/** Batch-update sort_order for multiple items */
async function updateSortOrders(updates) {
  for (const { id, sort_order } of updates) {
    await db.query(`UPDATE landing_news SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      id,
      sort_order,
    ]);
  }
}

module.exports = {
  getActiveItems,
  getArchivedItems,
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  updateSortOrders,
  normalizeArchiveFlags,
};
