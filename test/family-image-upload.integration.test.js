'use strict';

/**
 * Activity image upload — POST /api/upload/image integration.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { uploadMultipart } = require('./helpers/image-upload-http.js');
const {
  tinyJpegBuffer,
  tinyPngBuffer,
  tinyWebpBuffer,
  fakeJpegBuffer,
  svgBuffer,
  oversizeActivityBuffer,
} = require('./helpers/image-fixtures.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

let uploadDir;

async function withLocalUpload(t, fn) {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ms-upload-'));
  const prevStorage = process.env.UPLOAD_STORAGE;
  const prevDir = process.env.UPLOAD_LOCAL_DIR;
  const prevAppUrl = process.env.APP_URL;
  process.env.UPLOAD_STORAGE = 'local';
  process.env.UPLOAD_LOCAL_DIR = uploadDir;

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  process.env.APP_URL = http.baseUrl;

  try {
    await fn({ db, http });
  } finally {
    process.env.UPLOAD_STORAGE = prevStorage;
    process.env.UPLOAD_LOCAL_DIR = prevDir;
    process.env.APP_URL = prevAppUrl;
    await http.close();
    await db.cleanup();
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
  }
}

describe('POST /api/upload/image', () => {
  test('accepts valid JPEG with magic-byte validation', async (t) => {
    await withLocalUpload(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const res = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: tinyJpegBuffer(),
        filename: 'photo.jpg',
        mime: 'image/jpeg',
      });
      assert.equal(res.status, 200, res.text);
      assert.match(res.json.url, /\/uploads\//);
    });
  });

  test('accepts PNG and WebP by content not extension alone', async (t) => {
    await withLocalUpload(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const png = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: tinyPngBuffer(),
        filename: 'fake.jpg',
        mime: 'image/png',
      });
      assert.equal(png.status, 200, png.text);

      const webp = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: tinyWebpBuffer(),
        filename: 'photo.webp',
        mime: 'image/webp',
      });
      assert.equal(webp.status, 200, webp.text);
    });
  });

  test('rejects SVG declared MIME', async (t) => {
    await withLocalUpload(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const res = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: svgBuffer(),
        filename: 'x.svg',
        mime: 'image/svg+xml',
      });
      assert.equal(res.status, 400);
      assert.match(res.json.error, /tillåten/i);
    });
  });

  test('rejects HTML disguised as JPEG (content mismatch)', async (t) => {
    await withLocalUpload(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const res = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: fakeJpegBuffer(),
        filename: 'evil.jpg',
        mime: 'image/jpeg',
      });
      assert.equal(res.status, 400);
      assert.match(res.json.error, /giltig bild/i);
    });
  });

  test('rejects files over 5 MB', async (t) => {
    await withLocalUpload(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const res = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: oversizeActivityBuffer(),
        filename: 'big.jpg',
        mime: 'image/jpeg',
      });
      assert.equal(res.status, 413);
      assert.match(res.json.error, /5 MB/i);
    });
  });

  test('each upload gets a unique URL for replace/cache bust', async (t) => {
    await withLocalUpload(t, async ({ http }) => {
      const session = await registerAndLogin(http.baseUrl);
      const a = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: tinyJpegBuffer(),
        filename: 'a.jpg',
        mime: 'image/jpeg',
      });
      const b = await uploadMultipart(http.baseUrl, '/api/upload/image', session, {
        buffer: tinyJpegBuffer(),
        filename: 'b.jpg',
        mime: 'image/jpeg',
      });
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      assert.notEqual(a.json.url, b.json.url);
    });
  });

  test('rejects unauthenticated upload before handler', async (t) => {
    await withLocalUpload(t, async ({ http }) => {
      const form = new FormData();
      form.append('image', new Blob([tinyJpegBuffer()], { type: 'image/jpeg' }), 'x.jpg');
      const res = await fetch(`${http.baseUrl}/api/upload/image`, { method: 'POST', body: form });
      // CSRF middleware runs before requireParent — no session means 403, not 401.
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.code || body.error || '', /CSRF/i);
    });
  });
});
