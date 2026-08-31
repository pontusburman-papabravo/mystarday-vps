#!/usr/bin/env node
/**
 * Executable IE/FI device RC checklist. Does not flip live market flags.
 *
 *   node scripts/ie-fi-device-rc.mjs --country IE --lang en-GB
 *   node scripts/ie-fi-device-rc.mjs --country FI --lang sv-SE
 *
 * DEVICE_VERIFIED stays NO unless a dated PASS log is passed with --evidence.
 */
'use strict';

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const country = String(arg('--country') || '').toUpperCase();
const lang = String(arg('--lang') || '');
const evidence = arg('--evidence');

if (!['IE', 'FI'].includes(country)) {
  console.error('Use --country IE or FI');
  process.exit(2);
}
if (country === 'IE' && lang !== 'en-GB') {
  console.error('Ireland RC language must be en-GB');
  process.exit(2);
}
if (country === 'FI' && lang !== 'sv-SE') {
  console.error('Finland RC language must be sv-SE. Do not test FI as English.');
  process.exit(2);
}

const steps = [
  'Do not set market_ie_open or market_fi_open.',
  'Use an admin/test family with country override, or npm run rc:ie-fi:prepare.',
  `Set preferred locale to ${lang}.`,
  'T0 — market treated as open for that family, before payment start, billing OFF. Confirm access_kind=prebilling and first-star works.',
  'T1 — approaching payment start. Settings must show launch access, not Subscribe now.',
  'T2 — after payment start, billing ON and store healthy. Confirm paywall, store priceString in EUR, purchase, entitlement, restore.',
  'Failure — after payment start with billing OFF. Confirm hold (no mass 402) and no Subscribe now.',
  'Parent session and child session must survive app restart.',
  'Webhook /api/iap/webhook or reconcile must match the purchase. Failed RC sync must not revoke hold/prebilling.',
];

if (country === 'FI') {
  steps.push('If device locale is fi-FI, expect sv-SE. There is no Finnish UI bundle.');
}

const datedPass = Boolean(evidence);
const report = {
  country,
  lang,
  currency: 'EUR',
  timezone: country === 'IE' ? 'Europe/Dublin' : 'Europe/Helsinki',
  DEVICE_VERIFIED: datedPass ? 'NOT_AUTO_CLAIMED' : 'NO',
  ANDROID_SANDBOX_E2E: 'MANUAL_VERIFICATION_REQUIRED',
  steps,
  note: datedPass
    ? 'Evidence path was supplied. A human must still confirm the dated PASS log before changing DEVICE_VERIFIED.'
    : 'No real-device PASS log. Leave DEVICE_VERIFIED = NO.',
};

console.log(JSON.stringify(report, null, 2));
if (!datedPass) process.exit(0);
