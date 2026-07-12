'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { extractStorageKeyFromLegacyUrl } = require('../migrations/1810000000000_family_avatar_private_storage.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

describe('family avatar v1 — migration helpers', () => {
  it('extracts legacy /uploads/avatars key', () => {
    const key = extractStorageKeyFromLegacyUrl('https://example.com/uploads/avatars/foo.jpg');
    assert.equal(key, 'avatars/foo.jpg');
  });

  it('extracts avatars-private key from path', () => {
    const key = extractStorageKeyFromLegacyUrl('/uploads/avatars-private/fam/child/x.jpg');
    assert.equal(key, 'avatars-private/fam/child/x.jpg');
  });
});

describe('family avatar v1 — member-avatar priority', () => {
  it('member-avatar.js defines initials fallback', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/member-avatar.js'), 'utf8');
    assert.match(src, /computeInitials/);
    assert.match(src, /kind: 'initials'/);
    assert.match(src, /has_avatar/);
  });
});

describe('family avatar v1 — ADR', () => {
  it('documents authenticated proxy decision', () => {
    const adr = fs.readFileSync(path.join(__dirname, '../docs/adr/ADR-016-family-avatar-storage.md'), 'utf8');
    assert.match(adr, /autentiserad bildproxy/i);
    assert.match(adr, /Pedagog/);
  });
});

test('avatars GET: cross-family returns 404', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyA = await registerAndLogin(http.baseUrl, { name: 'Avatar A Parent' });
    const familyB = await registerAndLogin(http.baseUrl, { name: 'Avatar B Parent' });

    const childId = await createChild(http.baseUrl, familyA, { name: 'Barn A', emoji: '⭐', pin: '8642' });
    const child = { id: childId };

    await db.query(
      `UPDATE child SET avatar_storage_key = $2, avatar_updated_at = NOW()
       WHERE id = $1`,
      [child.id, 'avatars-private/test/fake.jpg']
    );

    const res = await fetch(`${http.baseUrl}/api/avatars/child/${child.id}`, {
      headers: { Cookie: cookieHeader(familyB.cookies) },
    });
    assert.equal(res.status, 404);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('avatar-authz: pedagog sees linked child only', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { canViewMemberAvatar } = require('../src/lib/avatar-authz');
  const { registerAndLogin } = require('./helpers/auth-session.js');
  const { listenApp } = require('./helpers/http.js');
  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const primary = await registerAndLogin(http.baseUrl);
    const familyId = (await db.query(
      'SELECT family_id FROM parent WHERE LOWER(email) = $1',
      [primary.email.toLowerCase()]
    )).rows[0].family_id;

    const childA = (await db.query(
      `INSERT INTO child (family_id, name, emoji) VALUES ($1, 'A', '⭐') RETURNING id`,
      [familyId]
    )).rows[0].id;
    const childB = (await db.query(
      `INSERT INTO child (family_id, name, emoji) VALUES ($1, 'B', '⭐') RETURNING id`,
      [familyId]
    )).rows[0].id;

    const pedagogId = (await db.query(
      `INSERT INTO parent (family_id, email, password_hash, name, verified, family_role, onboarding_completed)
       VALUES ($1, 'ped@test.local', 'x', 'Ped', true, 'pedagog', true) RETURNING id`,
      [familyId]
    )).rows[0].id;

    await db.query(
      `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'pedagog')`,
      [pedagogId, childA]
    );

    const primaryId = (await db.query(
      'SELECT id FROM parent WHERE LOWER(email) = $1',
      [primary.email.toLowerCase()]
    )).rows[0].id;

    const viewer = { type: 'parent', id: pedagogId, familyId };
    assert.equal(await canViewMemberAvatar(viewer, 'child', childA), true);
    assert.equal(await canViewMemberAvatar(viewer, 'child', childB), false);
    assert.equal(await canViewMemberAvatar(viewer, 'parent', primaryId), true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('DELETE child avatar clears storage key', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Delete Avatar Kid', emoji: '⭐', pin: '8642' });
    const child = { id: childId };

    await db.query(
      `UPDATE child SET avatar_storage_key = $2, avatar_updated_at = NOW() WHERE id = $1`,
      [child.id, 'avatars-private/local-test/delete-me.jpg']
    );

    const del = await fetch(`${http.baseUrl}/api/children/${child.id}/avatar`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    const delText = await del.text();
    assert.equal(del.status, 200, delText);
    const body = JSON.parse(delText);
    assert.equal(body.has_avatar, false);

    const row = await db.query('SELECT avatar_storage_key FROM child WHERE id = $1', [child.id]);
    assert.equal(row.rows[0].avatar_storage_key, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
