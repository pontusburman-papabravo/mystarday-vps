/**
 * Admin API: landing news management.
 * Owns: CRUD for landing_news table.
 * Does NOT own: public landing page rendering (see routes/landing.js).
 */

const express = require('express');
const { requireAdmin } = require('../../middleware/auth');
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  updateSortOrders,
} = require('../../../db/landing-news');

const router = express.Router();
router.use(requireAdmin);

// ─── GET /api/admin/landing-news ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const items = await getAllItems();
    res.json(items);
  } catch (err) {
    console.error('[ADMIN/landing-news] GET error:', err);
    res.status(500).json({ error: 'Kunde inte hämta nyheter' });
  }
});

// ─── GET /api/admin/landing-news/:id ─────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const item = await getItemById(parseInt(req.params.id, 10));
    if (!item) return res.status(404).json({ error: 'Hittades inte' });
    res.json(item);
  } catch (err) {
    console.error('[ADMIN/landing-news] GET/:id error:', err);
    res.status(500).json({ error: 'Kunde inte hämta nyhet' });
  }
});

// ─── POST /api/admin/landing-news ────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, body, image_url, button_text, button_url, sort_order, is_active,
      title_en, body_en, button_text_en, is_archived } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Titel krävs' });
    }
    const item = await createItem({
      title: title.trim(),
      body: body?.trim() || null,
      title_en: title_en?.trim() || null,
      body_en: body_en?.trim() || null,
      image_url: image_url?.trim() || null,
      button_text: button_text?.trim() || 'Läs mer',
      button_text_en: button_text_en?.trim() || null,
      button_url: button_url?.trim() || null,
      sort_order: typeof sort_order === 'number' ? sort_order : 0,
      is_active: is_active !== false,
      is_archived: is_archived === true,
    });
    res.status(201).json(item);
  } catch (err) {
    console.error('[ADMIN/landing-news] POST error:', err);
    res.status(500).json({ error: 'Kunde inte skapa nyhet' });
  }
});

// ─── PUT /api/admin/landing-news/:id ─────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await getItemById(id);
    if (!existing) return res.status(404).json({ error: 'Hittades inte' });

    const { title, body, image_url, button_text, button_url, sort_order, is_active,
      title_en, body_en, button_text_en, is_archived } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Titel krävs' });
    }

    const item = await updateItem(id, {
      title: title.trim(),
      body: body?.trim() || null,
      title_en: title_en?.trim() || null,
      body_en: body_en?.trim() || null,
      image_url: image_url?.trim() || null,
      button_text: button_text?.trim() || 'Läs mer',
      button_text_en: button_text_en?.trim() || null,
      button_url: button_url?.trim() || null,
      sort_order: typeof sort_order === 'number' ? sort_order : existing.sort_order,
      is_active: typeof is_active === 'boolean' ? is_active : existing.is_active,
      is_archived: typeof is_archived === 'boolean' ? is_archived : existing.is_archived,
    });
    res.json(item);
  } catch (err) {
    console.error('[ADMIN/landing-news] PUT error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera nyhet' });
  }
});

// ─── DELETE /api/admin/landing-news/:id ──────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deleteItem(id);
    if (!deleted) return res.status(404).json({ error: 'Hittades inte' });
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN/landing-news] DELETE error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort nyhet' });
  }
});

// ─── PATCH /api/admin/landing-news/reorder ───────────────────
// Body: { updates: [{ id, sort_order }, ...] }
router.patch('/reorder', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }
    await updateSortOrders(updates);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN/landing-news] PATCH/reorder error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera ordning' });
  }
});

module.exports = router;