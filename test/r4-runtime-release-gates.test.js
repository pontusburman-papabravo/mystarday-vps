'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

test('SSE broadcast filters child-scoped events per parent client', () => {
  const { addClient, removeClient, broadcast } = require('../src/lib/sse-broadcast');

  const writesA = [];
  const writesB = [];
  const resA = { write: (chunk) => writesA.push(chunk) };
  const resB = { write: (chunk) => writesB.push(chunk) };

  const familyId = 'fam-sse-test';
  addClient(familyId, resA, {
    shouldDeliver: (_type, data) => !data.childId || data.childId === 'child-a',
  });
  addClient(familyId, resB, {
    shouldDeliver: (_type, data) => !data.childId || data.childId === 'child-b',
  });

  broadcast(familyId, 'DAILY_LOG_ITEM_COMPLETED', { childId: 'child-b', itemId: 'x' });
  assert.equal(writesA.length, 0);
  assert.equal(writesB.length, 1);

  broadcast(familyId, 'SYSTEM_ALERT', { message: 'hello' });
  assert.equal(writesA.length, 1);
  assert.equal(writesB.length, 2);

  removeClient(familyId, resA);
  removeClient(familyId, resB);
});

test('trusted-device browser bootstrap files parse and export globals', () => {
  const files = [
    'public/js/trusted-device-bootstrap.js',
    'public/js/trusted-device-client.js',
  ];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    const check = spawnSync(process.execPath, ['--check', abs], { encoding: 'utf8' });
    assert.equal(check.status, 0, `${rel}: ${check.stderr || check.stdout}`);
  }
  const bootstrapSrc = fs.readFileSync(path.join(ROOT, files[0]), 'utf8');
  assert.match(bootstrapSrc, /window\.TrustedDeviceBootstrap/);
});
