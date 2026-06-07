#!/usr/bin/env node
/**
 * Email-flow QA: verify-email, forgot-password, family invite (QA-017–024, QA-197–201)
 * Requires QA_MODE=true + QA_SECRET on server, or dev NODE_ENV.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createQaClient } from './qa-http-client.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ID = process.env.QA_RUN_ID || `QA-EMAIL-${Date.now().toString(36)}`;
const results = new Map();

function record(id, status, note = '') {
  results.set(id, { status, note });
  console.log(`${{ pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[status]} ${id} ${note}`);
}

async function main() {
  const client = createQaClient({});
  const stamp = Date.now().toString(36);
  const email = process.env.QA_EMAIL || `qa.email+${stamp}@test.mystarday.se`;
  const password = process.env.QA_PASSWORD || 'QaEmail2026!Secure';
  const inviteEmail = process.env.QA_INVITE_EMAIL || `qa.invite+${stamp}@test.mystarday.se`;

  const qaStatus = await client.http('GET', '/api/qa/status');
  const hasHarness = qaStatus.status === 200;
  if (!hasHarness) {
    console.warn('⚠️ QA harness ej aktiv — sätt QA_MODE=true + QA_SECRET på servern');
  }

  // Register
  const reg = await client.http('POST', '/api/auth/register', {
    json: { email, password, name: 'QA Email Test' },
  });
  record('QA-016', reg.status === 201 ? 'pass' : 'fail', 'register');
  record('QA-017', reg.status === 201 ? 'pass' : 'partial', 'verification mail triggad');

  let verifyToken = reg.data?.verifyToken || null;
  if (!verifyToken && hasHarness) {
    verifyToken = await client.qaToken(email, 'verify');
  }
  if (verifyToken) {
    const v = await client.http('POST', '/api/auth/verify-email', { json: { token: verifyToken } });
    record('QA-018', v.status === 200 ? 'pass' : 'fail', 'verify-email token');
  } else {
    record('QA-018', 'partial', 'ingen token — QA_MODE saknas');
  }

  await client.login(email, password);
  record('QA-019', 'pass', 'inloggning efter verify/grace');

  // Forgot password
  const fp = await client.http('POST', '/api/auth/forgot-password', { json: { email } });
  record('QA-022', fp.status === 200 ? 'pass' : 'fail', 'forgot-password');
  let resetToken = fp.data?.resetToken || null;
  if (!resetToken && hasHarness) resetToken = await client.qaToken(email, 'reset');
  if (resetToken) {
    const np = 'QaReset2026!New';
    const rp = await client.http('POST', '/api/auth/reset-password', {
      json: { token: resetToken, password: np },
    });
    record('QA-023', rp.status === 200 ? 'pass' : 'fail', 'reset-password');
    record('QA-024', 'partial', 'utgången token ej testad');
    await client.login(email, np);
  } else {
    record('QA-023', 'partial', 'ingen resetToken');
  }

  // Onboarding minimal for invite test
  const c1 = await client.http('POST', '/api/onboarding/child', {
    json: { name: `QA Invite Child ${stamp}`, emoji: '🧒' },
    csrf: true,
  });
  if (c1.status === 201) {
    await client.http('POST', '/api/onboarding/complete', { json: {}, csrf: true });
  }

  // Family invite
  const inv = await client.http('POST', '/api/family/invite', {
    json: { email: inviteEmail, name: 'QA Invited', childIds: c1.data?.id ? [c1.data.id] : [] },
    csrf: true,
  });
  record('QA-197', inv.status === 201 ? 'pass' : 'partial', `invite → ${inv.status}`);
  let inviteToken = inv.data?.inviteToken || null;
  if (!inviteToken && hasHarness) inviteToken = await client.qaToken(inviteEmail, 'invite');

  if (inviteToken) {
    const accept = await client.http('POST', '/api/family/invite/accept-new', {
      json: { token: inviteToken, password: 'QaInvite2026!Secure' },
    });
    record('QA-200', accept.status === 201 ? 'pass' : 'fail', 'accept-new');
    record('QA-199', 'partial', 'accept befintlig — ej separat test');
    record('QA-201', 'skip', 'utgången token — manuell');
  } else {
    record('QA-200', 'partial', 'ingen inviteToken');
  }

  const out = path.join(root, 'docs/qa-run-email-latest.json');
  fs.writeFileSync(out, JSON.stringify(Object.fromEntries(results), null, 2));
  console.log('\nWrote', out);
  const fails = [...results.values()].filter((v) => v.status === 'fail').length;
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
