'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
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

describe('family avatar v1 — settings magic group', () => {
  it('tags settingsAvatarSection for Profil & konto group', () => {
    const hubs = fs.readFileSync(path.join(__dirname, '../public/js/parent-magic-page-hubs.js'), 'utf8');
    assert.match(hubs, /tagChild\('settingsAvatarSection',\s*'profile'\)/);
    assert.match(hubs, /restoreGroup/);
    assert.match(hubs, /if \(restoreGroup\)/);
  });
});

describe('family avatar v1 — lifecycle cleanup', () => {
  it('delete-account route calls deleteAvatarsForFamily', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/routes/family/account.js'), 'utf8');
    assert.match(src, /deleteAvatarsForFamily/);
  });
});

describe('family avatar v1 — crop modal a11y', () => {
  it('supports escape, focus restore, and help text', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/avatar-image-crop.js'), 'utf8');
    assert.match(src, /Escape/);
    assert.match(src, /previousFocus/);
    assert.match(src, /avatarCropHelp/);
    assert.match(src, /avatarCropCancelBtn/);
  });

  it('uses square crop region to avoid aspect distortion', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/avatar-image-crop.js'), 'utf8');
    assert.match(src, /sw: side \/ s/);
    assert.match(src, /sh: side \/ s/);
    assert.match(src, /scheduleLayout/);
    assert.match(src, /imageOrientation: 'from-image'/);
  });
});

describe('family avatar v1 — cache & error policy', () => {
  it('avatar route uses no-cache revalidation and Vary Cookie', () => {
    const { AVATAR_CACHE_CONTROL } = require('../src/routes/avatars');
    assert.match(AVATAR_CACHE_CONTROL, /no-cache/);
    assert.match(AVATAR_CACHE_CONTROL, /must-revalidate/);
    const src = fs.readFileSync(path.join(__dirname, '../src/routes/avatars.js'), 'utf8');
    assert.match(src, /Vary.*Cookie/);
    const authzIdx = src.indexOf('canViewMemberAvatar');
    const etagIdx = src.indexOf('if-none-match');
    assert.ok(authzIdx >= 0 && etagIdx > authzIdx, 'authz must run before If-None-Match');
  });

  it('ADR documents migration re-upload expectation', () => {
    const adr = fs.readFileSync(path.join(__dirname, '../docs/adr/ADR-016-family-avatar-storage.md'), 'utf8');
    assert.match(adr, /no-cache/);
    assert.match(adr, /ladda upp igen/i);
  });
});

describe('family avatar v1 — upload validation', () => {
  it('avatar-upload guards dangerous MIME before decode', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/lib/avatar-upload.js'), 'utf8');
    assert.match(src, /isDangerousDeclaredType/);
    assert.match(src, /limitInputPixels/);
    assert.match(src, /AVATAR_MAX_EDGE_PX/);
  });

  it('sanitizeAvatarImageBuffer rejects non-image bytes', async () => {
    const { sanitizeAvatarImageBuffer, AVATAR_MAX_INPUT_PIXELS } = require('../src/lib/avatar-upload');
    assert.ok(AVATAR_MAX_INPUT_PIXELS > 0);
    await assert.rejects(
      () => sanitizeAvatarImageBuffer(Buffer.from('not-an-image'), 'image/jpeg'),
      (err) => err.userMessage && /tillåtna|läsas/i.test(err.userMessage)
    );
  });

  it('upload module exports isDangerousDeclaredType for avatar-upload', () => {
    const upload = require('../src/routes/upload');
    assert.equal(typeof upload.isDangerousDeclaredType, 'function');
    assert.equal(upload.isDangerousDeclaredType('image/svg+xml'), true);
    assert.equal(upload.isDangerousDeclaredType('image/jpeg'), false);
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

    await db.query(
      `UPDATE child SET avatar_storage_key = $2, avatar_updated_at = NOW()
       WHERE id = $1`,
      [childId, 'avatars-private/test/fake.jpg']
    );

    const res = await fetch(`${http.baseUrl}/api/avatars/child/${childId}`, {
      headers: { Cookie: cookieHeader(familyB.cookies) },
    });
    assert.equal(res.status, 404);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('avatars GET: unauthenticated returns 404', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'No Auth Kid', emoji: '⭐', pin: '8642' });

    const res = await fetch(`${http.baseUrl}/api/avatars/child/${childId}`);
    assert.equal(res.status, 404);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('avatars GET: cross-family If-None-Match still returns 404', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyA = await registerAndLogin(http.baseUrl, { name: 'Etag A' });
    const familyB = await registerAndLogin(http.baseUrl, { name: 'Etag B' });
    const childId = await createChild(http.baseUrl, familyA, { name: 'Etag Kid', emoji: '⭐', pin: '8642' });

    const updatedAt = (await db.query(
      'SELECT avatar_updated_at FROM child WHERE id = $1',
      [childId]
    )).rows[0].avatar_updated_at;
    const v = new Date(updatedAt).getTime();
    const etag = `"av-child-${childId}-${v}"`;

    const res = await fetch(`${http.baseUrl}/api/avatars/child/${childId}`, {
      headers: {
        Cookie: cookieHeader(familyB.cookies),
        'If-None-Match': etag,
      },
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

    await db.query(
      'DELETE FROM parent_child WHERE parent_id = $1 AND child_id = $2',
      [pedagogId, childA]
    );
    assert.equal(await canViewMemberAvatar(viewer, 'child', childA), false);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('DELETE child avatar clears storage key and GET returns 404', async (t) => {
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

    const getRes = await fetch(`${http.baseUrl}/api/avatars/child/${child.id}`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(getRes.status, 404);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('GET /api/me/family exposes parent avatar_src to logged-in child', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl, { name: 'Pontus Parent' });
    const parentId = (await db.query(
      'SELECT id FROM parent WHERE LOWER(email) = $1',
      [session.email.toLowerCase()]
    )).rows[0].id;

    await db.query(
      `UPDATE parent SET avatar_storage_key = $2, avatar_updated_at = NOW()
       WHERE id = $1`,
      [parentId, 'avatars-private/test/parent-face.jpg']
    );

    const childId = await createChild(http.baseUrl, session, {
      name: 'Astrid',
      emoji: '🦄',
      pin: '8642',
    });
    const username = (await db.query('SELECT username FROM child WHERE id = $1', [childId])).rows[0].username;

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, pin: '8642' }),
    });
    assert.equal(loginRes.status, 200);
    let childCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const hallRes = await fetch(`${http.baseUrl}/api/me/family`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(hallRes.status, 200);
    const hall = await hallRes.json();
    assert.ok(hall.persons, 'persons block required for child');
    assert.ok(hall.persons.parents.length >= 1);
    const parent = hall.persons.parents.find((p) => p.name === 'Pontus Parent') || hall.persons.parents[0];
    assert.equal(parent.has_avatar, true);
    assert.match(parent.avatar_src, /^\/api\/avatars\/parent\//);
    assert.equal(parent.id, parentId);

    const { putPrivateObject } = require('../src/lib/avatar-storage');
    const { isObjectStorageConfigured, usesLocalStorage } = require('../src/lib/object-storage');
    if (isObjectStorageConfigured() && usesLocalStorage()) {
      await putPrivateObject({
        storageKey: 'avatars-private/test/parent-face.jpg',
        buffer: Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=', 'base64'),
        contentType: 'image/jpeg',
      });
    }

    const avatarRes = await fetch(`${http.baseUrl}/api/avatars/parent/${parentId}`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.notEqual(avatarRes.status, 403, 'child must reach avatar authz, not CHILD_PARENT_API_BLOCKED');
    if (isObjectStorageConfigured() && usesLocalStorage()) {
      assert.equal(avatarRes.status, 200);
      assert.match(avatarRes.headers.get('content-type') || '', /^image\//);
    }
  } finally {
    await http.close();
    await db.cleanup();
  }
});
