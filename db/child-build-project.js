'use strict';

const db = require('../src/lib/db');
const {
  normalizeCustomization,
  DEFAULT_CUSTOMIZATION,
} = require('../src/lib/build-catalog');

async function getCatalog() {
  const r = await db.query(
    `SELECT slug, name, icon, parts_required, season_slug, unlock_label, sort_order,
            description, world_slug, config
     FROM build_project_catalog
     WHERE COALESCE((config->>'deprecated')::boolean, false) = false
     ORDER BY sort_order ASC`
  );
  return r.rows;
}

async function getProjectsForChild(childId) {
  const r = await db.query(
    `SELECT p.id, p.catalog_slug, p.status, p.parts_collected, p.garage_unlocked,
            p.customization, p.created_at, p.updated_at,
            c.name, c.icon, c.parts_required, c.unlock_label
     FROM child_build_project p
     JOIN build_project_catalog c ON c.slug = p.catalog_slug
     WHERE p.child_id = $1
     ORDER BY p.updated_at DESC`,
    [childId]
  );
  return r.rows.map(mapProjectRow);
}

async function getCompletedGarageProject(childId) {
  const r = await db.query(
    `SELECT p.id, p.catalog_slug, p.status, p.parts_collected, p.garage_unlocked,
            p.customization, p.created_at, p.updated_at,
            c.name, c.icon, c.parts_required, c.unlock_label
     FROM child_build_project p
     JOIN build_project_catalog c ON c.slug = p.catalog_slug
     WHERE p.child_id = $1 AND p.status = 'completed' AND p.garage_unlocked = true
     ORDER BY p.updated_at DESC
     LIMIT 1`,
    [childId]
  );
  return r.rows[0] ? mapProjectRow(r.rows[0]) : null;
}

async function ensureDemoCompletedCar(childId) {
  const { ensureBuildCatalog } = require('../src/lib/seed-build-catalog');
  await ensureBuildCatalog();

  const existing = await getCompletedGarageProject(childId);
  if (existing) return existing;

  await db.query(
    `INSERT INTO child_build_project
       (child_id, catalog_slug, status, parts_collected, garage_unlocked, customization)
     VALUES ($1, 'racerbil', 'completed', 6, true, $2::jsonb)
     ON CONFLICT (child_id, catalog_slug) DO UPDATE SET
       status = 'completed',
       parts_collected = 6,
       garage_unlocked = true,
       updated_at = NOW()
     RETURNING id`,
    [childId, JSON.stringify(DEFAULT_CUSTOMIZATION)]
  );
  return getCompletedGarageProject(childId);
}

async function updateCustomization(projectId, childId, patch) {
  const cur = await db.query(
    `SELECT customization FROM child_build_project
     WHERE id = $1 AND child_id = $2 AND status = 'completed'`,
    [projectId, childId]
  );
  if (cur.rows.length === 0) return null;

  const merged = normalizeCustomization({
    ...cur.rows[0].customization,
    ...patch,
  });

  await db.query(
    `UPDATE child_build_project SET customization = $1::jsonb, updated_at = NOW()
     WHERE id = $2 AND child_id = $3`,
    [JSON.stringify(merged), projectId, childId]
  );
  return merged;
}

async function getActiveProject(childId) {
  const r = await db.query(
    `SELECT p.id, p.catalog_slug, p.status, p.parts_collected, p.garage_unlocked,
            p.customization, p.created_at, p.updated_at,
            c.name, c.icon, c.parts_required, c.unlock_label, c.world_slug, c.description, c.config
     FROM child_build_project p
     JOIN build_project_catalog c ON c.slug = p.catalog_slug
     WHERE p.child_id = $1 AND p.status = 'active'
     LIMIT 1`,
    [childId]
  );
  return r.rows[0] ? mapProjectRow(r.rows[0]) : null;
}

async function startProject(childId, catalogSlug) {
  const cat = await db.query(
    `SELECT slug FROM build_project_catalog
     WHERE slug = $1 AND COALESCE((config->>'deprecated')::boolean, false) = false`,
    [catalogSlug]
  );
  if (cat.rows.length === 0) return { error: 'not_found' };

  await db.query(
    `UPDATE child_build_project SET status = 'archived', updated_at = NOW()
     WHERE child_id = $1 AND status = 'active'`,
    [childId]
  );

  const ins = await db.query(
    `INSERT INTO child_build_project
       (child_id, catalog_slug, status, parts_collected, garage_unlocked, customization)
     VALUES ($1, $2, 'active', 0, false, '{}'::jsonb)
     ON CONFLICT (child_id, catalog_slug) DO UPDATE SET
       status = 'active',
       parts_collected = 0,
       garage_unlocked = false,
       customization = '{}'::jsonb,
       updated_at = NOW()
     RETURNING id`,
    [childId, catalogSlug]
  );

  const r = await db.query(
    `SELECT p.id, p.catalog_slug, p.status, p.parts_collected, p.garage_unlocked,
            p.customization, p.created_at, p.updated_at,
            c.name, c.icon, c.parts_required, c.unlock_label, c.world_slug, c.description, c.config
     FROM child_build_project p
     JOIN build_project_catalog c ON c.slug = p.catalog_slug
     WHERE p.id = $1`,
    [ins.rows[0].id]
  );
  return { project: mapProjectRow(r.rows[0]) };
}

async function grantPart(childId, dailyLogItemId) {
  const active = await getActiveProject(childId);
  if (!active) return { error: 'no_active_project' };

  const dup = await db.query(
    `SELECT 1 FROM build_part_grant WHERE child_id = $1 AND daily_log_item_id = $2`,
    [childId, dailyLogItemId]
  );
  if (dup.rows.length > 0) return { error: 'already_granted', project: active };

  const partsRequired = active.parts_required || 6;
  if (active.parts_collected >= partsRequired) {
    return { error: 'project_complete', project: active };
  }

  const newCount = active.parts_collected + 1;
  const completed = newCount >= partsRequired;

  await db.query('BEGIN');
  try {
    await db.query(
      `INSERT INTO build_part_grant (child_id, project_id, daily_log_item_id)
       VALUES ($1, $2, $3)`,
      [childId, active.id, dailyLogItemId]
    );
    await db.query(
      `UPDATE child_build_project SET
         parts_collected = $1,
         status = CASE WHEN $2 THEN 'completed' ELSE status END,
         garage_unlocked = CASE WHEN $2 THEN true ELSE garage_unlocked END,
         updated_at = NOW()
       WHERE id = $3 AND child_id = $4`,
      [newCount, completed, active.id, childId]
    );
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  const r = await db.query(
    `SELECT p.id, p.catalog_slug, p.status, p.parts_collected, p.garage_unlocked,
            p.customization, p.created_at, p.updated_at,
            c.name, c.icon, c.parts_required, c.unlock_label, c.world_slug, c.description, c.config
     FROM child_build_project p
     JOIN build_project_catalog c ON c.slug = p.catalog_slug
     WHERE p.id = $1`,
    [active.id]
  );

  return {
    granted: true,
    completed,
    project: mapProjectRow(r.rows[0]),
    part_number: newCount,
  };
}

function mapProjectRow(row) {
  const partsRequired = row.parts_required || 6;
  const collected = row.parts_collected || 0;
  return {
    id: row.id,
    catalog_slug: row.catalog_slug,
    name: row.name,
    icon: row.icon,
    status: row.status,
    parts_collected: collected,
    parts_required: partsRequired,
    progress_pct: Math.min(100, Math.round((collected / partsRequired) * 100)),
    garage_unlocked: row.garage_unlocked,
    unlock_label: row.unlock_label,
    world_slug: row.world_slug || null,
    description: row.description || null,
    customization: normalizeCustomization(row.customization),
    updated_at: row.updated_at,
  };
}

module.exports = {
  getCatalog,
  getProjectsForChild,
  getActiveProject,
  startProject,
  grantPart,
  getCompletedGarageProject,
  ensureDemoCompletedCar,
  updateCustomization,
};
