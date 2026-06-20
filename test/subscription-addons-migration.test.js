'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

test('migration creates subscription_addons table', () => {
  const mig = fs.readFileSync(
    path.join(__dirname, '../migrations/1807700000000_subscription_addons.js'),
    'utf8'
  );
  assert.match(mig, /CREATE TABLE IF NOT EXISTS subscription_addons/);
  assert.match(mig, /price_sek/);
});

test('subscription-settings GET tolerates addons query failure', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../src/routes/admin/subscription-settings.js'),
    'utf8'
  );
  assert.match(src, /addons\.getAllAddons\(\)\.catch/);
  assert.match(src, /return \{ rows: \[\] \}/);
});
