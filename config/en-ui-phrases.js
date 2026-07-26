'use strict';

/**
 * Safe UI-only phrase replacements (multi-word, no partial word damage).
 * Applied only to visible text, not attributes or scripts.
 */

const EN_UI_PHRASES = [
  ['← Tillbaka till startsidan', '← Back to home'],
  ['← Resursbibliotek', '← Resource library'],
  ['← Kunskapscenter', '← Knowledge centre'],
  ['Tillbaka till startsidan', 'Back to home'],
  ['Resursbibliotek', 'Resource library'],
  ['Kunskapscenter', 'Knowledge centre'],
  ['Kontakta oss', 'Contact us'],
  ['Vanliga frågor', 'Frequently asked questions'],
  ['Integritetspolicy', 'Privacy policy'],
  ['Användarvillkor', 'Terms of service'],
  ['Prisinformation', 'Pricing information'],
  ['Skattkammaren', 'The Treasure Chamber'],
  ['Testa [REDACTED] gratis', 'Try My Starday free'],
  ['Ladda ner', 'Download'],
  ['Skriv ut', 'Print'],
  ['Direktlänk:', 'Direct link:'],
  ['Vill du slippa skriva ut nya scheman varje gång?', 'Want to skip printing new schedules every time?'],
  ['Vill du slippa skriva ut nya scheman varje vecka?', 'Want to skip printing new schedules every week?'],
  ['Vill du slippa skriva ut om varje vecka?', 'Want to skip printing every week?'],
  ['Slipp skriva ut om varje vecka', 'Skip printing every week'],
  ['Levande schema i appen', 'Living schedule in the app'],
  ['Så använder du mallen', 'How to use the template'],
  ['Ladda ner PDF', 'Download PDF'],
  ['Gratis', 'Free'],
  ['[REDACTED]', 'My Starday'],
];

function sortedUiPhrases() {
  return [...EN_UI_PHRASES].sort((a, b) => b[0].length - a[0].length);
}

module.exports = { EN_UI_PHRASES, sortedUiPhrases };
