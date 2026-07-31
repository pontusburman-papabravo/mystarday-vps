/**
 * apple-signup-sql.test.js — guard against PostgreSQL 42P08 on OAuth signup.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('createParentFromOAuth family_subscriptions insert uses separate params', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/create-oauth-parent.js'), 'utf8');
  assert.ok(
    src.includes('createParentFromOAuth'),
    'createParentFromOAuth helper expected in create-oauth-parent.js'
  );
  assert.ok(
    !/CASE WHEN \$2 = 'trial'/.test(src),
    'Reusing $2 in CASE WHEN causes PostgreSQL 42P08 (text vs varchar) on OAuth signup'
  );
  const fnStart = src.indexOf('async function createParentFromOAuth');
  const fnBody = src.slice(fnStart);
  assert.match(
    fnBody,
    /INSERT INTO family_subscriptions[\s\S]*VALUES \(\$1, \$2, \$3, \$4\)/,
    'family_subscriptions insert should use separate params for tier and trial_expires_at'
  );
});
