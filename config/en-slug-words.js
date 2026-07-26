'use strict';

/**
 * Swedish → English URL segment translations for public mirror paths.
 * Applied left-to-right on hyphen-separated slugs.
 */

const EN_SLUG_WORDS = {
  // Resurser categories
  morgon: 'morning',
  kvall: 'evening',
  kanslor: 'emotions',
  overgangar: 'transitions',
  'teacch-inspirerat': 'teacch-inspired',
  teacch: 'teacch',
  inspirerat: 'inspired',
  skola: 'school',
  hygien: 'hygiene',
  resurser: 'resources',

  // Common compound parts
  bildschema: 'visual-schedule',
  bildstod: 'visual-support',
  bildkort: 'picture-cards',
  morgonschema: 'morning-schedule',
  kvallsschema: 'evening-schedule',
  beloningsschema: 'reward-chart',
  veckoschema: 'weekly-schedule',
  helgschema: 'weekend-schedule',
  laxschema: 'homework-schedule',
  skolaschema: 'school-schedule',
  hygienschema: 'hygiene-schedule',
  overgangsschema: 'transition-schedule',
  rutinschema: 'routine-schedule',
  forskolan: 'preschool',
  forskola: 'preschool',
  barn: 'children',
  gratis: 'free',
  mall: 'template',
  pdf: 'pdf',
  adhd: 'adhd',
  autism: 'autism',
  npf: 'neurodiversity',
  kanslokort: 'emotion-cards',
  kvallsrutin: 'evening-routine',
  beloning: 'reward',
  beloningssystem: 'reward-system',
  rutiner: 'routines',
  rutin: 'routine',
  schema: 'schedule',
  vardag: 'daily-life',
  skriva: 'print',
  ut: 'out',
  forst: 'first',
  sedan: 'then',
  kort: 'cards',
  vecko: 'weekly',
  helg: 'weekend',
  laxa: 'homework',
  lax: 'homework',
  pedagoger: 'educators',
  terapeuter: 'therapists',
  och: 'and',
  alternativ: 'alternative',
  tavla: 'board',
  app: 'app',
  skattkammaren: 'treasury',
  kontakt: 'contact',
  tack: 'thank-you',
  priser: 'pricing',
  pris: 'price',
  info: 'info',
  grupprum: 'classroom',
  lugn: 'calm',
  lugnare: 'calmer',
  steg: 'steps',
  exempel: 'example',
  tom: 'blank',
  fardigt: 'ready-made',
  direktlank: 'direct-link',
  ladda: 'download',
  ner: 'down',
  skriv: 'print',
  klipp: 'cut',
  laminera: 'laminate',
  pedagog: 'educator',
  foralder: 'parent',
  foraldrar: 'parents',
  familj: 'family',
  familjer: 'families',
};

/** Whole-slug overrides where word-by-word translation is wrong. */
const EN_SLUG_OVERRIDES = {
  'teacch-inspirerat': 'teacch-inspired',
  'bildkort-morgon': 'picture-cards-morning',
  'bildkort-kvall': 'picture-cards-evening',
  'bildkort-kanslor': 'picture-cards-emotions',
  'bildkort-overgangar': 'picture-cards-transitions',
  'bildkort-teacch': 'picture-cards-teacch',
  'bildkort-skola': 'picture-cards-school',
  'bildkort-hygien': 'picture-cards-hygiene',
  'pdf-morgonschema': 'pdf-morning-schedule',
  'pdf-kvallsschema': 'pdf-evening-schedule',
  'pdf-beloningsschema': 'pdf-reward-chart',
  'pdf-veckoschema': 'pdf-weekly-schedule',
  'pdf-helgschema': 'pdf-weekend-schedule',
  'pdf-laxschema': 'pdf-homework-schedule',
  'morgonrutin-barn': 'morning-routine-children',
  'beloningssystem-barn': 'reward-system-children',
  'rutiner-npf-barn': 'routines-neurodiverse-children',
  'bildschema-app': 'visual-schedule-app',
  'alternativ-bildschema-tavla': 'alternative-visual-schedule-board',
  'veckoschema-bildstod': 'weekly-schedule-visual-support',
  'pedagoger-och-terapeuter': 'educators-and-therapists',
  'pricing-info': 'pricing',
};

/**
 * Translate a Swedish URL slug to English.
 * @param {string} svSlug
 * @returns {string}
 */
function translateSlug(svSlug) {
  if (!svSlug) return svSlug;
  if (EN_SLUG_OVERRIDES[svSlug]) return EN_SLUG_OVERRIDES[svSlug];

  const parts = svSlug.split('-');
  const translated = parts.map((part) => {
    if (EN_SLUG_WORDS[part]) return EN_SLUG_WORDS[part];
    return part;
  });
  return translated.join('-');
}

/**
 * Translate a Swedish public path to its English equivalent.
 * Handles /resurser/*, SEO articles, and core pages.
 * @param {string} svPath
 * @returns {string|null}
 */
function translatePublicPath(svPath) {
  if (!svPath || svPath === '/') return '/en';

  const CORE_PATH_MAP = {
    '/faq': '/en/faq',
    '/kontakt': '/en/contact',
    '/privacy': '/en/privacy',
    '/terms': '/en/terms',
    '/pricing-info': '/en/pricing',
    '/register': '/en/register',
    '/login': '/en/login',
    '/forgot-password': '/en/forgot-password',
    '/pedagoger-och-terapeuter': '/en/educators-and-therapists',
    '/skattkammaren': '/en/treasury',
    '/treasury': '/en/treasury',
    '/sv/tack': '/en/thank-you',
    '/morgonrutin-barn': '/en/morning-routine-children',
    '/beloningssystem-barn': '/en/reward-system-children',
    '/rutiner-npf-barn': '/en/routines-neurodiverse-children',
    '/bildschema-app': '/en/visual-schedule-app',
    '/alternativ-bildschema-tavla': '/en/alternative-visual-schedule-board',
    '/veckoschema-bildstod': '/en/weekly-schedule-visual-support',
    '/resurser': '/en/resources',
  };

  if (CORE_PATH_MAP[svPath]) return CORE_PATH_MAP[svPath];

  if (svPath.startsWith('/resurser/')) {
    const rest = svPath.slice('/resurser/'.length);
    if (rest.startsWith('bildkort/')) {
      const cat = rest.slice('bildkort/'.length);
      return `/en/resources/picture-cards/${translateSlug(cat)}`;
    }
    if (rest.startsWith('pdf/')) {
      const pdfPart = rest.slice('pdf/'.length);
      if (pdfPart.endsWith('.pdf')) {
        const base = pdfPart.slice(0, -4);
        return `/en/resources/pdf/${translateSlug(base)}.pdf`;
      }
      return `/en/resources/pdf/${translateSlug(pdfPart)}`;
    }
    return `/en/resources/${translateSlug(rest)}`;
  }

  return null;
}

module.exports = {
  EN_SLUG_WORDS,
  EN_SLUG_OVERRIDES,
  translateSlug,
  translatePublicPath,
};
