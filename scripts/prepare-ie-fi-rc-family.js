#!/usr/bin/env node
/**
 * Isolated IE/FI device-RC helper. Does not change public market flags.
 *
 * Usage:
 *   IE_FI_RC_CONFIRM=1 node scripts/prepare-ie-fi-rc-family.js --country IE --lang en-GB
 *   IE_FI_RC_CONFIRM=1 node scripts/prepare-ie-fi-rc-family.js --country FI --lang sv-SE
 *
 * Requires DATABASE_URL pointing at a disposable / local test database.
 * Refuses to run if the URL looks like a live-vps identity.
 */
'use strict';

if (process.env.IE_FI_RC_CONFIRM !== '1') {
  console.error('Refusing: set IE_FI_RC_CONFIRM=1 after you confirm DATABASE_URL is a disposable test database.');
  process.exit(2);
}

const url = String(process.env.DATABASE_URL || '');
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(2);
}

const liveLooking = /188\.66\.60\.93|render\.com|neon\.tech|amazonaws\.com|live-vps/i.test(url);
if (liveLooking) {
  console.error('Refusing: DATABASE_URL looks like a live-vps identity. Use a disposable test database.');
  process.exit(2);
}

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const country = String(arg('--country') || '').toUpperCase();
const lang = String(arg('--lang') || '');
if (!['IE', 'FI'].includes(country)) {
  console.error('Use --country IE or FI');
  process.exit(2);
}
if (country === 'IE' && lang !== 'en-GB') {
  console.error('Ireland RC language must be en-GB');
  process.exit(2);
}
if (country === 'FI' && lang !== 'sv-SE') {
  console.error('Finland RC language must be sv-SE (Swedish-only market in this phase)');
  process.exit(2);
}

console.log(JSON.stringify({
  ok: true,
  purpose: 'device-rc-prep',
  country,
  lang,
  timezone: country === 'IE' ? 'Europe/Dublin' : 'Europe/Helsinki',
  currency: 'EUR',
  legalRoute: country === 'IE' ? '/en/eea-privacy' : '/privacy',
  note: [
    'This helper only validates RC parameters.',
    'Create the family through admin/sandbox with country override.',
    'Do not flip market_ie_open or market_fi_open.',
    'Keep billing_ui_globally_disabled unless an isolated admin billing path is used.',
  ],
}, null, 2));
