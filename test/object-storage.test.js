'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('object-storage', () => {
  const orig = {};

  it('isObjectStorageConfigured returns false when R2 env vars missing', () => {
    for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL']) {
      orig[key] = process.env[key];
      delete process.env[key];
    }

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const { isObjectStorageConfigured } = require('../src/lib/object-storage');
    assert.equal(isObjectStorageConfigured(), false);

    for (const [key, val] of Object.entries(orig)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
    delete require.cache[require.resolve('../src/lib/object-storage')];
  });

  it('isObjectStorageConfigured returns true when all R2 env vars set', () => {
    process.env.R2_ACCOUNT_ID = 'acct';
    process.env.R2_ACCESS_KEY_ID = 'key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    process.env.R2_BUCKET_NAME = 'bucket';
    process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com';

    delete require.cache[require.resolve('../src/lib/object-storage')];
    const { isObjectStorageConfigured } = require('../src/lib/object-storage');
    assert.equal(isObjectStorageConfigured(), true);

    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_PUBLIC_BASE_URL;
    delete require.cache[require.resolve('../src/lib/object-storage')];
  });
});
