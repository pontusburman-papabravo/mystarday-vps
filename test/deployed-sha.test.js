'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { readDeployedSha } = require('../src/lib/deployed-sha');

const TEST_SHA = 'a'.repeat(40);

describe('readDeployedSha', () => {
  test('prefers DEPLOY_SHA env', () => {
    const prev = process.env.DEPLOY_SHA;
    process.env.DEPLOY_SHA = TEST_SHA;
    try {
      assert.equal(readDeployedSha(), TEST_SHA);
    } finally {
      if (prev === undefined) delete process.env.DEPLOY_SHA;
      else process.env.DEPLOY_SHA = prev;
    }
  });

  test('reads data/deployed-sha when env unset', () => {
    const prev = process.env.DEPLOY_SHA;
    delete process.env.DEPLOY_SHA;
    const filePath = path.join(__dirname, '../data/deployed-sha');
    const hadFile = fs.existsSync(filePath);
    const prevContents = hadFile ? fs.readFileSync(filePath, 'utf8') : null;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${TEST_SHA}\n`);
    try {
      assert.equal(readDeployedSha(), TEST_SHA);
    } finally {
      if (hadFile) fs.writeFileSync(filePath, prevContents);
      else fs.unlinkSync(filePath);
      if (prev === undefined) delete process.env.DEPLOY_SHA;
      else process.env.DEPLOY_SHA = prev;
    }
  });
});

test('/health includes git_sha when DEPLOY_SHA is set', async () => {
  const prev = process.env.DEPLOY_SHA;
  process.env.DEPLOY_SHA = TEST_SHA;
  try {
    const { createApp } = require('../app');
    const { listenApp } = require('./helpers/http');
    const http = await listenApp(createApp);
    try {
      const res = await fetch(`${http.baseUrl}/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.git_sha, TEST_SHA);
    } finally {
      await http.close();
    }
  } finally {
    if (prev === undefined) delete process.env.DEPLOY_SHA;
    else process.env.DEPLOY_SHA = prev;
  }
});

test('/health includes cache_version from config/cache-version.json', async () => {
  const { cacheName } = require('../config/cache-version.json');
  const { createApp } = require('../app');
  const { listenApp } = require('./helpers/http');
  const http = await listenApp(createApp);
  try {
    const res = await fetch(`${http.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.cache_version, cacheName);
    assert.match(String(body.cache_version), /^stjarndag-v\d+$/);
  } finally {
    await http.close();
  }
});
