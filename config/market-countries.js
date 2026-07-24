'use strict';

/**
 * Registration country list — ISO 3166-1 alpha-2.
 * market_region is derived server-side (src/lib/market-region.js); never trust client.
 */

const SWEDEN = { code: 'SE', labels: { 'sv-SE': 'Sverige', 'en-GB': 'Sweden' }, group: 'featured' };
const UNITED_KINGDOM = { code: 'GB', labels: { 'sv-SE': 'Storbritannien', 'en-GB': 'United Kingdom' }, group: 'featured' };
const UNITED_STATES = { code: 'US', labels: { 'sv-SE': 'USA', 'en-GB': 'United States' }, group: 'featured' };

/** EU + EEA + CH (GDPR-relevant registration group). */
const EU_EEA_COUNTRIES = [
  { code: 'AT', labels: { 'sv-SE': 'Österrike', 'en-GB': 'Austria' } },
  { code: 'BE', labels: { 'sv-SE': 'Belgien', 'en-GB': 'Belgium' } },
  { code: 'BG', labels: { 'sv-SE': 'Bulgarien', 'en-GB': 'Bulgaria' } },
  { code: 'HR', labels: { 'sv-SE': 'Kroatien', 'en-GB': 'Croatia' } },
  { code: 'CY', labels: { 'sv-SE': 'Cypern', 'en-GB': 'Cyprus' } },
  { code: 'CZ', labels: { 'sv-SE': 'Tjeckien', 'en-GB': 'Czechia' } },
  { code: 'DK', labels: { 'sv-SE': 'Danmark', 'en-GB': 'Denmark' } },
  { code: 'EE', labels: { 'sv-SE': 'Estland', 'en-GB': 'Estonia' } },
  { code: 'FI', labels: { 'sv-SE': 'Finland', 'en-GB': 'Finland' } },
  { code: 'FR', labels: { 'sv-SE': 'Frankrike', 'en-GB': 'France' } },
  { code: 'DE', labels: { 'sv-SE': 'Tyskland', 'en-GB': 'Germany' } },
  { code: 'GR', labels: { 'sv-SE': 'Grekland', 'en-GB': 'Greece' } },
  { code: 'HU', labels: { 'sv-SE': 'Ungern', 'en-GB': 'Hungary' } },
  { code: 'IS', labels: { 'sv-SE': 'Island', 'en-GB': 'Iceland' } },
  { code: 'IE', labels: { 'sv-SE': 'Irland', 'en-GB': 'Ireland' } },
  { code: 'IT', labels: { 'sv-SE': 'Italien', 'en-GB': 'Italy' } },
  { code: 'LV', labels: { 'sv-SE': 'Lettland', 'en-GB': 'Latvia' } },
  { code: 'LI', labels: { 'sv-SE': 'Liechtenstein', 'en-GB': 'Liechtenstein' } },
  { code: 'LT', labels: { 'sv-SE': 'Litauen', 'en-GB': 'Lithuania' } },
  { code: 'LU', labels: { 'sv-SE': 'Luxemburg', 'en-GB': 'Luxembourg' } },
  { code: 'MT', labels: { 'sv-SE': 'Malta', 'en-GB': 'Malta' } },
  { code: 'NL', labels: { 'sv-SE': 'Nederländerna', 'en-GB': 'Netherlands' } },
  { code: 'NO', labels: { 'sv-SE': 'Norge', 'en-GB': 'Norway' } },
  { code: 'PL', labels: { 'sv-SE': 'Polen', 'en-GB': 'Poland' } },
  { code: 'PT', labels: { 'sv-SE': 'Portugal', 'en-GB': 'Portugal' } },
  { code: 'RO', labels: { 'sv-SE': 'Rumänien', 'en-GB': 'Romania' } },
  { code: 'SK', labels: { 'sv-SE': 'Slovakien', 'en-GB': 'Slovakia' } },
  { code: 'SI', labels: { 'sv-SE': 'Slovenien', 'en-GB': 'Slovenia' } },
  { code: 'ES', labels: { 'sv-SE': 'Spanien', 'en-GB': 'Spain' } },
  { code: 'CH', labels: { 'sv-SE': 'Schweiz', 'en-GB': 'Switzerland' } },
];

const OTHER_COUNTRY = {
  code: 'ZZ',
  labels: { 'sv-SE': 'Annat land', 'en-GB': 'Other country' },
  group: 'featured',
};

const EU_EEA_ISO_CODES = new Set([
  'SE', ...EU_EEA_COUNTRIES.map((c) => c.code),
]);

const REGISTRATION_COUNTRIES = [
  SWEDEN,
  ...EU_EEA_COUNTRIES.filter((c) => c.code !== 'SE'),
  UNITED_KINGDOM,
  UNITED_STATES,
  OTHER_COUNTRY,
];

module.exports = {
  SWEDEN,
  UNITED_KINGDOM,
  UNITED_STATES,
  OTHER_COUNTRY,
  EU_EEA_COUNTRIES,
  EU_EEA_ISO_CODES,
  REGISTRATION_COUNTRIES,
};
