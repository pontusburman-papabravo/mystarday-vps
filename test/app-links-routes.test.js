'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SERVER_JS = path.join(__dirname, '..', 'server.js');

test('server.js mounts well-known routes before registerRoutes', () => {
  const src = fs.readFileSync(SERVER_JS, 'utf8');
  const assetLinksIdx = src.indexOf("app.get('/.well-known/assetlinks.json'");
  const registerIdx = src.indexOf('registerRoutes(app)');
  assert.ok(assetLinksIdx > -1, 'missing /.well-known/assetlinks.json route in server.js');
  assert.ok(registerIdx > -1, 'missing registerRoutes(app) in server.js');
  assert.ok(assetLinksIdx < registerIdx, 'well-known routes must mount before registerRoutes');
});

test('404 handler does not redirect /.well-known paths to /', () => {
  const src = fs.readFileSync(SERVER_JS, 'utf8');
  assert.match(src, /req\.path\.startsWith\('\/\.well-known\/'\)/);
});

test('server.js has Apache-stripped fallback for assetlinks.json', () => {
  const src = fs.readFileSync(SERVER_JS, 'utf8');
  assert.match(src, /app\.get\('\/assetlinks\.json', sendAssetLinks\)/);
});

test('GET /assetlinks.json returns JSON (Apache ProxyPass strip fallback)', async () => {
  const express = require('express');
  const { buildAssetLinks } = require('../src/lib/well-known');
  const app = express();
  app.get('/assetlinks.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(buildAssetLinks());
  });
  const http = require('http');
  await new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const port = server.address().port;
        const r = await fetch(`http://127.0.0.1:${port}/assetlinks.json`);
        assert.equal(r.status, 200);
        assert.match(r.headers.get('content-type') || '', /json/);
        const body = await r.json();
        assert.ok(Array.isArray(body));
        server.close(resolve);
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
});
