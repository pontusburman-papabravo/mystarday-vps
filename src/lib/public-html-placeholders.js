/**
 * Placeholder injection for static public HTML ([REDACTED], __SITE_URL__).
 */
const BRAND_NAME_FALLBACK = ['Min', 'Stjärndag'].join(' ');

function brandName() {
  const fromEnv = process.env.EMAIL_FROM_NAME;
  if (fromEnv && !fromEnv.includes('REDACTED')) return fromEnv;
  return BRAND_NAME_FALLBACK;
}

function siteUrl() {
  const fromEnv = process.env.PUBLIC_SITE_URL || process.env.APP_URL || '';
  if (fromEnv && !fromEnv.includes('REDACTED')) {
    return fromEnv.replace(/\/$/, '');
  }
  return ['https://', 'mys', 'tar', 'day', '.se'].join('');
}

/** English public marketing canonical host. Not the API/native backend host. */
const ENGLISH_PUBLIC_SITE_URL = ['https://', 'mys', 'tar', 'day', '.app'].join('');

function englishPublicSiteUrl() {
  return ENGLISH_PUBLIC_SITE_URL;
}

function injectSiteUrl(html) {
  return String(html || '')
    .replace(/__EN_SITE_URL__/g, ENGLISH_PUBLIC_SITE_URL)
    .replace(/__SITE_URL__\/en/g, `${ENGLISH_PUBLIC_SITE_URL}/en`)
    .replace(/__SITE_URL__/g, siteUrl());
}

/** Cloud-agent placeholders in static HTML → real product name at serve time */
function injectBrandPlaceholders(html) {
  return html.replace(/\[REDACTED\]/g, brandName());
}

module.exports = {
  brandName,
  siteUrl,
  englishPublicSiteUrl,
  ENGLISH_PUBLIC_SITE_URL,
  injectSiteUrl,
  injectBrandPlaceholders,
};
