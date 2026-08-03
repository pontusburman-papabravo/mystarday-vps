'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('iap-manager uses Capacitor Purchases bridge (no bare npm import)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/iap-manager.js'), 'utf8');
  assert.match(src, /Capacitor\.Plugins\.Purchases|getPurchasesPlugin/);
  assert.doesNotMatch(src, /import\('@revenuecat\/purchases-capacitor'\)/);
  assert.doesNotMatch(src, /canPurchase\(\)\s*\{\s*return false/);
});

test('platform-html injects iap-manager on parent pages', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
  assert.match(src, /iap-manager\.js/);
  assert.match(src, /iap-native-client-logic\.js/);
});
