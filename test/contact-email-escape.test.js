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
  const capturedHtml = [];

  mock.setQuery(async (sql) => {
    const q = String(sql);
    if (q.includes('INSERT INTO contact_message_reply_token')) {
      return {
        rows: [{
          id: '11111111-1111-1111-1111-111111111111',
          contact_message_id: 99,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'system',
        }],
      };
    }
    if (q.includes('INSERT INTO contact_message_event')) {
      return { rows: [{ id: 1, contact_message_id: 99, event_type: 'reply_token_created' }] };
    }
    if (q.includes('INSERT INTO contact_message')) {
      return { rows: [{ id: 99 }] };
    }
    if (q.includes('FROM contact_message') && q.includes('WHERE id')) {
      return {
        rows: [{
          id: 99,
          status: 'new',
          name: 'x',
          email: 'contact-test@notexample.com',
          message: 'x',
          message_type: 'contact',
          metadata: {},
        }],
      };
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
        capturedHtml.push(html);
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
    assert.ok(capturedHtml.length >= 1, 'sendEmail should have been called');
    const joined = capturedHtml.join('\n');
    assert.doesNotMatch(joined, /<img src=x onerror=alert\(1\)>/);
    assert.match(joined, /&lt;img src=x onerror=alert\(1\)&gt;/);
    const body = await res.json();
    assert.match(body.threadUrl || '', /\/support\/svar\/sr1\.[A-Za-z0-9_-]{40,}$/);
    // Token is random; substring "99" can occur. Guard the numeric message id as a path segment.
    assert.doesNotMatch(body.threadUrl || '', /\/support\/svar\/99(?:\/|$)/);
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
  assert.match(src, /buildReceiptBodies/);
  assert.match(src, /threadUrl/);
});
