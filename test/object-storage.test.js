'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

describe('object-storage', () => {
  const orig = {};

  function saveEnv() {
    for (const key of [
      'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL', 'R2_S3_ENDPOINT', 'R2_JURISDICTION',
      'UPLOAD_STORAGE', 'UPLOAD_LOCAL_DIR',
    ]) {
      orig[key] = process.env[key];
    }
  }

  function restoreEnv() {
    for (const [key, val] of Object.entries(orig)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
    delete require.cache[require.resolve('../src/lib/object-storage')];
  }

  it('uses local storage when R2 env vars are missing', () => {
    saveEnv();
    for (const key of Object.keys(orig)) delete process.env[key];

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const mod = require('../src/lib/object-storage');

    assert.equal(mod.isR2Configured(), false);
    assert.equal(mod.usesLocalStorage(), true);
    assert.equal(mod.isObjectStorageConfigured(), true);
    assert.ok(mod.getLocalUploadDir().endsWith(path.join('data', 'uploads')));

    restoreEnv();
  });

  it('isR2Configured returns true when all R2 env vars set', () => {
    saveEnv();
    process.env.R2_ACCOUNT_ID = 'acct';
    process.env.R2_ACCESS_KEY_ID = 'key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    process.env.R2_BUCKET_NAME = 'bucket';
    process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com';

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const mod = require('../src/lib/object-storage');
    assert.equal(mod.isR2Configured(), true);
    assert.equal(mod.usesLocalStorage(), false);

    restoreEnv();
  });

  it('getR2S3Endpoint uses EU host when R2_JURISDICTION=eu', () => {
    saveEnv();
    process.env.R2_ACCOUNT_ID = '82c8772fba7b38fb5c0001b62c82ac8f';
    process.env.R2_JURISDICTION = 'eu';

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const mod = require('../src/lib/object-storage');
    assert.equal(
      mod.getR2S3Endpoint(),
      'https://82c8772fba7b38fb5c0001b62c82ac8f.eu.r2.cloudflarestorage.com'
    );

    restoreEnv();
  });

  it('getR2S3Endpoint strips bucket suffix from pasted Cloudflare URL', () => {
    saveEnv();
    process.env.R2_BUCKET_NAME = 'mystarday';
    process.env.R2_S3_ENDPOINT = 'https://82c8772fba7b38fb5c0001b62c82ac8f.eu.r2.cloudflarestorage.com/mystarday';

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const mod = require('../src/lib/object-storage');
    assert.equal(
      mod.getR2S3Endpoint(),
      'https://82c8772fba7b38fb5c0001b62c82ac8f.eu.r2.cloudflarestorage.com'
    );

    restoreEnv();
  });

  it('UPLOAD_STORAGE=r2 without R2 vars disables uploads', () => {
    saveEnv();
    for (const key of Object.keys(orig)) delete process.env[key];
    process.env.UPLOAD_STORAGE = 'r2';

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const mod = require('../src/lib/object-storage');
    assert.equal(mod.isObjectStorageConfigured(), false);

    restoreEnv();
  });

  it('uploadToLocal writes file and returns APP_URL-based URL', async () => {
    saveEnv();
    for (const key of Object.keys(orig)) delete process.env[key];
    process.env.UPLOAD_STORAGE = 'local';
    process.env.APP_URL = 'https://mystarday.se';
    const tmpDir = path.join(__dirname, '.tmp-upload-test');
    process.env.UPLOAD_LOCAL_DIR = tmpDir;

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const mod = require('../src/lib/object-storage');
    const fs = require('fs/promises');

    const url = await mod.uploadImage({
      buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0x00]),
      filename: 'test.jpg',
      contentType: 'image/jpeg',
      prefix: 'uploads',
    });

    assert.ok(url.startsWith('https://mystarday.se/uploads/uploads/'));
    const rel = url.replace('https://mystarday.se/uploads/', '');
    const stat = await fs.stat(path.join(tmpDir, rel));
    assert.ok(stat.isFile());

    await fs.rm(tmpDir, { recursive: true, force: true });
    restoreEnv();
  });
});
