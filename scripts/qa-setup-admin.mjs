#!/usr/bin/env node
/**
 * Promote a parent to admin via QA harness or print SQL fallback.
 *
 *   QA_SECRET=... QA_BASE_URL=... QA_HOST=mystarday.se node scripts/qa-setup-admin.mjs user@example.com
 */
import { createQaClient } from './qa-http-client.mjs';

const email = (process.argv[2] || process.env.QA_ADMIN_EMAIL || '').toLowerCase().trim();
if (!email) {
  console.error('Usage: node scripts/qa-setup-admin.mjs <email>');
  console.error('SQL fallback: UPDATE parent SET is_admin=true, verified=true WHERE LOWER(email)=\'...\';');
  process.exit(1);
}

const client = createQaClient({});
const status = await client.http('GET', '/api/qa/status');
if (status.status !== 200) {
  console.log('-- QA harness ej aktiv. Kör denna SQL manuellt:');
  console.log(`UPDATE parent SET is_admin = true, verified = true WHERE LOWER(email) = '${email}';`);
  process.exit(2);
}

const r = await client.http('POST', '/api/qa/setup-admin', { json: { email } });
if (r.status === 200) {
  console.log('OK:', r.data?.message || 'admin aktiverat', email);
  process.exit(0);
}
console.error('Misslyckades:', r.status, r.data?.error || r.text?.slice(0, 200));
process.exit(1);
