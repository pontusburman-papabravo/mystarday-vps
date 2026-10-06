'use strict';

/**
 * Presentation values for commercial emails.
 * Entitlement, dates, and the published SEK amount come from market policy.
 * The sentence around them comes from the locale bundle.
 * Does not change SE, IE, or CA rules.
 */

const { DateTime } = require('luxon');
const { validateLocale } = require('./locale');
const { t } = require('./i18n');
const {
  getMarketCommercialPolicy,
  ENTITLEMENT,
} = require('./market-commercial-policy');
const { getMarketConfig } = require('./market-config');

/** Published Basic monthly price. Copy only — not a new price. */
const PUBLISHED_SEK_MONTHLY_KR = 59;

/** IE/CA complimentary access ends at this instant (ADR-024). */
const COMPLIMENTARY_ENDS_AT = '2027-01-01T00:00:00.000Z';
const COMPLIMENTARY_ZONE = 'Europe/Dublin';

function formatOfferDate(instant, locale) {
  const tag = validateLocale(locale);
  return new Intl.DateTimeFormat(tag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: COMPLIMENTARY_ZONE,
  }).format(instant);
}

function monthlyPriceLabel(locale) {
  const per = t(locale, 'email.trialWelcome.perMonth');
  const unit = per === 'email.trialWelcome.perMonth' ? '' : per;
  if (!unit) return `${PUBLISHED_SEK_MONTHLY_KR} kr`;
  return `${PUBLISHED_SEK_MONTHLY_KR} kr/${unit}`;
}

/**
 * @param {string|null|undefined} countryCode
 * @param {{ createdAt?: Date|string|null, locale?: string|null, freeUntil?: Date|string|null }} [opts]
 */
function describeCommercialOfferCopy(countryCode, opts = {}) {
  const policy = getMarketCommercialPolicy(countryCode, { createdAt: opts.createdAt });
  const market = getMarketConfig({ countryCode: policy.countryCode, locale: opts.locale });
  const locale = validateLocale(opts.locale);
  const ends = new Date(opts.freeUntil || COMPLIMENTARY_ENDS_AT);
  const lastIncluded = DateTime.fromJSDate(ends, { zone: COMPLIMENTARY_ZONE }).minus({ days: 1 });

  const facts = {
    entitlement: policy.entitlement,
    trialDays: policy.trialDays,
    currency: market.currency,
    monthlyPrice: null,
    freeUntil: formatOfferDate(lastIncluded.toJSDate(), locale),
    paidFrom: formatOfferDate(ends, locale),
  };

  if (policy.entitlement === ENTITLEMENT.TRIAL && market.currency === 'SEK') {
    facts.monthlyPrice = monthlyPriceLabel(locale);
  }

  return facts;
}

/**
 * Locale strings filled with market facts. Same market, any locale, same facts.
 * @param {string} locale
 * @param {ReturnType<typeof describeCommercialOfferCopy>} facts
 */
function trialWelcomeMessages(locale, facts, extras = {}) {
  const lang = validateLocale(locale);
  const variant = facts.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL
    ? 'complimentary'
    : facts.entitlement === ENTITLEMENT.INTRO_YEAR
      ? 'introYear'
      : 'trial';
  const pricingKey = variant === 'trial' && !facts.monthlyPrice
    ? 'email.trialWelcome.trial.pricingOpen'
    : `email.trialWelcome.${variant}.pricing`;
  const params = {
    brand: extras.brand || '',
    trialDays: facts.trialDays,
    monthlyPrice: facts.monthlyPrice || '',
    freeUntil: facts.freeUntil,
    paidFrom: facts.paidFrom,
  };

  function msg(key) {
    return t(lang, key, params);
  }

  return {
    variant,
    subject: msg(`email.trialWelcome.${variant}.subject`),
    headerTitle: msg(`email.trialWelcome.${variant}.headerTitle`),
    intro: msg(`email.trialWelcome.${variant}.intro`),
    pricing: msg(pricingKey),
    cta: msg(`email.trialWelcome.${variant}.cta`),
    ctaHint: msg(`email.trialWelcome.${variant}.ctaHint`),
    howTitle: msg('email.trialWelcome.howTitle'),
    how1: msg('email.trialWelcome.how1'),
    how2: msg('email.trialWelcome.how2'),
    how3: msg('email.trialWelcome.how3'),
    footerIntro: msg('email.trialWelcome.footerIntro'),
    openApp: msg('email.trialWelcome.openApp'),
    headerBrand: msg('email.trialWelcome.headerBrand'),
  };
}

module.exports = {
  PUBLISHED_SEK_MONTHLY_KR,
  COMPLIMENTARY_ENDS_AT,
  describeCommercialOfferCopy,
  trialWelcomeMessages,
};
