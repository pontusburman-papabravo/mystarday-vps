'use strict';

/** Example Cursor brief — validate with `npm run meta-ads:propose -- this file`. */

module.exports = {
  name: 'Morgonrutin SE — registrering',
  slug: 'morgon-se-register',
  objective: 'OUTCOME_TRAFFIC',
  destination_url: 'https://mystarday.se/register', // pragma: allowlist secret
  daily_budget_sek: 50,
  countries: ['SE'],
  age_min: 25,
  age_max: 55,
  headline: 'En lugnare morgon — ett nästa steg',
  primary_text:
    'Appen hjälper familjer att se vad som kommer härnäst. Barnet tar nästa steg. Du slipper tjata. Inga poängköp, ingen brådska — bara en tydlig morgon.',
  description: 'Skapa schema. Barnet bockar av. Stjärnor blir belöningar ni valt tillsammans.',
  call_to_action: 'SIGN_UP',
  image_url: 'https://mystarday.se/og-image.png', // pragma: allowlist secret
  hypothesis:
    'Föräldrar som söker bildschema/morgonrutin klickar till registrering och når First Success inom 7 dagar.',
  primary_metric: 'First Success inom 7 dagar',
  notes: 'Utkast för founder-godkännande. Publiceras inte förrän admin trycker Godkänn.',
};
