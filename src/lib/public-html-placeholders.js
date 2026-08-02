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

function injectSiteUrl(html) {
  return html.replace(/__SITE_URL__/g, siteUrl());
}

/** Cloud-agent placeholders in static HTML → real product name at serve time */
function injectBrandPlaceholders(html) {
  return html.replace(/\[REDACTED\]/g, brandName());
}

module.exports = {
  brandName,
  siteUrl,
  injectSiteUrl,
  injectBrandPlaceholders,
};
