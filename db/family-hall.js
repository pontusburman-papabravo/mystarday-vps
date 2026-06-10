'use strict';

const db = require('../src/lib/db');
const { formatStoryEvent } = require('../src/lib/family-story-format');

/**
 * Get family hall read model (projects, chest, story events).
 */
async function getFamilyHall(familyId) {
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
    db.query('SELECT id, name FROM family WHERE id = $1', [familyId]),
  ]);

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
    chest: chestRes.rows[0]?.total_stars ?? 0,
    chestUpdatedAt: chestRes.rows[0]?.updated_at ?? null,
    story: eventsRes.rows.map(formatStoryEvent),
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

module.exports = {
  getFamilyHall,
  createProject,
  listProjects,
};
