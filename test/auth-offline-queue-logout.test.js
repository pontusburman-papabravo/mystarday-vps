'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('auth logout clears offline queue on full clear and child cookie clear', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/auth.js'), 'utf8');
  assert.match(src, /_fullClear\(\)[\s\S]*OfflineQueue\.clear/);
  assert.match(src, /_clearChildCookies[\s\S]*OfflineQueue\.clear/);
});
