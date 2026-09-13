'use strict';

/**
 * Host 2026 campaign survey + lottery constants.
 * Copy is product research, not representative research.
 */

const HOST_2026_SURVEY_SLUG = 'host-2026';

/** Last moment to enter: 30 Sep 2026 23:59:59 Europe/Stockholm (CEST, UTC+2). */
const HOST_2026_CLOSES_AT = '2026-09-30T21:59:59.000Z';

const TEXT_LONG_MAX = 1000;
const FREETEXT_MAX = 200;
const TEXT_SHORT_MAX = 200;

const CONTEST_RETENTION_NON_WINNER = '2026-10-31T00:00:00+01:00';
const CONTEST_RETENTION_WINNER = '2026-11-30T00:00:00+01:00';

const HOST_2026_SURVEY = {
  slug: HOST_2026_SURVEY_SLUG,
  title: 'Hjälp oss göra [REDACTED] bättre 💜',
  description:
    'Svara på 7 korta frågor om vardagen med barn. Det tar ungefär 2 minuter.\n\n' +
    'Som tack kan du vara med i utlottningen av ett Zalando-presentkort värt 500 kr.\n\n' +
    'Frivilligt. Kostar inget. Köp eller appinstallation krävs inte. Utlottningen är separat från Premium.',
  target_tag: 'Kampanj host-2026',
  thank_you_message: 'Tack för att du hjälper oss 💜',
  thank_you_cta_text: 'Tillbaka till kampanjen',
  thank_you_cta_url: '/kampanj/host-2026',
  contest_prize_description: 'ett Zalando-presentkort värt 500 kr',
  contest_winner_count: 1,
  contest_collect_after_submit: true,
  contest_terms_url: '/kampanj/host-2026/utlottning',
  questions: [
    {
      question_text: 'Hur gammalt är barnet du främst tänker på när du svarar?',
      question_type: 'radio',
      is_required: true,
      options: [
        { option_text: '3–5 år' },
        { option_text: '6–8 år' },
        { option_text: '9–12 år' },
        { option_text: '13–15 år' },
        { option_text: '16 år eller äldre' },
        { option_text: 'Vill inte svara' },
      ],
    },
    {
      question_text: 'Vad gjorde dig nyfiken på [REDACTED]?',
      question_type: 'checkbox',
      is_required: true,
      max_selections: 3,
      options: [
        { option_text: 'Tydligare rutiner' },
        { option_text: 'Visuellt stöd' },
        { option_text: 'Mindre behov av muntliga påminnelser' },
        { option_text: 'Motivation och belöningar' },
        { option_text: 'Veckoplanering' },
        { option_text: 'Barnets självständighet' },
        { option_text: 'NPF-anpassning' },
        { option_text: 'Struktur för hela familjen' },
        { option_text: 'Annat', allows_freetext: true },
      ],
    },
    {
      question_text: 'Vad är svårast i vardagen just nu?',
      question_type: 'checkbox',
      is_required: true,
      max_selections: 3,
      options: [
        { option_text: 'Morgonrutiner' },
        { option_text: 'Kväll och läggning' },
        { option_text: 'Övergångar mellan aktiviteter' },
        { option_text: 'Att komma ihåg vad som ska göras' },
        { option_text: 'Motivation till vardagssaker' },
        { option_text: 'Förändringar och oväntade händelser' },
        { option_text: 'Skola eller förskola' },
        { option_text: 'Skärmtid' },
        { option_text: 'Konflikter och tjat' },
        { option_text: 'Annat', allows_freetext: true },
      ],
    },
    {
      question_text: 'Vad tror du skulle hjälpa er mest?',
      question_type: 'checkbox',
      is_required: true,
      max_selections: 3,
      options: [
        { option_text: 'Ett tydligt visuellt schema' },
        { option_text: 'Se vad som händer nu och sedan' },
        { option_text: 'Veckoplanering' },
        { option_text: 'Timer och påminnelser' },
        { option_text: 'Stjärnor och positiv uppmuntran' },
        { option_text: 'Belöningar' },
        { option_text: 'Delad planering mellan vuxna' },
        { option_text: 'Att barnet kan använda appen själv' },
        { option_text: 'Att det fungerar både på delad och egen enhet' },
        { option_text: 'Annat', allows_freetext: true },
      ],
    },
    {
      question_text: 'Hur brukar ni skapa struktur i vardagen idag?',
      question_type: 'checkbox',
      is_required: true,
      options: [
        { option_text: 'Vi har inget särskilt system' },
        { option_text: 'Vi påminner mest muntligt' },
        { option_text: 'Papper, whiteboard eller bildschema' },
        { option_text: 'Kalender' },
        { option_text: 'Påminnelser i mobilen' },
        { option_text: 'En annan app' },
        { option_text: 'Annat', allows_freetext: true },
      ],
    },
    {
      question_text: 'Vad skulle vara viktigast för att ni skulle fortsätta använda [REDACTED] över tid?',
      question_type: 'checkbox',
      is_required: true,
      max_selections: 3,
      options: [
        { option_text: 'Barnet tycker om att använda appen' },
        { option_text: 'Färre muntliga påminnelser behövs' },
        { option_text: 'Rutiner blir tydligare' },
        { option_text: 'Veckan blir lättare att överblicka' },
        { option_text: 'Barnet blir mer självständigt' },
        { option_text: 'Stjärnor och belöningar fungerar bra för oss' },
        { option_text: 'Appen är snabb och enkel för vuxna' },
        { option_text: 'Appen fungerar för hela familjen' },
        { option_text: 'Annat', allows_freetext: true },
      ],
    },
    {
      question_text: 'Hur tror du att barnet främst skulle använda [REDACTED]?',
      question_type: 'radio',
      is_required: true,
      options: [
        { option_text: 'På en vuxens mobil' },
        { option_text: 'På en gemensam familjemobil eller surfplatta' },
        { option_text: 'På barnets egen mobil' },
        { option_text: 'På barnets egen surfplatta' },
        { option_text: 'Det skulle variera' },
        { option_text: 'Vet inte ännu' },
      ],
    },
    {
      question_text: 'Är det något annat du önskar att [REDACTED] kunde hjälpa er med?',
      question_type: 'text_long',
      is_required: false,
    },
  ],
};

function materializeHost2026Survey() {
  const { injectBrandPlaceholders } = require('../src/lib/public-html-placeholders');
  return JSON.parse(injectBrandPlaceholders(JSON.stringify(HOST_2026_SURVEY)));
}

module.exports = {
  HOST_2026_SURVEY_SLUG,
  HOST_2026_CLOSES_AT,
  HOST_2026_SURVEY,
  materializeHost2026Survey,
  TEXT_LONG_MAX,
  FREETEXT_MAX,
  TEXT_SHORT_MAX,
  CONTEST_RETENTION_NON_WINNER,
  CONTEST_RETENTION_WINNER,
};
