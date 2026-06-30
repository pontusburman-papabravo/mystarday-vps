'use strict';

const db = require('../src/lib/db');

function q(client) {
  if (!client) return db;
  if (typeof client === 'function') return { query: client };
  return client;
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    ...row,
    state_data: typeof row.state_data === 'string'
      ? JSON.parse(row.state_data)
      : (row.state_data || {}),
  };
}

async function createInstance({
  childId,
  familyId,
  worldSlug,
  archetypeId,
  slotId = 'default',
  stateKey,
  stateData = {},
}, client) {
  const query = q(client);
  const result = await query.query(
    `INSERT INTO living_object_instance
       (child_id, family_id, world_slug, archetype_id, slot_id, state_key, state_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [childId, familyId, worldSlug, archetypeId, slotId, stateKey, JSON.stringify(stateData)]
  );
  return normalizeRow(result.rows[0]);
}

async function getById(instanceId, client) {
  const query = q(client);
  const result = await query.query(
    `SELECT * FROM living_object_instance WHERE id = $1`,
    [instanceId]
  );
  return normalizeRow(result.rows[0] || null);
}

async function getBySlot(childId, worldSlug, slotId = 'default', client) {
  const query = q(client);
  const result = await query.query(
    `SELECT * FROM living_object_instance
     WHERE child_id = $1 AND world_slug = $2 AND slot_id = $3`,
    [childId, worldSlug, slotId]
  );
  return normalizeRow(result.rows[0] || null);
}

async function listByChild(childId, worldSlug = null, client) {
  const query = q(client);
  const params = [childId];
  let sql = `SELECT * FROM living_object_instance WHERE child_id = $1`;
  if (worldSlug) {
    params.push(worldSlug);
    sql += ` AND world_slug = $2`;
  }
  sql += ' ORDER BY created_at ASC';
  const result = await query.query(sql, params);
  return result.rows.map(normalizeRow);
}

async function updateState({
  instanceId,
  expectedVersion,
  stateKey,
  stateData,
}, client) {
  const query = q(client);
  const result = await query.query(
    `UPDATE living_object_instance
     SET state_key = $1,
         state_data = $2,
         version = version + 1,
         updated_at = now()
     WHERE id = $3 AND version = $4
     RETURNING *`,
    [stateKey, JSON.stringify(stateData), instanceId, expectedVersion]
  );
  if (!result.rows[0]) {
    return { updated: false, conflict: true, row: null };
  }
  return { updated: true, conflict: false, row: normalizeRow(result.rows[0]) };
}

async function deleteInstance(instanceId, client) {
  const query = q(client);
  const result = await query.query(
    `DELETE FROM living_object_instance WHERE id = $1 RETURNING id`,
    [instanceId]
  );
  return result.rows.length > 0;
}

module.exports = {
  createInstance,
  getById,
  getBySlot,
  listByChild,
  updateState,
  deleteInstance,
};
