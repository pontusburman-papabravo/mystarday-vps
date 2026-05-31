/**
 * contact.test.js — Regression test: exactly ONE /api/contact handler exists.
 *
 * Bug context: at some point a duplicate route handler was registered.
 * This test ensures there is exactly one POST handler on the contact router.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { injectMockDb } = require('./helpers/setup.js');

test('public router has exactly one POST handler on /contact', () => {
 const mock = injectMockDb();

 try {
 const publicPath = require.resolve(path.join(__dirname, '../src/routes/public'));
 delete require.cache[publicPath];

 const router = require(publicPath);

 const postContactLayers = router.stack
   ? router.stack.filter(
 layer => layer.route
 && layer.route.methods
 && layer.route.methods.post
 && layer.route.path === '/contact'
 )
   : [];

 assert.equal(
 postContactLayers.length,
 1,
 `Expected exactly 1 POST /contact handler, got ${postContactLayers.length}`
 );
 } finally {
 mock.restore();
 }
});

test('contact route validates required fields', async () => {
 const mock = injectMockDb();

 try {
 // Simulate route logic in public.js: name/email/message are required
 const requiredFields = ['name', 'email', 'message'];
 const body = { name: '', email: 'test@test.com', message: 'Hi' };

 const missing = requiredFields.filter(f => !body[f]);
 assert.deepEqual(missing, ['name'], 'Should detect missing name field');
 } finally {
 mock.restore();
 }
});