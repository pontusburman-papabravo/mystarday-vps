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
