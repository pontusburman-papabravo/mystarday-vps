'use strict';

/**
 * Public landing offer for one chosen country and one display language.
 * Country, price, places and store links come from the existing market modules.
 * A place count is included only while the launch offer is actually open.
 */

const { normalizeLocale } = require('./locale');
const { REGISTRATION_COUNTRIES } = require('../../config/market-countries');
const { publishedLocales } = require('../../config/web-locales');
const { hasLocalePages } = require('../../content/locale-pages');
const { marketByCode, playUrlForMarket } = require('../../config/web-markets');
const {
  APPLE_APP_STORE_SHORT_URL,
  APPLE_APP_STORE_GEO_NEUTRAL_URL,
  getPlayStoreUrl,
} = require('../../config/store-links');
const storeMarkets = require('../../store/markets.json');
const { describeCommercialOfferCopy } = require('./commercial-offer-copy');
const { ENTITLEMENT } = require('./market-commercial-policy');
const { evaluatePublicSignupReadiness } = require('./market-launch-invariants');
const { describePublicLaunchCohortOffer } = require('../../db/launch-cohort-offer');
const { swedishOrigin, englishOrigin } = require('./public-seo');

const CHROME_FALLBACK = 'en-GB';

const CHROME = Object.freeze({
  'en-GB': Object.freeze({
    countryLabel: 'Country',
    languageLabel: 'Language',
    chooseCountry: 'Choose country',
    suggestedHint: 'Suggested from this browser. It is not a confirmed country of residence.',
    explicitHint: 'Country and language are separate. You still confirm the country when you create an account.',
    fallbackNotice: 'These offer labels are shown in English. A full translation of this offer is not available in the selected language.',
    notReserved: 'A place shown here is not held until registration is complete.',
    premiumWhat: 'Premium is the full app: routines, picture support, stars and the Treasure Chamber.',
    premiumWhy: 'The first 25 families in a newly opened country can use Premium free for 12 months.',
    comingSoonTitle: 'Not open yet',
    comingSoonBody: 'My Starday is not open for registration in {country} yet.',
    fullTitle: 'The launch offer is full',
    fullBody: 'All {limit} founding places in {country} are assigned.',
    forCountry: 'For the first {limit} families in {country}.',
    progressLabel: '{assigned} of {limit} assigned',
    remainingLabel: '{remaining} of {limit} places left',
    swedenTrial: 'New families in Sweden get {days} days, then Premium at {price} in the app. Nothing is charged automatically when the trial ends.',
    complimentary: 'Free in {country} until {date}. No payment method is required during that period. It does not become a subscription by itself.',
    trialOther: 'New families get {days} days. The price is shown in the app before you pay. Nothing is charged automatically.',
    introYear: 'The existing Swedish offer for families who already have an account stays in place.',
    afterMonths: 'After 12 months, free Premium stops. Nothing is charged automatically.',
    noAutoCharge: 'Nothing is charged automatically.',
    cohortTitle: '12 months of Premium, free',
    ctaCohort: 'Get 12 months free',
    ctaRegister: 'Create an account',
    ctaClosed: 'Join the waitlist',
    ctaBilling: 'Payment is not available yet',
    confirmResidence: 'You still confirm the country of residence when you create the account.',
    storesUnavailable: 'The App Store and Google Play listings are not available for this country yet. Web registration still follows the country gate.',
    storesUnknown: 'Store availability for this country is not confirmed, so download buttons stay hidden.',
    loadError: 'The offer could not be loaded. This page is not stating how many places are left.',
  }),
  'sv-SE': Object.freeze({
    countryLabel: 'Land',
    languageLabel: 'Språk',
    chooseCountry: 'Välj land',
    suggestedHint: 'Förslag från webbläsaren. Det är inte ett bekräftat bosättningsland.',
    explicitHint: 'Land och språk är skilda val. Du bekräftar landet när kontot skapas.',
    fallbackNotice: 'De här erbjudandetexterna visas på engelska. En fullständig översättning saknas för det valda språket.',
    notReserved: 'En plats som visas här är inte reserverad förrän registreringen är klar.',
    premiumWhat: 'Premium är hela appen: rutiner, bildstöd, stjärnor och Skattkammaren.',
    premiumWhy: 'De första 25 familjerna i ett nyligen öppnat land kan använda Premium utan kostnad i 12 månader.',
    comingSoonTitle: 'Inte öppet ännu',
    comingSoonBody: 'My Starday är inte öppet för registrering i {country} ännu.',
    fullTitle: 'Lanseringserbjudandet är fulltecknat',
    fullBody: 'Alla {limit} platser för de första familjerna i {country} är tilldelade.',
    forCountry: 'För de första {limit} familjerna i {country}.',
    progressLabel: '{assigned} av {limit} tilldelade',
    remainingLabel: '{remaining} av {limit} platser kvar',
    swedenTrial: 'Nya familjer i Sverige får {days} dagar, därefter Premium för {price} i appen. Ingenting dras automatiskt när provperioden tar slut.',
    complimentary: 'Gratis i {country} till {date}. Ingen betalmetod behövs under den perioden. Det blir inte ett abonnemang av sig självt.',
    trialOther: 'Nya familjer får {days} dagar. Priset visas i appen innan ni betalar. Ingenting dras automatiskt.',
    introYear: 'Det befintliga svenska erbjudandet för familjer som redan har konto ligger kvar.',
    afterMonths: 'Efter 12 månader upphör gratis Premium. Ingenting dras automatiskt.',
    noAutoCharge: 'Ingenting dras automatiskt.',
    cohortTitle: '12 månader Premium utan kostnad',
    ctaCohort: 'Få 12 månader utan kostnad',
    ctaRegister: 'Skapa konto',
    ctaClosed: 'Ställ dig på väntelistan',
    ctaBilling: 'Betalning är inte tillgänglig ännu',
    confirmResidence: 'Du bekräftar fortfarande bosättningsland när kontot skapas.',
    storesUnavailable: 'App Store och Google Play är inte tillgängliga för det här landet ännu. Webbregistrering följer ändå landets grind.',
    storesUnknown: 'Butikens tillgänglighet för det här landet är inte bekräftad, så nedladdningsknapparna visas inte.',
    loadError: 'Erbjudandet kunde inte hämtas. Sidan säger inget om hur många platser som finns kvar.',
  }),
});

function fill(template, params) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => (
    params[key] == null ? '' : String(params[key])
  ));
}

function countryName(code, locale) {
  const entry = REGISTRATION_COUNTRIES.find((row) => row.code === code);
  if (!entry) return code || '';
  const tag = normalizeLocale(locale) || CHROME_FALLBACK;
  if (tag === 'sv-SE' && entry.labels['sv-SE']) return entry.labels['sv-SE'];
  return entry.labels['en-GB'] || code;
}

function chromeFor(locale) {
  const tag = normalizeLocale(locale) || CHROME_FALLBACK;
  if (CHROME[tag]) return { locale: tag, fallback: false, strings: CHROME[tag] };
  return { locale: CHROME_FALLBACK, fallback: true, strings: CHROME[CHROME_FALLBACK] };
}

function landingLanguages() {
  return publishedLocales()
    .filter((locale) => locale.code === 'sv' || locale.code === 'en' || hasLocalePages(locale.code))
    .map((locale) => {
      const home = locale.code === 'sv' ? '/' : locale.pathPrefix;
      const origin = locale.code === 'sv' ? swedishOrigin() : englishOrigin();
      return {
        code: locale.code,
        native_name: locale.nativeName,
        home,
        home_url: `${origin}${home}`,
        app_locale: normalizeLocale(locale.code) || CHROME_FALLBACK,
        page: (locale.code === 'sv' || locale.code === 'en') ? 'full' : 'locale',
      };
    });
}

function publicStores(countryCode) {
  const rows = Array.isArray(storeMarkets.markets) ? storeMarkets.markets : [];
  const row = rows.find((item) => item.id === countryCode);
  if (!row || !row.activation) {
    return { ios: 'unknown', android: 'unknown', ios_url: null, android_url: null };
  }
  if (row.activation !== 'live') {
    return { ios: 'unavailable', android: 'unavailable', ios_url: null, android_url: null };
  }
  const market = marketByCode(countryCode);
  let iosUrl = countryCode === 'SE' ? APPLE_APP_STORE_SHORT_URL : APPLE_APP_STORE_GEO_NEUTRAL_URL;
  let android = 'available';
  let androidUrl = getPlayStoreUrl();
  if (market) {
    if (market.appleUrl) iosUrl = market.appleUrl;
    const play = playUrlForMarket(market);
    if (!play) {
      android = 'unavailable';
      androidUrl = null;
    } else {
      androidUrl = play;
    }
  }
  return {
    ios: 'available',
    android,
    ios_url: iosUrl,
    android_url: androidUrl,
  };
}

function commercialText(strings, facts, country, countryCode) {
  if (!facts) return '';
  if (facts.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL) {
    return fill(strings.complimentary, { country, date: facts.freeUntil });
  }
  if (countryCode === 'SE' && facts.entitlement === ENTITLEMENT.TRIAL) {
    const price = facts.monthlyPrice ? String(facts.monthlyPrice) : '';
    return fill(strings.swedenTrial, { days: facts.trialDays, price });
  }
  if (facts.entitlement === ENTITLEMENT.TRIAL) {
    return fill(strings.trialOther, { days: facts.trialDays });
  }
  return strings.introYear;
}

function emptyCounts() {
  return { slot_limit: null, slots_assigned: null, slots_remaining: null };
}

/**
 * Pure view model. Counts stay null unless the cohort phase is active or full.
 */
function presentLandingExperience(input) {
  const countryCode = input.countryCode || null;
  const chrome = chromeFor(input.locale);
  const strings = chrome.strings;
  const name = countryCode ? countryName(countryCode, chrome.locale) : '';
  const facts = input.commercial || null;
  const cohort = input.cohort || {};
  const readiness = input.readiness || {};
  const marketOpen = readiness.marketOpen === true;
  const signupAllowed = readiness.allowed === true;
  const phase = marketOpen && (cohort.phase === 'active' || cohort.phase === 'full')
    ? cohort.phase
    : 'hidden';
  const counts = phase === 'hidden' ? emptyCounts() : {
    slot_limit: Number.isInteger(cohort.slot_limit) ? cohort.slot_limit : null,
    slots_assigned: Number.isInteger(cohort.slots_assigned) ? cohort.slots_assigned : null,
    slots_remaining: Number.isInteger(cohort.slots_remaining) ? cohort.slots_remaining : null,
  };

  let status = 'choose_country';
  if (!countryCode) status = 'choose_country';
  else if (!marketOpen) status = 'coming_soon';
  else if (phase === 'active') status = 'launch_cohort';
  else if (phase === 'full' && signupAllowed) status = 'ordinary_after_full';
  else if (phase === 'full') status = 'full_unavailable';
  else if (signupAllowed) status = 'ordinary';
  else status = 'open_unavailable';

  const showCommercial = status === 'ordinary'
    || status === 'ordinary_after_full'
    || status === 'open_unavailable';

  return {
    country_code: countryCode,
    country_name: name || null,
    display_locale: normalizeLocale(input.locale) || CHROME_FALLBACK,
    copy_locale: chrome.locale,
    copy_fallback: chrome.fallback,
    registration_open: marketOpen,
    signup_allowed: signupAllowed,
    signup_reason: readiness.reason || readiness.code || null,
    coming_soon: status === 'coming_soon',
    status,
    commercial: facts ? {
      entitlement: facts.entitlement,
      trial_days: facts.trialDays,
      currency: facts.currency,
      monthly_price: countryCode === 'SE' ? facts.monthlyPrice : null,
      free_until: facts.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL ? facts.freeUntil : null,
    } : null,
    launch_cohort: {
      phase,
      offer_enabled: marketOpen && cohort.offer_enabled === true,
      slot_limit: counts.slot_limit,
      slots_assigned: counts.slots_assigned,
      slots_remaining: counts.slots_remaining,
    },
    stores: input.stores || { ios: 'unknown', android: 'unknown', ios_url: null, android_url: null },
    languages: input.languages || [],
    copy: {
      country_label: strings.countryLabel,
      language_label: strings.languageLabel,
      choose_country: strings.chooseCountry,
      suggested_hint: strings.suggestedHint,
      explicit_hint: strings.explicitHint,
      fallback_notice: chrome.fallback ? strings.fallbackNotice : null,
      not_reserved: phase === 'active' ? strings.notReserved : null,
      premium_what: strings.premiumWhat,
      premium_why: phase === 'active' ? strings.premiumWhy : null,
      coming_soon_title: strings.comingSoonTitle,
      coming_soon_body: fill(strings.comingSoonBody, { country: name }),
      full_title: strings.fullTitle,
      full_body: fill(strings.fullBody, { country: name, limit: counts.slot_limit }),
      for_country: fill(strings.forCountry, { country: name, limit: counts.slot_limit }),
      progress_label: counts.slot_limit != null
        ? fill(strings.progressLabel, { assigned: counts.slots_assigned, limit: counts.slot_limit })
        : null,
      remaining_label: counts.slots_remaining != null
        ? fill(strings.remainingLabel, { remaining: counts.slots_remaining, limit: counts.slot_limit })
        : null,
      commercial_text: showCommercial ? commercialText(strings, facts, name, countryCode) : null,
      cohort_title: cohort.copy && cohort.copy.title ? cohort.copy.title : strings.cohortTitle,
      cohort_headline: phase === 'active' && cohort.copy ? cohort.copy.headline : null,
      cohort_duration: phase === 'active' && cohort.copy ? cohort.copy.duration : null,
      no_payment_method: phase === 'active' && cohort.copy ? cohort.copy.no_payment_method : null,
      no_auto_charge: phase === 'active' && cohort.copy
        ? cohort.copy.no_auto_charge
        : (showCommercial ? strings.noAutoCharge : null),
      after: phase === 'active' && cohort.copy && cohort.copy.after
        ? cohort.copy.after
        : (phase === 'active' ? strings.afterMonths : null),
      cta: status === 'launch_cohort'
        ? strings.ctaCohort
        : (signupAllowed ? strings.ctaRegister : (status === 'coming_soon' ? strings.ctaClosed : strings.ctaBilling)),
      confirm_residence: strings.confirmResidence,
      stores_unavailable: strings.storesUnavailable,
      stores_unknown: strings.storesUnknown,
      load_error: strings.loadError,
    },
  };
}

async function loadLandingExperience(countryCode, locale) {
  const languages = landingLanguages();
  const cc = countryCode || null;
  if (!cc) {
    return presentLandingExperience({
      countryCode: null,
      locale,
      commercial: null,
      cohort: { phase: 'hidden' },
      readiness: { marketOpen: false, allowed: false },
      stores: { ios: 'unknown', android: 'unknown', ios_url: null, android_url: null },
      languages,
    });
  }
  const known = REGISTRATION_COUNTRIES.some((row) => row.code === cc);
  if (!known) {
    const err = new Error('Unknown country');
    err.status = 400;
    err.apiCode = 'MARKET_COUNTRY_UNKNOWN';
    throw err;
  }
  const [readiness, cohort] = await Promise.all([
    evaluatePublicSignupReadiness(cc),
    describePublicLaunchCohortOffer(cc, locale),
  ]);
  const commercial = describeCommercialOfferCopy(cc, { createdAt: new Date(), locale });
  return presentLandingExperience({
    countryCode: cc,
    locale,
    commercial,
    cohort,
    readiness,
    stores: publicStores(cc),
    languages,
  });
}

module.exports = {
  CHROME_FALLBACK,
  landingLanguages,
  publicStores,
  presentLandingExperience,
  loadLandingExperience,
  countryName,
};
