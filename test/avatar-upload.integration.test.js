'use strict';

/**
 * Avatar upload/replace/remove + delivery + cache bust integration.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { putAvatarMultipart } = require('./helpers/image-upload-http.js');
const {
  tinyJpegBuffer,
  svgBuffer,
  oversizeAvatarBuffer,
} = require('./helpers/image-fixtures.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function withAvatarEnv(t, fn) {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ms-avatar-'));
  const prevStorage = process.env.UPLOAD_STORAGE;
  const prevDir = process.env.UPLOAD_LOCAL_DIR;
  process.env.UPLOAD_STORAGE = 'local';
  process.env.UPLOAD_LOCAL_DIR = uploadDir;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await fn({ db, http });
  } finally {
    process.env.UPLOAD_STORAGE = prevStorage;
    process.env.UPLOAD_LOCAL_DIR = prevDir;
    await http.close();
    await db.cleanup();
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
  }
}

describe('avatar upload PUT', () => {
  test('child upload renders via GET /api/avatars with cache bust on replace', async (t) => {
    await withAvatarEnv(t, async ({ db, http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, session, { name: 'Avatar Kid', emoji: '🦄', pin: '8642' });

      const put1 = await putAvatarMultipart(http.baseUrl, `/api/children/${childId}/avatar`, session, {
        buffer: tinyJpegBuffer(),
        filename: 'a.jpg',
        mime: 'image/jpeg',
      });
      const put1Text = await put1.text();
      assert.equal(put1.status, 200, put1Text);
      const body1 = JSON.parse(put1Text);
      assert.equal(body1.has_avatar, true);
      assert.match(body1.avatar_src, /\?v=\d+/);
      const v1 = body1.avatar_src.match(/v=(\d+)/)[1];

      const get1 = await fetch(`${http.baseUrl}${body1.avatar_src.split('?')[0]}?v=${v1}`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(get1.status, 200);
      assert.match(get1.headers.get('content-type') || '', /^image\//);

      await new Promise((r) => setTimeout(r, 5));

      const put2 = await putAvatarMultipart(http.baseUrl, `/api/children/${childId}/avatar`, session, {
        buffer: tinyJpegBuffer(),
        filename: 'b.jpg',
        mime: 'image/jpeg',
      });
      assert.equal(put2.status, 200);
      const body2 = await put2.json();
      const v2 = body2.avatar_src.match(/v=(\d+)/)[1];
      assert.notEqual(v2, v1, 'replace must bump avatar_updated_at cache bust');

      const me = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      const meJson = await me.json();
      const childMe = (meJson.children || []).find((c) => c.id === childId);
      assert.ok(childMe);
      assert.match(childMe.avatar_src, new RegExp(`v=${v2}`));
    });
  });

  test('parent upload + DELETE remove restores has_avatar false', async (t) => {
    await withAvatarEnv(t, async ({ db, http }) => {
      const session = await registerAndLogin(http.baseUrl);

      const put = await putAvatarMultipart(http.baseUrl, '/api/account/avatar', session, {
        buffer: tinyJpegBuffer(),
        filename: 'parent.jpg',
        mime: 'image/jpeg',
      });
      const putText = await put.text();
      assert.equal(put.status, 200, putText);
      const uploaded = JSON.parse(putText);
      assert.equal(uploaded.has_avatar, true);

      const parentId = (await db.query(
        'SELECT id FROM parent WHERE LOWER(email) = $1',
        [session.email.toLowerCase()]
      )).rows[0].id;

      const get = await fetch(`${http.baseUrl}/api/avatars/parent/${parentId}`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(get.status, 200);

      const del = await fetch(`${http.baseUrl}/api/account/avatar`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
      });
      assert.equal(del.status, 200);
      const cleared = await del.json();
      assert.equal(cleared.has_avatar, false);

      const getAfter = await fetch(`${http.baseUrl}/api/avatars/parent/${parentId}`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(getAfter.status, 404);
    });
  });

  test('rejects SVG and oversize avatar', async (t) => {
    await withAvatarEnv(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, session, { name: 'X', emoji: '⭐', pin: '8642' });

      const svg = await putAvatarMultipart(http.baseUrl, `/api/children/${childId}/avatar`, session, {
        buffer: svgBuffer(),
        filename: 'x.svg',
        mime: 'image/svg+xml',
      });
      assert.equal(svg.status, 400);

      const big = await putAvatarMultipart(http.baseUrl, `/api/children/${childId}/avatar`, session, {
        buffer: oversizeAvatarBuffer(),
        filename: 'big.jpg',
        mime: 'image/jpeg',
      });
      assert.equal(big.status, 413);
    });
  });

  test('cross-family child avatar PUT returns 403', async (t) => {
    await withAvatarEnv(t, async ({ http }) => {
      const owner = await registerAndLogin(http.baseUrl, { name: 'Owner' });
      const other = await registerAndLogin(http.baseUrl, { name: 'Other' });
      const childId = await createChild(http.baseUrl, owner, { name: 'Kid', emoji: '⭐', pin: '8642' });

      const res = await putAvatarMultipart(http.baseUrl, `/api/children/${childId}/avatar`, other, {
        buffer: tinyJpegBuffer(),
        filename: 'hack.jpg',
        mime: 'image/jpeg',
      });
      assert.equal(res.status, 403);
    });
  });
});

describe('legacy public avatar URLs', () => {
  test('known legacy /uploads/avatars path returns 404 at static layer', async (t) => {
    await withAvatarEnv(t, async ({ http }) => {
      const res = await fetch(`${http.baseUrl}/uploads/avatars/family/old-face.jpg`);
      assert.equal(res.status, 404);
    });
  });
});
