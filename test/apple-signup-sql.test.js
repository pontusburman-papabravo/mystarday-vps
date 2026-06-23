/**
 * apple-signup-sql.test.js — guard against PostgreSQL 42P08 on Apple signup.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('createParentWithApple family_subscriptions insert avoids reused $2 in CASE', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/auth/index.js'), 'utf8');
  assert.ok(
    src.includes('createParentWithApple'),
    'createParentWithApple helper expected in auth/index.js'
  );
  assert.ok(
    !/CASE WHEN \$2 = 'trial'/.test(src),
    'Reusing $2 in CASE WHEN causes PostgreSQL 42P08 (text vs varchar) on Apple signup'
  );
  const fnStart = src.indexOf('async function createParentWithApple');
  const fnEnd = src.indexOf('async function completeLogin', fnStart);
  const fnBody = src.slice(fnStart, fnEnd);
  assert.match(
    fnBody,
    /INSERT INTO family_subscriptions[\s\S]*VALUES \(\$1, \$2, \$3, \$4\)/,
    'family_subscriptions insert should use separate params for tier and trial_expires_at'
  );
});
