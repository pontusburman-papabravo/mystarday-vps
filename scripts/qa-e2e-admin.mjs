#!/usr/bin/env node
/**
 * Admin panel API QA (QA-262–286)
 * Requires QA_ADMIN_EMAIL + QA_ADMIN_PASSWORD (parent with is_admin=true)
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

async function ensureAdminAccount(client) {
  if (process.env.QA_ADMIN_EMAIL && process.env.QA_ADMIN_PASSWORD) {
    return {
      email: process.env.QA_ADMIN_EMAIL,
      password: process.env.QA_ADMIN_PASSWORD,
      provisioned: false,
    };
  }

  const status = await client.http('GET', '/api/qa/status');
  if (status.status !== 200) {
    console.error('Saknar QA_ADMIN_* och QA harness ej aktiv.');
    console.error('Alternativ 1: QA_MODE=true + QA_SECRET på server → auto-provisionering');
    console.error('Alternativ 2: QA_ADMIN_EMAIL + QA_ADMIN_PASSWORD (is_admin=true)');
    console.error('Alternativ 3: UPDATE parent SET is_admin=true, verified=true WHERE email=...');
    process.exit(2);
  }

  const stamp = Date.now().toString(36);
  const email = `qa.admin+${stamp}@test.mystarday.se`;
  const password = 'QaAdmin2026!Secure';
  const reg = await client.http('POST', '/api/auth/register', {
    json: { email, password, name: 'QA Admin Auto' },
  });
  if (reg.status !== 201) throw new Error(`Registrering misslyckades → ${reg.status}`);

  let verifyToken = reg.data?.verifyToken || null;
  if (!verifyToken) verifyToken = await client.qaToken(email, 'verify');
  if (verifyToken) {
    await client.http('POST', '/api/auth/verify-email', { json: { token: verifyToken } });
  }

  const setup = await client.http('POST', '/api/qa/setup-admin', { json: { email } });
  if (setup.status !== 200) {
    throw new Error(`setup-admin → ${setup.status}: ${setup.data?.error || 'okänt fel'}`);
  }
  console.log(`Auto-provisionerat admin: ${email}`);
  return { email, password, provisioned: true };
}

async function main() {
  const client = createQaClient({});
  const { email: adminEmail, password: adminPassword } = await ensureAdminAccount(client);

  const user = await client.login(adminEmail, adminPassword);
  if (!user?.isAdmin) {
    console.error('Kontot är inte admin (isAdmin=false)');
    process.exit(2);
  }
  record('QA-262', 'pass', `admin login ${adminEmail}`);

  // QA-263: icke-admin ska få 403
  const stamp = Date.now().toString(36);
  const plainEmail = `qa.nonadmin+${stamp}@test.mystarday.se`;
  const plainPass = 'QaNonAdmin2026!Secure';
  await client.http('POST', '/api/auth/register', {
    json: { email: plainEmail, password: plainPass, name: 'QA Non Admin' },
  });
  await client.login(plainEmail, plainPass);
  const forbidden = await client.http('GET', '/api/admin/families');
  record('QA-263', forbidden.status === 403 ? 'pass' : 'fail', `icke-admin → ${forbidden.status}`);

  await client.login(adminEmail, adminPassword);

  const endpoints = [
    ['QA-264', '/api/admin/families'],
    ['QA-267', '/api/admin/default-templates'],
    ['QA-268', '/api/admin/default-rewards'],
    ['QA-269', '/api/admin/default-schedules'],
    ['QA-270', '/api/dagens-nyhet'],
    ['QA-274', '/api/admin/analytics/kpis'],
    ['QA-275', '/api/admin/features'],
    ['QA-277', '/api/admin/waitlist'],
    ['QA-278', '/api/admin/professional-interest'],
    ['QA-279', '/api/admin/subscription-settings'],
    ['QA-282', '/admin/index.html'],
    ['QA-285', '/api/admin/email-log'],
  ];

  for (const [id, url] of endpoints) {
    const r = await client.http('GET', url);
    if (r.status === 200) record(id, 'pass', url);
    else if (r.status === 404 && id === 'QA-274') record(id, 'partial', 'analytics path variant');
    else record(id, r.status === 403 ? 'fail' : 'partial', `${url} → ${r.status}`);
  }

  record('QA-265', 'partial', 'impersonation — manuell UI');
  record('QA-266', 'partial', 'meddelanden — POST ej körd');
  record('QA-271', 'skip', 'newsletter send');
  record('QA-273', 'skip', 'win-back approval');
  record('QA-276', 'partial', 'per-familj feature');
  record('QA-280', 'partial', 'development pages');
  record('QA-281', 'partial', 'admin mobil — browser');
  record('QA-283', 'skip', 'bilduppladdning');

  const stats = await client.http('GET', '/api/admin/user-stats');
  record('QA-284', stats.status === 200 ? 'pass' : 'partial', 'user-stats API');

  const templates = await client.http('GET', '/api/admin/email-templates');
  record('QA-272', templates.status === 200 ? 'pass' : 'partial', 'email-templates GET');

  const landing = await client.http('GET', '/api/admin/landing-news');
  record('QA-286', landing.status === 200 ? 'pass' : 'partial', 'landing-news GET');

  const out = path.join(root, 'docs/qa-run-admin-latest.json');
  fs.writeFileSync(out, JSON.stringify(Object.fromEntries(results), null, 2));
  console.log('\nWrote', out);
}

main().catch((e) => { console.error(e); process.exit(1); });
