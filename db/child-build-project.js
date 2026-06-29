'use strict';

const db = require('../src/lib/db');
const {
  normalizeCustomization,
  DEFAULT_CUSTOMIZATION,
} = require('../src/lib/build-catalog');
const { BUILD_PARTS_REQUIRED } = require('../src/lib/build-adventures');
const {
  milestoneCrossed,
  applyMilestonePerk,
  enrichProject,
} = require('../src/lib/build-progress');

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

async function getCompletedWorldProject(childId, catalogSlug) {
  const r = await db.query(
    `SELECT p.id, p.catalog_slug, p.status, p.parts_collected, p.garage_unlocked,
            p.customization, p.created_at, p.updated_at,
            c.name, c.icon, c.parts_required, c.unlock_label, c.world_slug, c.description, c.config
     FROM child_build_project p
     JOIN build_project_catalog c ON c.slug = p.catalog_slug
     WHERE p.child_id = $1 AND p.catalog_slug = $2
       AND p.status = 'completed' AND p.garage_unlocked = true
     LIMIT 1`,
    [childId, catalogSlug]
  );
  return r.rows[0] ? mapProjectRow(r.rows[0]) : null;
}

async function getCompletedGarageProject(childId) {
  return getCompletedWorldProject(childId, 'racerbil');
}

async function ensureDemoCompletedWorld(childId, catalogSlug) {
  const { ensureBuildCatalog } = require('../src/lib/seed-build-catalog');
  const { normalizePlayCustomization } = require('../src/lib/build-world-play');
  await ensureBuildCatalog();

  const existing = await getCompletedWorldProject(childId, catalogSlug);
  if (existing) return existing;

  const customization = catalogSlug === 'racerbil'
    ? DEFAULT_CUSTOMIZATION
    : normalizePlayCustomization(catalogSlug, {});

  await db.query(
    `INSERT INTO child_build_project
       (child_id, catalog_slug, status, parts_collected, garage_unlocked, customization)
     VALUES ($1, $2, 'completed', $3, true, $4::jsonb)
     ON CONFLICT (child_id, catalog_slug) DO UPDATE SET
       status = 'completed',
       parts_collected = $3,
       garage_unlocked = true,
       customization = $4::jsonb,
       updated_at = NOW()`,
    [childId, catalogSlug, BUILD_PARTS_REQUIRED, JSON.stringify(customization)]
  );
  return getCompletedWorldProject(childId, catalogSlug);
}

async function ensureDemoCompletedCar(childId) {
  return ensureDemoCompletedWorld(childId, 'racerbil');
}

async function updateCustomization(projectId, childId, patch) {
  const cur = await db.query(
    `SELECT p.customization, p.catalog_slug FROM child_build_project p
     WHERE p.id = $1 AND p.child_id = $2 AND p.status = 'completed'`,
    [projectId, childId]
  );
  if (cur.rows.length === 0) return null;

  const slug = cur.rows[0].catalog_slug;
  const { isPlayWorldSlug, normalizePlayCustomization } = require('../src/lib/build-world-play');
  const merged = isPlayWorldSlug(slug)
    ? normalizePlayCustomization(slug, { ...cur.rows[0].customization, ...patch })
    : normalizeCustomization({ ...cur.rows[0].customization, ...patch });

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

  const partsRequired = active.parts_required || BUILD_PARTS_REQUIRED;
  if (active.parts_collected >= partsRequired) {
    return { error: 'project_complete', project: active };
  }

  const prevCount = active.parts_collected;
  const newCount = prevCount + 1;
  const completed = newCount >= partsRequired;
  const milestoneHit = milestoneCrossed(prevCount, newCount);
  let customization = normalizeCustomization(active.customization);
  if (milestoneHit) {
    customization = applyMilestonePerk(customization, active.catalog_slug, milestoneHit);
  }

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
         customization = $2::jsonb,
         status = CASE WHEN $3 THEN 'completed' ELSE status END,
         garage_unlocked = CASE WHEN $3 THEN true ELSE garage_unlocked END,
         updated_at = NOW()
       WHERE id = $4 AND child_id = $5`,
      [newCount, JSON.stringify(customization), completed, active.id, childId]
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

  const project = enrichProject(mapProjectRow(r.rows[0]));
  return {
    granted: true,
    completed,
    milestone_hit: milestoneHit,
    project,
    part_number: newCount,
  };
}

function mapProjectRow(row) {
  const { isPlayWorldSlug, normalizePlayCustomization } = require('../src/lib/build-world-play');
  const partsRequired = row.parts_required || BUILD_PARTS_REQUIRED;
  const collected = row.parts_collected || 0;
  const customization = isPlayWorldSlug(row.catalog_slug)
    ? normalizePlayCustomization(row.catalog_slug, row.customization)
    : normalizeCustomization(row.customization);
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
    customization: customization,
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
  getCompletedWorldProject,
  ensureDemoCompletedCar,
  ensureDemoCompletedWorld,
  updateCustomization,
};
