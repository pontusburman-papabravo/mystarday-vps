'use strict';

const db = require('../src/lib/db');
const { formatStoryEvent } = require('../src/lib/family-story-format');

/**
 * Get family hall read model (projects, chest, story events).
 */
async function getFamilyHall(familyId, options) {
  options = options || {};
  const [projectsRes, chestRes, eventsRes, familyRes] = await Promise.all([
    db.query(
      `SELECT id, title, emoji, target_value, current_value, status, created_at, updated_at
       FROM family_project
       WHERE family_id = $1 AND status != 'archived'
       ORDER BY status ASC, created_at DESC`,
      [familyId]
    ),
    db.query(
      `SELECT total_stars, updated_at FROM family_chest WHERE family_id = $1`,
      [familyId]
    ),
    db.query(
      `SELECT fe.id, fe.type, fe.payload, fe.child_id, fe.created_at,
              c.name AS child_name
       FROM family_event fe
       LEFT JOIN child c ON c.id = fe.child_id
       WHERE fe.family_id = $1
       ORDER BY fe.created_at DESC
       LIMIT 50`,
      [familyId]
    ),
    db.query(
      'SELECT id, name, family_chest_enabled FROM family WHERE id = $1',
      [familyId]
    ),
  ]);

  const chestEnabled = familyRes.rows[0]?.family_chest_enabled !== false;

  let persons = null;
  if (options.includePersons) {
    const [parentsRes, siblingsRes] = await Promise.all([
      db.query(
        `SELECT DISTINCT p.name
         FROM parent p
         WHERE p.family_id = $1
         ORDER BY p.created_at ASC`,
        [familyId]
      ),
      db.query(
        `SELECT id, name, emoji FROM child
         WHERE family_id = $1${options.childId ? ' AND id != $2' : ''}
         ORDER BY sort_order ASC, created_at ASC`,
        options.childId ? [familyId, options.childId] : [familyId]
      ),
    ]);
    persons = {
      parents: parentsRes.rows.map((p) => ({ name: p.name, emoji: p.emoji || '👤' })),
      siblings: siblingsRes.rows.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji || '⭐' })),
    };
  }

  const projectIds = projectsRes.rows.map((p) => p.id);
  let contributorsByProject = {};
  if (projectIds.length > 0) {
    const contribRes = await db.query(
      `SELECT fe.payload->>'childId' AS child_id,
              COALESCE(fe.payload->>'childName', c.name, 'Barn') AS child_name,
              COUNT(*)::int AS contributions
       FROM family_event fe
       LEFT JOIN child c ON c.id = fe.child_id
       WHERE fe.family_id = $1
         AND fe.type = 'activity_contribution'
       GROUP BY fe.payload->>'childId', COALESCE(fe.payload->>'childName', c.name, 'Barn')`,
      [familyId]
    );
    contributorsByProject = { _all: contribRes.rows };
  }

  return {
    familyId,
    familyName: familyRes.rows[0]?.name || null,
    projects: projectsRes.rows.map((p) => ({
      id: p.id,
      title: p.title,
      emoji: p.emoji,
      targetValue: p.target_value,
      currentValue: p.current_value,
      status: p.status,
      contributors: (contributorsByProject._all || []).map((c) => ({
        childId: c.child_id,
        name: c.child_name,
        contributions: c.contributions,
      })),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    chestEnabled,
    chest: chestEnabled ? (chestRes.rows[0]?.total_stars ?? 0) : null,
    chestUpdatedAt: chestEnabled ? (chestRes.rows[0]?.updated_at ?? null) : null,
    story: eventsRes.rows.map(formatStoryEvent),
    persons,
  };
}

async function createProject(familyId, { title, emoji, targetValue }) {
  const result = await db.query(
    `INSERT INTO family_project (family_id, title, emoji, target_value)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, emoji, target_value, current_value, status, created_at`,
    [familyId, title, emoji || '🎯', targetValue || 100]
  );
  return result.rows[0];
}

async function listProjects(familyId) {
  const result = await db.query(
    `SELECT id, title, emoji, target_value, current_value, status
     FROM family_project WHERE family_id = $1 AND status != 'archived'
     ORDER BY created_at DESC`,
    [familyId]
  );
  return result.rows;
}

async function isFamilyChestEnabled(familyId) {
  const result = await db.query(
    'SELECT family_chest_enabled FROM family WHERE id = $1',
    [familyId]
  );
  return result.rows[0]?.family_chest_enabled !== false;
}

module.exports = {
  getFamilyHall,
  createProject,
  listProjects,
  isFamilyChestEnabled,
};
