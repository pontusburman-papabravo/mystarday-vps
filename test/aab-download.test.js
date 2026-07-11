'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { listenApp } = require('./helpers/http.js');

const ROOT = path.join(__dirname, '..');
const AAB_PATH = path.join(ROOT, 'data/downloads/play-release.aab');

test('AAB download route returns 404 without token', async () => {
  process.env.AAB_DOWNLOAD_TOKEN = 'test-aab-token';
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const res = await fetch(`${baseUrl}/downloads/play-release.aab`);
    assert.equal(res.status, 404);
    const page = await fetch(`${baseUrl}/downloads/android`);
    assert.equal(page.status, 404);
  } finally {
    await close();
    delete process.env.AAB_DOWNLOAD_TOKEN;
  }
});

test('AAB download route serves file with valid token', async () => {
  fs.mkdirSync(path.dirname(AAB_PATH), { recursive: true });
  fs.writeFileSync(AAB_PATH, 'fake-aab-content');
  process.env.AAB_DOWNLOAD_TOKEN = 'test-aab-token';
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const res = await fetch(
      `${baseUrl}/downloads/play-release.aab?token=test-aab-token`,
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-disposition') || '', /play-release-v6\.aab/);
    assert.equal(await res.text(), 'fake-aab-content');
  } finally {
    await close();
    if (fs.existsSync(AAB_PATH)) fs.unlinkSync(AAB_PATH);
    delete process.env.AAB_DOWNLOAD_TOKEN;
  }
});
