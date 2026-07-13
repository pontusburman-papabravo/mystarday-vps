'use strict';

const db = require('./db');
const { deletePrivateObject, uploadPrivateAvatar } = require('./avatar-storage');

async function getChildAvatarRow(childId) {
  const { rows } = await db.query(
    `SELECT id, family_id, avatar_storage_key, avatar_updated_at
     FROM child WHERE id = $1`,
    [childId]
  );
  return rows[0] || null;
}

async function getParentAvatarRow(parentId) {
  const { rows } = await db.query(
    `SELECT id, family_id, avatar_storage_key, avatar_updated_at
     FROM parent WHERE id = $1`,
    [parentId]
  );
  return rows[0] || null;
}

async function setChildAvatar(childId, { buffer, contentType, filename }) {
  const row = await getChildAvatarRow(childId);
  if (!row) return null;

  const oldKey = row.avatar_storage_key;
  const storageKey = await uploadPrivateAvatar({
    buffer,
    contentType,
    filename,
    familyId: row.family_id,
    memberType: 'child',
    memberId: childId,
  });

  const { rows } = await db.query(
    `UPDATE child
     SET avatar_storage_key = $2, avatar_updated_at = NOW(), avatar_url = NULL
     WHERE id = $1
     RETURNING id, name, emoji, avatar_storage_key, avatar_updated_at`,
    [childId, storageKey]
  );

  if (oldKey && oldKey !== storageKey) {
    await deletePrivateObject(oldKey);
  }

  return rows[0] || null;
}

async function clearChildAvatar(childId) {
  const row = await getChildAvatarRow(childId);
  if (!row) return null;

  if (row.avatar_storage_key) {
    await deletePrivateObject(row.avatar_storage_key);
  }

  const { rows } = await db.query(
    `UPDATE child
     SET avatar_storage_key = NULL, avatar_updated_at = NOW(), avatar_url = NULL
     WHERE id = $1
     RETURNING id, name, emoji, avatar_storage_key, avatar_updated_at`,
    [childId]
  );
  return rows[0] || null;
}

async function setParentAvatar(parentId, { buffer, contentType, filename }) {
  const row = await getParentAvatarRow(parentId);
  if (!row) return null;

  const oldKey = row.avatar_storage_key;
  const storageKey = await uploadPrivateAvatar({
    buffer,
    contentType,
    filename,
    familyId: row.family_id,
    memberType: 'parent',
    memberId: parentId,
  });

  const { rows } = await db.query(
    `UPDATE parent
     SET avatar_storage_key = $2, avatar_updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, avatar_storage_key, avatar_updated_at`,
    [parentId, storageKey]
  );

  if (oldKey && oldKey !== storageKey) {
    await deletePrivateObject(oldKey);
  }

  return rows[0] || null;
}

async function clearParentAvatar(parentId) {
  const row = await getParentAvatarRow(parentId);
  if (!row) return null;

  if (row.avatar_storage_key) {
    await deletePrivateObject(row.avatar_storage_key);
  }

  const { rows } = await db.query(
    `UPDATE parent
     SET avatar_storage_key = NULL, avatar_updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, avatar_storage_key, avatar_updated_at`,
    [parentId]
  );
  return rows[0] || null;
}

async function deleteAvatarForChildRecord(childId) {
  const row = await getChildAvatarRow(childId);
  if (!row || !row.avatar_storage_key) return;
  await deletePrivateObject(row.avatar_storage_key);
}

async function deleteAvatarForParentRecord(parentId) {
  const row = await getParentAvatarRow(parentId);
  if (!row || !row.avatar_storage_key) return;
  await deletePrivateObject(row.avatar_storage_key);
}

/**
 * Delete all avatar objects for a family (account deletion / dissolution).
 */
async function deleteAvatarsForFamily(familyId) {
  if (!familyId) return;
  const { rows: childRows } = await db.query(
    `SELECT avatar_storage_key FROM child
     WHERE family_id = $1 AND avatar_storage_key IS NOT NULL`,
    [familyId]
  );
  const { rows: parentRows } = await db.query(
    `SELECT avatar_storage_key FROM parent
     WHERE family_id = $1 AND avatar_storage_key IS NOT NULL`,
    [familyId]
  );
  const keys = new Set();
  for (const row of childRows) keys.add(row.avatar_storage_key);
  for (const row of parentRows) keys.add(row.avatar_storage_key);
  for (const key of keys) {
    await deletePrivateObject(key);
  }
}

module.exports = {
  getChildAvatarRow,
  getParentAvatarRow,
  setChildAvatar,
  clearChildAvatar,
  setParentAvatar,
  clearParentAvatar,
  deleteAvatarForChildRecord,
  deleteAvatarForParentRecord,
  deleteAvatarsForFamily,
};
