'use strict';

/**
 * contentKey → locale slug.
 * Hreflang uses this identity, not a shared slug.
 *
 * Dutch pilot slugs:
 *   home                         /nl
 *   howItWorks                   /nl/hoe-het-werkt
 *   visualSchedule               /nl/visueel-schema
 *   morningRoutine               /nl/ochtendroutine-kinderen
 *   weeklySchedule               /nl/weekplanning-met-pictogrammen
 *   neurodiverseRoutines         /nl/routines-neurodiverse-kinderen
 *   rewardSystem                 /nl/beloningssysteem-kinderen
 *   resources                    /nl/bronnen
 *   faq                          /nl/faq
 *   privacy                      /nl/privacy
 *   terms                        /nl/voorwaarden
 */

const { LOCALES, REQUIRED_SEO_CONTENT, localeByCode, normalizeWebPath } = require('./web-locales');

/**
 * Localized slugs for published path locales after Dutch.
 * A slug must not collide with a market segment (/de/de is Germany, not a guide).
 */
const LOCALE_PATHS = Object.freeze({
  de: Object.freeze({
    home: '/de',
    howItWorks: '/de/so-funktionierts',
    visualSchedule: '/de/visueller-tagesplan',
    morningRoutine: '/de/morgenroutine-kinder',
    weeklySchedule: '/de/wochenplan-piktogramme',
    neurodiverseRoutines: '/de/routinen-neurodiverse-kinder',
    rewardSystem: '/de/belohnungssystem-kinder',
    resources: '/de/materialien',
    faq: '/de/fragen',
    privacy: '/de/datenschutz',
    terms: '/de/nutzungsbedingungen',
  }),
  fr: Object.freeze({
    home: '/fr',
    howItWorks: '/fr/comment-ca-marche',
    visualSchedule: '/fr/emploi-du-temps-visuel',
    morningRoutine: '/fr/routine-du-matin',
    weeklySchedule: '/fr/planning-hebdomadaire',
    neurodiverseRoutines: '/fr/routines-enfants-neurodivergents',
    rewardSystem: '/fr/systeme-de-recompenses',
    resources: '/fr/ressources',
    faq: '/fr/questions-frequentes',
    privacy: '/fr/confidentialite',
    terms: '/fr/conditions-d-utilisation',
  }),
  es: Object.freeze({
    home: '/es',
    howItWorks: '/es/como-funciona',
    visualSchedule: '/es/horario-visual',
    morningRoutine: '/es/rutina-matinal',
    weeklySchedule: '/es/plan-semanal',
    neurodiverseRoutines: '/es/rutinas-ninos-neurodivergentes',
    rewardSystem: '/es/sistema-de-recompensas',
    resources: '/es/recursos',
    faq: '/es/preguntas-frecuentes',
    privacy: '/es/privacidad',
    terms: '/es/condiciones',
  }),
  it: Object.freeze({
    home: '/it',
    howItWorks: '/it/come-funziona',
    visualSchedule: '/it/schema-visivo',
    morningRoutine: '/it/routine-del-mattino',
    weeklySchedule: '/it/piano-settimanale',
    neurodiverseRoutines: '/it/routine-bambini-neurodivergenti',
    rewardSystem: '/it/sistema-di-ricompense',
    resources: '/it/risorse',
    faq: '/it/domande-frequenti',
    privacy: '/it/privacy',
    terms: '/it/condizioni',
  }),
  pl: Object.freeze({
    home: '/pl',
    howItWorks: '/pl/jak-to-dziala',
    visualSchedule: '/pl/plan-dnia-obrazkowy',
    morningRoutine: '/pl/poranna-rutyna',
    weeklySchedule: '/pl/plan-tygodnia',
    neurodiverseRoutines: '/pl/rutyny-dzieci-neuroroznorodnych',
    rewardSystem: '/pl/system-nagrod',
    resources: '/pl/materialy',
    faq: '/pl/pytania',
    privacy: '/pl/prywatnosc',
    terms: '/pl/regulamin',
  }),
  da: Object.freeze({
    home: '/da',
    howItWorks: '/da/saadan-virker-det',
    visualSchedule: '/da/visuel-dagsplan',
    morningRoutine: '/da/morgenrutine',
    weeklySchedule: '/da/ugeplan-piktogrammer',
    neurodiverseRoutines: '/da/rutiner-neurodiverse-boern',
    rewardSystem: '/da/belonningssystem',
    resources: '/da/materialer',
    faq: '/da/spoergsmaal',
    privacy: '/da/privatliv',
    terms: '/da/vilkaar',
  }),
  fi: Object.freeze({
    home: '/fi',
    howItWorks: '/fi/nain-se-toimii',
    visualSchedule: '/fi/kuvallinen-paivasuunnitelma',
    morningRoutine: '/fi/aamurutiini',
    weeklySchedule: '/fi/viikkosuunnitelma',
    neurodiverseRoutines: '/fi/rutiinit-neurokirjo',
    rewardSystem: '/fi/palkitsemisjarjestelma',
    resources: '/fi/materiaalit',
    faq: '/fi/kysymykset',
    privacy: '/fi/tietosuoja',
    terms: '/fi/kayttoehdot',
  }),
  nb: Object.freeze({
    home: '/nb',
    howItWorks: '/nb/slik-virker-det',
    visualSchedule: '/nb/visuell-dagsplan',
    morningRoutine: '/nb/morgenrutine',
    weeklySchedule: '/nb/ukeplan',
    neurodiverseRoutines: '/nb/rutiner-nevromangfoldige-barn',
    rewardSystem: '/nb/belonningssystem',
    resources: '/nb/materiell',
    faq: '/nb/sporsmal',
    privacy: '/nb/personvern',
    terms: '/nb/vilkar',
  }),
  is: Object.freeze({
    home: '/is',
    howItWorks: '/is/svona-virkar-tad',
    visualSchedule: '/is/sjonraen-dagskra',
    morningRoutine: '/is/morgunvenja',
    weeklySchedule: '/is/vikuaaetlun',
    neurodiverseRoutines: '/is/venjur-taugafraedileg-born',
    rewardSystem: '/is/umbunarkerfi',
    resources: '/is/efni',
    faq: '/is/spurningar',
    privacy: '/is/personuvernd',
    terms: '/is/skilmalar',
  }),
  pt: Object.freeze({
    home: '/pt',
    howItWorks: '/pt/como-funciona',
    visualSchedule: '/pt/horario-visual',
    morningRoutine: '/pt/rotina-da-manha',
    weeklySchedule: '/pt/plano-semanal',
    neurodiverseRoutines: '/pt/rotinas-criancas-neurodivergentes',
    rewardSystem: '/pt/sistema-de-recompensas',
    resources: '/pt/materiais',
    faq: '/pt/perguntas',
    privacy: '/pt/privacidade',
    terms: '/pt/termos',
  }),
  cs: Object.freeze({
    home: '/cs',
    howItWorks: '/cs/jak-to-funguje',
    visualSchedule: '/cs/vizualni-denni-plan',
    morningRoutine: '/cs/ranni-rutina',
    weeklySchedule: '/cs/tydenni-plan',
    neurodiverseRoutines: '/cs/rutiny-neurodivergentni-deti',
    rewardSystem: '/cs/system-odmen',
    resources: '/cs/materialy',
    faq: '/cs/otazky',
    privacy: '/cs/soukromi',
    terms: '/cs/podminky',
  }),
  sk: Object.freeze({
    home: '/sk',
    howItWorks: '/sk/ako-to-funguje',
    visualSchedule: '/sk/vizualny-denny-plan',
    morningRoutine: '/sk/ranna-rutina',
    weeklySchedule: '/sk/tyzdenny-plan',
    neurodiverseRoutines: '/sk/rutiny-neurodivergentne-deti',
    rewardSystem: '/sk/system-odmien',
    resources: '/sk/materialy',
    faq: '/sk/otazky',
    privacy: '/sk/sukromie',
    terms: '/sk/podmienky',
  }),
  sl: Object.freeze({
    home: '/sl',
    howItWorks: '/sl/kako-deluje',
    visualSchedule: '/sl/vizualni-dnevni-nacrt',
    morningRoutine: '/sl/jutranja-rutina',
    weeklySchedule: '/sl/tedenski-nacrt',
    neurodiverseRoutines: '/sl/rutine-nevroraznoliki-otroci',
    rewardSystem: '/sl/sistem-nagrad',
    resources: '/sl/gradiva',
    faq: '/sl/vprasanja',
    privacy: '/sl/zasebnost',
    terms: '/sl/pogoji',
  }),
  hr: Object.freeze({
    home: '/hr',
    howItWorks: '/hr/kako-radi',
    visualSchedule: '/hr/vizualni-dnevni-plan',
    morningRoutine: '/hr/jutarnja-rutina',
    weeklySchedule: '/hr/tjedni-plan',
    neurodiverseRoutines: '/hr/rutine-neurodivergentna-djeca',
    rewardSystem: '/hr/sustav-nagrada',
    resources: '/hr/materijali',
    faq: '/hr/pitanja',
    privacy: '/hr/privatnost',
    terms: '/hr/uvjeti',
  }),
  hu: Object.freeze({
    home: '/hu',
    howItWorks: '/hu/igy-mukodik',
    visualSchedule: '/hu/kepi-napirend',
    morningRoutine: '/hu/reggeli-rutin',
    weeklySchedule: '/hu/heti-terv',
    neurodiverseRoutines: '/hu/rutinok-neurodivergens-gyerekek',
    rewardSystem: '/hu/jutalomrendszer',
    resources: '/hu/anyagok',
    faq: '/hu/kerdesek',
    privacy: '/hu/adatvedelem',
    terms: '/hu/feltetelek',
  }),
  ro: Object.freeze({
    home: '/ro',
    howItWorks: '/ro/cum-functioneaza',
    visualSchedule: '/ro/plan-vizual-de-zi',
    morningRoutine: '/ro/rutina-de-dimineata',
    weeklySchedule: '/ro/plan-saptamanal',
    neurodiverseRoutines: '/ro/rutine-copii-neurodivergenti',
    rewardSystem: '/ro/sistem-de-recompense',
    resources: '/ro/materiale',
    faq: '/ro/intrebari',
    privacy: '/ro/confidentialitate',
    terms: '/ro/termeni',
  }),
  bg: Object.freeze({
    home: '/bg',
    howItWorks: '/bg/kak-raboti',
    visualSchedule: '/bg/vizualen-dneven-plan',
    morningRoutine: '/bg/sutreshna-rutina',
    weeklySchedule: '/bg/sedmichen-plan',
    neurodiverseRoutines: '/bg/rutini-za-neurodivergentni-detsa',
    rewardSystem: '/bg/sistema-za-nagradi',
    resources: '/bg/materiali',
    faq: '/bg/vaprosi',
    privacy: '/bg/poveritelnost',
    terms: '/bg/uslovia',
  }),
  el: Object.freeze({
    home: '/el',
    howItWorks: '/el/pos-leitourgei',
    visualSchedule: '/el/optiko-imerisio-programma',
    morningRoutine: '/el/proini-routina',
    weeklySchedule: '/el/evdomadiaio-programma',
    neurodiverseRoutines: '/el/rutines-nevrodiaphoretika-paidia',
    rewardSystem: '/el/systima-amoivon',
    resources: '/el/yliko',
    faq: '/el/erotiseis',
    privacy: '/el/aporrito',
    terms: '/el/oroi',
  }),
  et: Object.freeze({
    home: '/et',
    howItWorks: '/et/kuidas-see-tootab',
    visualSchedule: '/et/visuaalne-paevakava',
    morningRoutine: '/et/hommikurutiin',
    weeklySchedule: '/et/nadalakava',
    neurodiverseRoutines: '/et/rutiinid-neurodivergentsed-lapsed',
    rewardSystem: '/et/preemiasusteem',
    resources: '/et/materjalid',
    faq: '/et/kusimused',
    privacy: '/et/privaatsus',
    terms: '/et/tingimused',
  }),
  lv: Object.freeze({
    home: '/lv',
    howItWorks: '/lv/ka-tas-strada',
    visualSchedule: '/lv/vizuala-dienas-karte',
    morningRoutine: '/lv/ritas-rutina',
    weeklySchedule: '/lv/nedelas-plans',
    neurodiverseRoutines: '/lv/rutinas-neirodiversiem-berniem',
    rewardSystem: '/lv/atalgojuma-sistema',
    resources: '/lv/materiali',
    faq: '/lv/jautajumi',
    privacy: '/lv/privatums',
    terms: '/lv/noteikumi',
  }),
  lt: Object.freeze({
    home: '/lt',
    howItWorks: '/lt/kaip-tai-veikia',
    visualSchedule: '/lt/vaizdinis-dienos-planas',
    morningRoutine: '/lt/ryto-rutina',
    weeklySchedule: '/lt/savaites-planas',
    neurodiverseRoutines: '/lt/rutinos-neuroivairiems-vaikams',
    rewardSystem: '/lt/atlygio-sistema',
    resources: '/lt/medziaga',
    faq: '/lt/klausimai',
    privacy: '/lt/privatumas',
    terms: '/lt/salygos',
  }),
});

function pathsFor(key, base) {
  const paths = { ...base };
  for (const [localeCode, slugs] of Object.entries(LOCALE_PATHS)) {
    if (slugs[key]) paths[localeCode] = slugs[key];
  }
  return Object.freeze(paths);
}
const { chromeFor } = require('./web-locale-chrome');
const { MARKETS, campaignPath } = require('./web-markets');

const CONTENT_KEYS = Object.freeze([
  Object.freeze({
    key: 'home',
    indexable: true,
    paths: pathsFor('home', { sv: '/', en: '/en', nl: '/nl' }),
  }),
  Object.freeze({
    key: 'howItWorks',
    indexable: true,
    paths: pathsFor('howItWorks', { en: '/en/how-it-works', nl: '/nl/hoe-het-werkt' }),
  }),
  Object.freeze({
    key: 'visualSchedule',
    indexable: true,
    paths: pathsFor('visualSchedule', { sv: '/bildschema-app', en: '/en/visual-schedule-app', nl: '/nl/visueel-schema' }),
  }),
  Object.freeze({
    key: 'morningRoutine',
    indexable: true,
    paths: pathsFor('morningRoutine', { sv: '/morgonrutin-barn', en: '/en/morning-routine-children', nl: '/nl/ochtendroutine-kinderen' }),
  }),
  Object.freeze({
    key: 'weeklySchedule',
    indexable: true,
    paths: pathsFor('weeklySchedule', { sv: '/veckoschema-bildstod', en: '/en/weekly-schedule-visual-support', nl: '/nl/weekplanning-met-pictogrammen' }),
  }),
  Object.freeze({
    key: 'neurodiverseRoutines',
    indexable: true,
    paths: pathsFor('neurodiverseRoutines', { sv: '/rutiner-npf-barn', en: '/en/routines-neurodiverse-children', nl: '/nl/routines-neurodiverse-kinderen' }),
  }),
  Object.freeze({
    key: 'rewardSystem',
    indexable: true,
    paths: pathsFor('rewardSystem', { sv: '/beloningssystem-barn', en: '/en/reward-system-children', nl: '/nl/beloningssysteem-kinderen' }),
  }),
  Object.freeze({
    key: 'resources',
    indexable: true,
    paths: pathsFor('resources', { sv: '/resurser', en: '/en/resources', nl: '/nl/bronnen' }),
  }),
  Object.freeze({
    key: 'faq',
    indexable: true,
    paths: pathsFor('faq', { sv: '/faq', en: '/en/faq', nl: '/nl/faq' }),
  }),
  Object.freeze({
    key: 'privacy',
    indexable: true,
    paths: pathsFor('privacy', { sv: '/privacy', en: '/en/privacy', nl: '/nl/privacy' }),
  }),
  Object.freeze({
    key: 'terms',
    indexable: true,
    paths: pathsFor('terms', { sv: '/terms', en: '/en/terms', nl: '/nl/voorwaarden' }),
  }),
]);

const BY_PATH = new Map();
const BY_KEY = new Map();

function assertNoMarketCollision() {
  for (const entry of CONTENT_KEYS) {
    for (const [localeCode, contentPath] of Object.entries(entry.paths)) {
      const locale = localeByCode(localeCode);
      if (!locale) throw new Error(`Unknown locale on ${entry.key}: ${localeCode}`);
      const norm = normalizeWebPath(contentPath);
      if (BY_PATH.has(norm)) {
        throw new Error(`Duplicate public path ${norm}`);
      }
      BY_PATH.set(norm, entry);
      for (const market of Object.values(MARKETS)) {
        const reserved = campaignPath(market, localeCode);
        if (reserved && reserved === norm) {
          throw new Error(`Content ${entry.key} collides with market ${market.code} at ${norm}`);
        }
      }
    }
  }
  for (const entry of CONTENT_KEYS) BY_KEY.set(entry.key, entry);
}

assertNoMarketCollision();

function contentByKey(key) {
  return BY_KEY.get(key) || null;
}

function contentByPath(pathname) {
  return BY_PATH.get(normalizeWebPath(pathname)) || null;
}

function pathFor(key, localeCode) {
  const entry = contentByKey(key);
  if (!entry) return null;
  return entry.paths[localeCode] || null;
}

function localeHasSeoChrome(localeCode) {
  const locale = LOCALES[localeCode];
  if (!locale || !locale.enabled || !locale.seoEnabled || !locale.publicWeb) return false;
  const chrome = chromeFor(localeCode);
  if (!chrome || !chrome.languageLabel || !chrome.marketLabel || !chrome.home || !chrome.primaryCta || !chrome.footer) {
    return false;
  }
  for (const key of REQUIRED_SEO_CONTENT) {
    const entry = BY_KEY.get(key);
    if (!entry || !entry.paths[localeCode]) return false;
  }
  return true;
}

function indexablePathsForLocale(localeCode) {
  if (!localeHasSeoChrome(localeCode)) return [];
  return CONTENT_KEYS
    .filter((entry) => entry.indexable && entry.paths[localeCode])
    .map((entry) => entry.paths[localeCode]);
}

function alternateCodes() {
  const codes = new Set();
  for (const entry of CONTENT_KEYS) {
    Object.keys(entry.paths).forEach((code) => codes.add(code));
  }
  const head = ['sv', 'en', 'nl'].filter((code) => codes.has(code));
  const rest = [...codes].filter((code) => !head.includes(code)).sort();
  return [...head, ...rest];
}

function localeAlternates() {
  const codes = alternateCodes();
  return CONTENT_KEYS.map((entry) => {
    const row = { key: entry.key };
    for (const code of codes) row[code] = entry.paths[code] || null;
    return row;
  });
}

module.exports = {
  CONTENT_KEYS,
  contentByKey,
  contentByPath,
  pathFor,
  localeHasSeoChrome,
  indexablePathsForLocale,
  localeAlternates,
};
