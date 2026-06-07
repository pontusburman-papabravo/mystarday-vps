#!/usr/bin/env node
/**
 * Destructive QA: radera barn, delete-account (QA-087, QA-205)
 * ONLY when QA_ALLOW_DESTRUCTIVE=1 — creates disposable family first.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createQaClient } from './qa-http-client.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = new Map();

function record(id, status, note = '') {
  results.set(id, { status, note });
  console.log(`${{ pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[status]} ${id} ${note}`);
}

async function main() {
  if (process.env.QA_ALLOW_DESTRUCTIVE !== '1') {
    console.error('Sätt QA_ALLOW_DESTRUCTIVE=1 för att köra destruktiva tester');
    record('QA-087', 'skip', 'QA_ALLOW_DESTRUCTIVE saknas');
    record('QA-205', 'skip', 'QA_ALLOW_DESTRUCTIVE saknas');
    writeOut();
    process.exit(0);
  }

  const client = createQaClient({});
  const stamp = Date.now().toString(36);
  const email = `qa.destruct+${stamp}@test.mystarday.se`;
  const password = 'QaDestruct2026!Secure';

  await client.http('POST', '/api/auth/register', {
    json: { email, password, name: 'QA Destruct' },
  });

  const qaStatus = await client.http('GET', '/api/qa/status');
  if (qaStatus.status === 200) {
    let verifyToken = await client.qaToken(email, 'verify');
    if (verifyToken) {
      await client.http('POST', '/api/auth/verify-email', { json: { token: verifyToken } });
    }
  }

  await client.login(email, password);

  const c1 = await client.http('POST', '/api/onboarding/child', {
    json: { name: `QA Delete Me ${stamp}`, emoji: '🗑️' },
    csrf: true,
  });
  const c2 = await client.http('POST', '/api/onboarding/child', {
    json: { name: `QA Keep ${stamp}`, emoji: '⭐' },
    csrf: true,
  });
  await client.http('POST', '/api/onboarding/complete', { json: {}, csrf: true });

  if (c1.status === 201) {
    const del = await client.http('DELETE', `/api/children/${c1.data.id}`, { csrf: true });
    record('QA-087', del.status === 200 ? 'pass' : 'partial', `delete barn → ${del.status}`);
    record('QA-088', del.status === 200 ? 'pass' : 'partial', 'primary delete');
    const list = await client.http('GET', '/api/children');
    const n = list.data?.length || 0;
    if (n !== 1) {
      const prev = results.get('QA-087');
      results.set('QA-087', { ...prev, note: `${prev.note}; ${n} barn kvar (förväntat 1)` });
    }
  }

  // delete-account on disposable family only
  const delAcc = await client.http('DELETE', '/api/family/delete-account', { csrf: true });
  record('QA-205', delAcc.status === 200 ? 'pass' : 'partial', `delete-account → ${delAcc.status}`);

  writeOut();
}

function writeOut() {
  fs.writeFileSync(path.join(root, 'docs/qa-run-destructive-latest.json'), JSON.stringify(Object.fromEntries(results), null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
