'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

test('optOutByToken disables weekly_summary for valid token', async () => {
  const TOKEN = '11111111-1111-4111-8111-111111111111';
  let updated = false;

  const mockDb = {
    query: async (sql, params) => {
      if (String(sql).includes('SELECT parent_id, weekly_summary')) {
        return { rows: [{ parent_id: 'parent-1', weekly_summary: true, reward_redemption: true, email_enabled: true }] };
      }
      if (String(sql).includes('UPDATE notification_preference') && params[0] === TOKEN) {
        updated = true;
        return { rows: [{ parent_id: 'parent-1' }] };
      }
      return { rows: [] };
    },
  };

  const dbPath = require.resolve('../src/lib/db');
  const optOutPath = require.resolve('../src/lib/notification-email-opt-out');
  require.cache[dbPath] = { exports: mockDb };
  delete require.cache[optOutPath];
  const { optOutByToken } = require('../src/lib/notification-email-opt-out');

  const result = await optOutByToken(TOKEN, 'weekly_summary');
  assert.equal(result.ok, true);
  assert.equal(updated, true);

  delete require.cache[optOutPath];
  delete require.cache[dbPath];
});

test('optOutByToken rejects invalid token', async () => {
  delete require.cache[require.resolve('../src/lib/notification-email-opt-out')];
  const { optOutByToken } = require('../src/lib/notification-email-opt-out');
  const result = await optOutByToken('not-a-uuid', 'weekly_summary');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_token');
});

test('optOutByToken rejects unknown token', async () => {
  const TOKEN = '22222222-2222-4222-8222-222222222222';
  const mockDb = {
    query: async (sql) => {
      if (String(sql).includes('SELECT parent_id, weekly_summary')) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  const dbPath = require.resolve('../src/lib/db');
  const optOutPath = require.resolve('../src/lib/notification-email-opt-out');
  require.cache[dbPath] = { exports: mockDb };
  delete require.cache[optOutPath];
  const { optOutByToken } = require('../src/lib/notification-email-opt-out');

  const result = await optOutByToken(TOKEN, 'weekly_summary');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unknown_token');

  delete require.cache[optOutPath];
  delete require.cache[dbPath];
});

test('notifications route uses neutral copy for invalid opt-out links', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../src/routes/account/notifications.js'),
    'utf8'
  );
  assert.match(src, /Länken är ogiltig eller har gått ut/);
  assert.match(src, /Du är redan avstängd/);
});

test('notifications route registers opt-out endpoints', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '../src/routes/account/notifications.js'),
    'utf8'
  );
  assert.match(src, /router\.get\('\/notifications\/opt-out'/);
  assert.match(src, /router\.post\('\/notifications\/opt-out'/);
});

test('settings page exposes aviseringar anchor', () => {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');
  assert.match(html, /id="aviseringar"/);
});
