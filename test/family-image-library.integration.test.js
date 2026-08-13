'use strict';

/**
 * Family image library CRUD, attach, delete fallback, cross-family IDOR.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { uploadMultipart, localUploadRelPath } = require('./helpers/image-upload-http.js');
const { tinyJpegBuffer } = require('./helpers/image-fixtures.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function familyIdForSession(db, email) {
  const { rows } = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return rows[0].family_id;
}

async function uploadTestImage(http, session) {
  const up = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
    buffer: tinyJpegBuffer(),
    filename: 'library-test.jpg',
    mime: 'image/jpeg',
  });
  assert.equal(up.status, 200, up.text);
  return up.json.url;
}

async function withLibraryEnv(t, fn) {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ms-lib-'));
  const prevStorage = process.env.UPLOAD_STORAGE;
  const prevDir = process.env.UPLOAD_LOCAL_DIR;
  const prevAppUrl = process.env.APP_URL;
  process.env.UPLOAD_STORAGE = 'local';
  process.env.UPLOAD_LOCAL_DIR = uploadDir;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  process.env.APP_URL = http.baseUrl;

  try {
    await fn({ db, http, uploadDir });
  } finally {
    process.env.UPLOAD_STORAGE = prevStorage;
    process.env.UPLOAD_LOCAL_DIR = prevDir;
    process.env.APP_URL = prevAppUrl;
    await http.close();
    await db.cleanup();
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
  }
}

describe('family image library API', () => {
  test('POST save, PUT rename, attach activity, DELETE clears fallback', async (t) => {
    await withLibraryEnv(t, async ({ db, http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const imageUrl = await uploadTestImage(http, session);

      const create = await fetch(`${http.baseUrl}/api/family/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ label: 'Tandborste', image_url: imageUrl }),
      });
      assert.equal(create.status, 201);
      const row = await create.json();
      assert.equal(row.label, 'Tandborste');
      assert.equal(row.image_url, imageUrl);

      const rename = await fetch(`${http.baseUrl}/api/family/images/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ label: 'Morgon tandborstning' }),
      });
      assert.equal(rename.status, 200);
      assert.equal((await rename.json()).label, 'Morgon tandborstning');

      const actRes = await fetch(`${http.baseUrl}/api/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ name: 'Borsta', icon: '🪥', image_url: imageUrl, star_value: 1 }),
      });
      assert.equal(actRes.status, 201);
      const activity = await actRes.json();
      assert.equal(activity.image_url, imageUrl);

      const familyId = await familyIdForSession(db, session.email);
      const childId = (
        await db.query(`INSERT INTO child (family_id, name, emoji) VALUES ($1, 'Kid', '⭐') RETURNING id`, [
          familyId,
        ])
      ).rows[0].id;
      const logId = (
        await db.query(`INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`, [childId])
      ).rows[0].id;
      await db.query(
        `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, image_url, star_value, sort_order, section)
         VALUES ($1, $2, $3, $4, $5, 1, 0, 'fm')`,
        [logId, activity.id, 'Borsta', '🪥', imageUrl]
      );

      const del = await fetch(`${http.baseUrl}/api/family/images/${row.id}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
      });
      assert.equal(del.status, 200);

      const actRow = await db.query('SELECT image_url, icon FROM activity_template WHERE id = $1', [activity.id]);
      assert.equal(actRow.rows[0].image_url, null);
      assert.equal(actRow.rows[0].icon, '🪥');

      const dliRow = await db.query('SELECT image_url, icon FROM daily_log_item WHERE daily_log_id = $1', [logId]);
      assert.equal(dliRow.rows[0].image_url, null);
      assert.equal(dliRow.rows[0].icon, '🪥');
    });
  });

  test('replace activity image_url with a new upload', async (t) => {
    await withLibraryEnv(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const imageUrl = await uploadTestImage(http, session);
      const imageUrl2 = await uploadTestImage(http, session);
      assert.notEqual(imageUrl, imageUrl2);

      const actRes = await fetch(`${http.baseUrl}/api/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ name: 'Byt bild', icon: '🪥', image_url: imageUrl, star_value: 1 }),
      });
      assert.equal(actRes.status, 201);
      const activity = await actRes.json();

      const replaceAct = await fetch(`${http.baseUrl}/api/activities/${activity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ image_url: imageUrl2 }),
      });
      assert.equal(replaceAct.status, 200);
      assert.equal((await replaceAct.json()).image_url, imageUrl2);
    });
  });

  test('cross-family CRUD returns 404', async (t) => {
    await withLibraryEnv(t, async ({ http }) => {
      const owner = await registerAndLogin(http.baseUrl, { name: 'Owner' });
      const other = await registerAndLogin(http.baseUrl, { name: 'Other' });
      const imageUrl = await uploadTestImage(http, owner);

      const create = await fetch(`${http.baseUrl}/api/family/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(owner.cookies),
          'X-CSRF-Token': owner.csrfToken,
        },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const row = await create.json();

      const getList = await fetch(`${http.baseUrl}/api/family/images`, {
        headers: { Cookie: cookieHeader(other.cookies) },
      });
      const list = await getList.json();
      assert.ok(!list.some((r) => r.id === row.id));

      const put = await fetch(`${http.baseUrl}/api/family/images/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(other.cookies),
          'X-CSRF-Token': other.csrfToken,
        },
        body: JSON.stringify({ label: 'stolen' }),
      });
      assert.equal(put.status, 404);

      const del = await fetch(`${http.baseUrl}/api/family/images/${row.id}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(other.cookies),
          'X-CSRF-Token': other.csrfToken,
        },
      });
      assert.equal(del.status, 404);
    });
  });
});

describe('family image /source proxy', () => {
  test('same-family local file returns bytes; missing file 404; random URL 403', async (t) => {
    await withLibraryEnv(t, async ({ db, http, uploadDir }) => {
      const session = await registerAndLogin(http.baseUrl);
      const imageUrl = await uploadTestImage(http, session);

      const archive = await fetch(`${http.baseUrl}/api/family/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      assert.equal(archive.status, 201, await archive.text());

      const rel = localUploadRelPath(imageUrl);
      const fullPath = path.join(uploadDir, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, tinyJpegBuffer());

      const ok = await fetch(
        `${http.baseUrl}/api/family/images/source?url=${encodeURIComponent(imageUrl)}`,
        { headers: { Cookie: cookieHeader(session.cookies) } }
      );
      assert.equal(ok.status, 200);
      assert.match(ok.headers.get('content-type') || '', /image/i);

      await fs.unlink(fullPath);
      const missing = await fetch(
        `${http.baseUrl}/api/family/images/source?url=${encodeURIComponent(imageUrl)}`,
        { headers: { Cookie: cookieHeader(session.cookies) } }
      );
      assert.equal(missing.status, 404);

      const random = await fetch(
        `${http.baseUrl}/api/family/images/source?url=${encodeURIComponent('/uploads/other-family/secret.jpg')}`,
        { headers: { Cookie: cookieHeader(session.cookies) } }
      );
      assert.equal(random.status, 403);
    });
  });

  test('cross-family archived image URL returns 403', async (t) => {
    await withLibraryEnv(t, async ({ http }) => {
      const a = await registerAndLogin(http.baseUrl, { name: 'Fam A' });
      const b = await registerAndLogin(http.baseUrl, { name: 'Fam B' });
      const imageUrl = await uploadTestImage(http, a);

      await fetch(`${http.baseUrl}/api/family/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(a.cookies),
          'X-CSRF-Token': a.csrfToken,
        },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      const res = await fetch(
        `${http.baseUrl}/api/family/images/source?url=${encodeURIComponent(imageUrl)}`,
        { headers: { Cookie: cookieHeader(b.cookies) } }
      );
      assert.equal(res.status, 403);
    });
  });
});

describe('direct /uploads URL', () => {
  test('activity uploads are public static but avatar paths stay blocked', async (t) => {
    await withLibraryEnv(t, async ({ http, uploadDir }) => {
      const session = await registerAndLogin(http.baseUrl);
      const imageUrl = await uploadTestImage(http, session);
      const rel = localUploadRelPath(imageUrl);
      const fullPath = path.join(uploadDir, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, tinyJpegBuffer());

      const direct = await fetch(`${http.baseUrl}${imageUrl.startsWith('http') ? new URL(imageUrl).pathname : imageUrl}`);
      assert.equal(direct.status, 200);

      const legacyAvatar = await fetch(`${http.baseUrl}/uploads/avatars/legacy.jpg`);
      assert.equal(legacyAvatar.status, 404);
      const privateAvatar = await fetch(`${http.baseUrl}/uploads/avatars-private/x/y.jpg`);
      assert.equal(privateAvatar.status, 404);
    });
  });
});
