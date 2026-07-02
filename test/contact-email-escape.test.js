'use strict';

/**
 * M7 — contact form owner email must escape HTML in user-supplied fields.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { injectMockDb } = require('./helpers/setup.js');

test('contact route escapes HTML in outgoing owner email', async () => {
  const mock = injectMockDb();
  let capturedHtml = null;

  mock.setQuery(async (sql) => {
    if (String(sql).includes('INSERT INTO contact_message')) {
      return { rows: [] };
    }
    return { rows: [] };
  });

  const emailPath = require.resolve('../src/lib/email');
  const previousEmail = require.cache[emailPath];
  require.cache[emailPath] = {
    id: emailPath,
    filename: emailPath,
    loaded: true,
    exports: {
      sendEmail: async ({ html }) => {
        capturedHtml = html;
        return { success: true };
      },
      isTestMailbox: () => false,
    },
  };

  const publicPath = require.resolve('../src/routes/public');
  delete require.cache[publicPath];
  const publicRouter = require('../src/routes/public');

  const app = express();
  app.use(express.json());
  app.use('/api', publicRouter);

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });

  const xssPayload = '<img src=x onerror=alert(1)>';

  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: xssPayload,
        email: 'contact-test@notexample.com',
        message: `${xssPayload} hej`,
      }),
    });

    assert.equal(res.status, 200);
    assert.ok(capturedHtml, 'sendEmail should have been called');
    assert.doesNotMatch(capturedHtml, /<img src=x onerror=alert\(1\)>/);
    assert.match(capturedHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousEmail) require.cache[emailPath] = previousEmail;
    else delete require.cache[emailPath];
    delete require.cache[publicPath];
    mock.restore();
  }
});

test('public.js contact handler uses escapeHtml for email body fields', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/public.js'), 'utf8');
  assert.match(src, /function escapeHtml\(/);
  assert.match(src, /const safeMessage = escapeHtml\(message\.trim\(\)\)/);
  assert.match(src, /const safeName = escapeHtml\(name\.trim\(\)\)/);
  assert.match(src, /const safeEmail = escapeHtml\(normalizedEmail\)/);
});
