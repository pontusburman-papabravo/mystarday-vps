// Schedule and activity management: standard activity templates, default schedules, retention analytics.
// Owns: default_activity_template, default_schedule, default_schedule_item, retention metrics.
// Does NOT own: families (see family.js), rewards (see reward.js), system config (see system.js).

const express = require('express');
const db = require('../../lib/db');
const { notifyLibraryUpdate } = require('../../lib/library-notifications');

const router = express.Router();

// ─── GET /api/admin/default-templates ─────────────────────
// Returns all default activities as a flat list (no categories, no grouping).
router.get('/default-templates', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM default_activity_template ORDER BY sort_order ASC, name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[ADMIN] List default templates error:', err);
    res.status(500).json({ error: 'Kunde inte hämta aktiviteter' });
  }
});

// ─── POST /api/admin/default-templates ────────────────────
// Creates a new default activity (flat list, no categories).
router.post('/default-templates', async (req, res) => {
  try {
    const { name, icon, star_value, sort_order, sub_steps } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Namn krävs' });
    }
    const stars = parseInt(star_value, 10) || 1;
    const sort = parseInt(sort_order, 10) || 0;
    const subStepsJson = JSON.stringify(Array.isArray(sub_steps) ? sub_steps : []);

    const result = await db.query(
      `INSERT INTO default_activity_template (name, icon, star_value, sort_order, sub_steps)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), icon || '📌', stars, sort, subStepsJson]
    );
    notifyLibraryUpdate('activity', `Ny aktivitet: ${result.rows[0].icon} ${result.rows[0].name} tillagd`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ADMIN] Create default template error:', err);
    res.status(500).json({ error: 'Kunde inte skapa standardaktivitet' });
  }
});

// ─── PUT /api/admin/default-templates/reorder ─────────────
// IMPORTANT: This route MUST be defined before /:id to avoid Express matching "reorder" as a UUID
router.put('/default-templates/reorder', async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, sort_order }' });
    }
    for (const item of order) {
      if (!item.id || typeof item.sort_order !== 'number') continue;
      await db.query(
        'UPDATE default_activity_template SET sort_order = $1 WHERE id = $2',
        [item.sort_order, item.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN] Default templates reorder error:', err);
    res.status(500).json({ error: 'Kunde inte ändra ordning' });
  }
});

// ─── PUT /api/admin/default-templates/:id ─────────────────
// Updates a default activity (flat list, no categories).
router.put('/default-templates/:id', async (req, res) => {
  try {
    const { name, icon, star_value, sort_order, sub_steps } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(icon); }
    if (star_value !== undefined) { updates.push(`star_value = $${idx++}`); values.push(parseInt(star_value, 10) || 1); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(parseInt(sort_order, 10) || 0); }
    if (sub_steps !== undefined) {
      updates.push(`sub_steps = $${idx++}`); values.push(JSON.stringify(Array.isArray(sub_steps) ? sub_steps : []));
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE default_activity_template SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    notifyLibraryUpdate('activity', `Aktivitet uppdaterad: ${result.rows[0].icon} ${result.rows[0].name}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ADMIN] Update default template error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera standardaktivitet' });
  }
});

// ─── DELETE /api/admin/default-templates/:id ──────────────
router.delete('/default-templates/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM default_activity_template WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    notifyLibraryUpdate('activity', 'En aktivitet togs bort från standardbiblioteket');
    res.json({ message: 'Standardaktivitet borttagen' });
  } catch (err) {
    console.error('[ADMIN] Delete default template error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort standardaktivitet' });
  }
});

// ─── DEFAULT SCHEDULES LIBRARY ──────────────────────────
// Admin CRUD for standard schedules (templates parents can copy to their children)

// GET /api/admin/default-schedules
router.get('/default-schedules', async (req, res) => {
  try {
    const schedules = await db.query(
      `SELECT ds.id, ds.name, ds.description, ds.icon, ds.sort_order, ds.updated_at,
              COUNT(dsi.id) AS item_count
       FROM default_schedule ds
       LEFT JOIN default_schedule_item dsi ON dsi.default_schedule_id = ds.id
       GROUP BY ds.id, ds.name, ds.description, ds.icon, ds.sort_order, ds.updated_at
       ORDER BY ds.sort_order ASC`
    );
    res.json(schedules.rows);
  } catch (err) {
    console.error('[ADMIN] List default schedules error:', err);
    res.status(500).json({ error: 'Kunde inte hämta standardscheman' });
  }
});

// GET /api/admin/default-schedules/:id — single schedule with items
router.get('/default-schedules/:id', async (req, res) => {
  try {
    const schedule = await db.query(
      `SELECT id, name, description, icon, sort_order FROM default_schedule WHERE id = $1`,
      [req.params.id]
    );
    if (schedule.rows.length === 0) return res.status(404).json({ error: 'Schemat hittades inte' });

    const items = await db.query(
      `SELECT id, name, icon, section, star_value, start_time, end_time, sort_order, sub_steps,
              default_activity_template_id
       FROM default_schedule_item
       WHERE default_schedule_id = $1
       ORDER BY CASE section WHEN 'morgon' THEN 0 WHEN 'dag' THEN 1 WHEN 'kvall' THEN 2 ELSE 3 END, sort_order ASC`,
      [req.params.id]
    );

    res.json({ ...schedule.rows[0], items: items.rows });
  } catch (err) {
    console.error('[ADMIN] Get default schedule error:', err);
    res.status(500).json({ error: 'Kunde inte hämta schemat' });
  }
});

// POST /api/admin/default-schedules
router.post('/default-schedules', async (req, res) => {
  try {
    const { name, description, icon, sort_order } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Namn krävs' });

    const result = await db.query(
      `INSERT INTO default_schedule (name, description, icon, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description || null, icon || '📋', parseInt(sort_order, 10) || 0]
    );
    notifyLibraryUpdate('schedule', `Nytt schema: ${result.rows[0].icon} ${result.rows[0].name} tillagt`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ADMIN] Create default schedule error:', err);
    res.status(500).json({ error: 'Kunde inte skapa standardschema' });
  }
});

// PUT /api/admin/default-schedules/:id
router.put('/default-schedules/:id', async (req, res) => {
  try {
    const { name, description, icon, sort_order } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(icon); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(parseInt(sort_order, 10) || 0); }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });
    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE default_schedule SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schemat hittades inte' });
    notifyLibraryUpdate('schedule', `Schema uppdaterat: ${result.rows[0].icon} ${result.rows[0].name}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ADMIN] Update default schedule error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera schemat' });
  }
});

// DELETE /api/admin/default-schedules/:id
router.delete('/default-schedules/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM default_schedule WHERE id = $1 RETURNING id, name, icon',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schemat hittades inte' });
    notifyLibraryUpdate('schedule', `Schema borttaget: ${result.rows[0].icon} ${result.rows[0].name}`);
    res.json({ message: 'Standardschema borttaget' });
  } catch (err) {
    console.error('[ADMIN] Delete default schedule error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort schemat' });
  }
});

// POST /api/admin/default-schedules/:id/items — add item to schedule
router.post('/default-schedules/:id/items', async (req, res) => {
  try {
    const { name, icon, section, star_value, start_time, end_time, sort_order, sub_steps, default_activity_template_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Namn krävs' });

    const result = await db.query(
      `INSERT INTO default_schedule_item
         (default_schedule_id, default_activity_template_id, name, icon, section, star_value, start_time, end_time, sort_order, sub_steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.params.id, default_activity_template_id || null,
        name.trim(), icon || null, section || 'dag',
        parseInt(star_value, 10) || 1,
        start_time || null, end_time || null,
        parseInt(sort_order, 10) || 0,
        JSON.stringify(sub_steps || []),
      ]
    );
    notifyLibraryUpdate('schedule', `Aktivitet tillagd i schema: ${result.rows[0].icon || '📌'} ${result.rows[0].name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ADMIN] Add schedule item error:', err);
    res.status(500).json({ error: 'Kunde inte lägga till aktivitet i schemat' });
  }
});

// PUT /api/admin/default-schedules/:id/items/:itemId
router.put('/default-schedules/:id/items/:itemId', async (req, res) => {
  try {
    const { name, icon, section, star_value, start_time, end_time, sort_order, sub_steps } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (icon !== undefined) { updates.push(`icon = $${idx++}`); values.push(icon); }
    if (section !== undefined) { updates.push(`section = $${idx++}`); values.push(section); }
    if (star_value !== undefined) { updates.push(`star_value = $${idx++}`); values.push(parseInt(star_value, 10) || 1); }
    if (start_time !== undefined) { updates.push(`start_time = $${idx++}`); values.push(start_time || null); }
    if (end_time !== undefined) { updates.push(`end_time = $${idx++}`); values.push(end_time || null); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(parseInt(sort_order, 10) || 0); }
    if (sub_steps !== undefined) { updates.push(`sub_steps = $${idx++}`); values.push(JSON.stringify(sub_steps)); }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });
    values.push(req.params.itemId, req.params.id);

    const result = await db.query(
      `UPDATE default_schedule_item SET ${updates.join(', ')} WHERE id = $${idx} AND default_schedule_id = $${idx + 1} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    notifyLibraryUpdate('schedule', `Schemaaktivitet uppdaterad: ${result.rows[0].icon || '📌'} ${result.rows[0].name}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ADMIN] Update schedule item error:', err);
    res.status(500).json({ error: 'Kunde inte uppdatera aktiviteten' });
  }
});

// DELETE /api/admin/default-schedules/:id/items/:itemId
router.delete('/default-schedules/:id/items/:itemId', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM default_schedule_item WHERE id = $1 AND default_schedule_id = $2 RETURNING id',
      [req.params.itemId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    notifyLibraryUpdate('schedule', 'En aktivitet togs bort från ett standardschema');
    res.json({ message: 'Aktiviteten borttagen från schemat' });
  } catch (err) {
    console.error('[ADMIN] Delete schedule item error:', err);
    res.status(500).json({ error: 'Kunde inte ta bort aktiviteten' });
  }
});

// ─── GET /api/admin/retention ────────────────────────────
// Returns all families sorted by churn risk (most inactive first).
// Health status: Aktiv (<24h), Varnande (24-72h), Risk (>72h or never).
router.get('/retention', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        f.id AS family_id,
        COALESCE(f.name, 'Namnlös familj') AS family_name,
        GREATEST(MAX(dli.completed_at), MAX(le.occurred_at)) AS last_activity,
        COUNT(dli.id) FILTER (
          WHERE dli.completed = true
            AND dli.completed_at >= NOW() - INTERVAL '7 days'
        ) AS activity_index
      FROM family f
      LEFT JOIN child c ON c.family_id = f.id
      LEFT JOIN daily_log dl ON dl.child_id = c.id
      LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id AND dli.completed = true
      LEFT JOIN login_event le ON le.family_id = f.id
      WHERE f.archived_at IS NULL
      GROUP BY f.id, f.name
      ORDER BY last_activity ASC NULLS FIRST
    `);

    const now = Date.now();
    const H24 = 24 * 60 * 60 * 1000;
    const H72 = 72 * 60 * 60 * 1000;

    const families = result.rows.map(row => {
      const lastActivity = row.last_activity ? new Date(row.last_activity) : null;
      const diffMs = lastActivity ? (now - lastActivity.getTime()) : Infinity;
      let status;
      if (!lastActivity || diffMs > H72) status = 'red';
      else if (diffMs > H24) status = 'yellow';
      else status = 'green';

      return {
        family_id: row.family_id,
        family_name: row.family_name,
        last_activity: lastActivity ? lastActivity.toISOString() : null,
        activity_index: parseInt(row.activity_index, 10),
        status,
      };
    });

    // Sort: red first, then yellow, then green (NULLS FIRST already handles no-activity)
    const statusOrder = { red: 0, yellow: 1, green: 2 };
    families.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    res.json(families);
  } catch (err) {
    console.error('[ADMIN] Retention error:', err);
    res.status(500).json({ error: 'Kunde inte hämta retention-data' });
  }
});

// ─── GET /api/admin/retention/export ─────────────────────
// Returns CSV download of retention data for churn outreach.
router.get('/retention/export', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        f.id AS family_id,
        COALESCE(f.name, 'Namnlös familj') AS family_name,
        f.created_at AS registered_at,
        MIN(p.email) AS email,
        GREATEST(MAX(dli.completed_at), MAX(le.occurred_at)) AS last_activity,
        COUNT(DISTINCT c.id) AS child_count,
        COUNT(dli.id) FILTER (
          WHERE dli.completed = true
            AND dli.completed_at >= NOW() - INTERVAL '7 days'
        ) AS activity_index
      FROM family f
      LEFT JOIN parent p ON p.family_id = f.id AND p.is_admin = false
      LEFT JOIN child c ON c.family_id = f.id
      LEFT JOIN daily_log dl ON dl.child_id = c.id
      LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id AND dli.completed = true
      LEFT JOIN login_event le ON le.family_id = f.id
      WHERE f.archived_at IS NULL
      GROUP BY f.id, f.name, f.created_at
      ORDER BY last_activity ASC NULLS FIRST
    `);

    const now = Date.now();
    const H24 = 24 * 60 * 60 * 1000;
    const H72 = 72 * 60 * 60 * 1000;

    const families = result.rows.map(row => {
      const lastActivity = row.last_activity ? new Date(row.last_activity) : null;
      const diffMs = lastActivity ? (now - lastActivity.getTime()) : Infinity;
      let status;
      if (!lastActivity || diffMs > H72) status = 'Röd';
      else if (diffMs > H24) status = 'Gul';
      else status = 'Grön';
      const statusOrder = { 'Röd': 0, 'Gul': 1, 'Grön': 2 };
      return {
        family_name: row.family_name,
        email: row.email || '',
        status,
        statusOrder: statusOrder[status],
        last_activity: lastActivity ? lastActivity.toISOString().replace('T', ' ').slice(0, 19) : '',
        activity_index: parseInt(row.activity_index, 10),
        child_count: parseInt(row.child_count, 10),
        registered_at: new Date(row.registered_at).toISOString().slice(0, 10),
      };
    });

    // Sort: Röd → Gul → Grön
    families.sort((a, b) => a.statusOrder - b.statusOrder);

    // Build CSV — quote fields to handle commas/special chars
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['Familjenamn', 'E-post', 'Status', 'Senaste inloggning', 'Aktivitetsindex (7d)', 'Antal barn', 'Registreringsdatum'];
    const rows = families.map(f => [
      escape(f.family_name),
      escape(f.email),
      escape(f.status),
      escape(f.last_activity),
      escape(f.activity_index),
      escape(f.child_count),
      escape(f.registered_at),
    ].join(','));

    const csv = [header.join(','), ...rows].join('\r\n');
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="retention-export-${date}.csv"`);
    // UTF-8 BOM so Excel opens Swedish characters correctly
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('[ADMIN] Retention export error:', err);
    res.status(500).json({ error: 'Kunde inte exportera retention-data' });
  }
});

// ─── GET /api/admin/stats/templates ──────────────────────
// Returns usage count of each standard template group (by schema_type on
// activity_template rows that are linked to weekly_schedule_items).
router.get('/stats/templates', async (req, res) => {
  try {
    // Count how many weekly_schedule_item rows link to activity_templates
    // that have a schema_type — these were copied from a standard group.
    const usageResult = await db.query(`
      SELECT
        at.schema_type AS template_key,
        COUNT(wsi.id) AS usage_count
      FROM weekly_schedule_item wsi
      JOIN activity_template at ON at.id = wsi.activity_template_id
      WHERE at.schema_type IS NOT NULL AND at.schema_type != ''
      GROUP BY at.schema_type
      ORDER BY usage_count DESC
    `);

    // All known template groups (from standard library)
    const ALL_GROUPS = [
      { key: 'forskola', name: 'Förskola' },
      { key: 'skola',    name: 'Skola' },
      { key: 'morgon',   name: 'Morgon' },
      { key: 'dag',      name: 'Dag' },
      { key: 'kvall',    name: 'Kväll' },
      { key: 'helg',     name: 'Helg' },
    ];

    const usageMap = {};
    for (const row of usageResult.rows) {
      usageMap[row.template_key] = parseInt(row.usage_count, 10);
    }

    const templates = ALL_GROUPS.map(g => ({
      key: g.key,
      name: g.name,
      usage_count: usageMap[g.key] || 0,
    })).sort((a, b) => b.usage_count - a.usage_count);

    const used = templates.filter(t => t.usage_count > 0).slice(0, 10);
    const unused = templates.filter(t => t.usage_count === 0);

    res.json({ used, unused });
  } catch (err) {
    console.error('[ADMIN] Template stats error:', err);
    res.status(500).json({ error: 'Kunde inte hämta mallstatistik' });
  }
});

module.exports = router;
