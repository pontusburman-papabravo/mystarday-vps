#!/usr/bin/env node
/**
 * EPIC 3.3 / decision D9 — grant `teacch` ("Extra stöd") to ONE named family,
 * scoped narrowly instead of flipping it on for everyone.
 *
 * This does exactly what Admin → Familjer → [familj] → Extra stöd → Bevilja
 * would do, plus assigns the family to the `transition_support` feature's
 * dev access list (status stays 'dev' — only assigned families see it,
 * so this does NOT open transition_support to every family with `teacch`).
 *
 * It does not touch `emotion_tracking` — that feature is already status
 * 'live' on the `basic_app` component, i.e. open to every family already,
 * so there is nothing family-specific to grant there.
 *
 * It makes no changes to the `features.status` column. If `transition_support`
 * is ever flipped to 'live' or 'off' on purpose, that is a separate,
 * broader decision this script deliberately does not make.
 *
 * Usage (against production, via VPS SSH):
 *   node scripts/enable-teacch-for-family.js pontus@burman.cc
 */
'use strict';

const db = require('../src/lib/db');
const familySubscriptions = require('../db/family-subscriptions');
const features = require('../db/features');

const TEACCH_FEATURE_SLUGS = ['transition_support'];

async function main() {
  const email = process.argv[2] || 'pontus@burman.cc';

  const { rows } = await db.query(
    `SELECT f.id AS family_id, f.name AS family_name, p.email
     FROM parent p
     JOIN family f ON f.id = p.family_id
     WHERE p.email ILIKE $1
     LIMIT 1`,
    [email]
  );

  if (!rows[0]) {
    console.error(`Ingen förälder hittades med e-post "${email}".`);
    process.exit(1);
  }

  const { family_id: familyId, family_name: familyName } = rows[0];
  console.log(`Familj: ${familyName || '(namnlös)'}  [id: ${familyId}]  (${email})\n`);

  await familySubscriptions.grantComponent(familyId, 'teacch', null, { source: 'admin' });
  console.log('✓ Beviljade "teacch" (Extra stöd)-komponenten.');

  for (const slug of TEACCH_FEATURE_SLUGS) {
    const feature = await features.getFeature(slug);
    if (!feature) {
      console.log(`⚠ Funktionen "${slug}" saknas i features-tabellen — hoppar över.`);
      continue;
    }
    if (feature.status !== 'dev') {
      console.log(`⚠ "${slug}" har status "${feature.status}", inte "dev" — lägger ändå till familjen i dev-listan, men detta har ingen effekt om statusen inte är "dev". Byt inte status utan att fatta det beslutet separat.`);
    }
    const added = await features.addFamily(familyId, slug);
    console.log(added ? `✓ Lade till familjen i "${slug}" (dev-åtkomst).` : `– Familjen fanns redan i "${slug}".`);
  }

  console.log('\nKlart. Familjen ser nu Extra stöd-inställningarna (distraktionsfri vy, visuell timer,');
  console.log('uppläsning, sociala berättelser, de sju frågorna) samt övergångsstöd — ingen annan familj påverkas.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fel:', err.message);
    process.exit(1);
  });
