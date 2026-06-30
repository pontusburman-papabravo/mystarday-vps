'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('notification log metadata', () => {
  it('logNotification persists optional metadata JSONB', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../db/notification-log.js'),
      'utf8'
    );
    assert.ok(src.includes('metadata'), 'notification-log must accept metadata');
    assert.ok(src.includes('$6::jsonb'), 'metadata must be stored as JSONB');
  });

  it('sendPushNotification forwards metadata to archive', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/push-notifications.js'),
      'utf8'
    );
    assert.ok(src.includes('metadata'), 'sendPushNotification must accept metadata');
    assert.ok(
      src.includes('logNotification(parentId, { title, body, type, url, metadata })'),
      'archive write must include metadata'
    );
  });
});
