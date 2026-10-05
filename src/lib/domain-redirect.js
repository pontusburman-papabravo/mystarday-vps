// Domain redirect middleware: canonicalizes hostnames before route handlers. // pragma: allowlist secret
// mystarday.se = Swedish main site; mystarday.app = international site; mystarday.eu → mystarday.app. // pragma: allowlist secret

const MAIN_DOMAIN = 'mystarday.se'; // pragma: allowlist secret
const APP_DOMAIN = 'mystarday.app'; // pragma: allowlist secret

const REDIRECT_TO_MAIN = new Set([
  'minstjärndag.se', 'www.minstjärndag.se',
  'stjärndag.se', 'www.stjärndag.se',
  'xn--minstjrndag-q8a.se', 'www.xn--minstjrndag-q8a.se',
  'xn--stjrndag-2za.se', 'www.xn--stjrndag-2za.se',
]);

const EU_REDIRECT_DOMAINS = new Set([ // pragma: allowlist secret
  'mystarday.eu', 'www.mystarday.eu', // pragma: allowlist secret
]);

const { sanitizeReturnUrl } = require('./sanitize-return-url');

/** Auth/account pages stay on the app host. Marketing /en pages move to .app. */
const ENGLISH_AUTH_PATHS = new Set([
  '/en/login',
  '/en/register',
  '/en/forgot-password',
]);

function englishMarketingPathname(pathname) {
  const raw = String(pathname || '/').split('?')[0].split('#')[0];
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
  return raw || '/';
}

function splitSafeUrl(safePath) {
  const u = new URL(safePath || '/', 'https://local.invalid');
  return {
    pathname: u.pathname || '/',
    search: u.search || '',
    hash: u.hash || '',
  };
}

function swedishIndexablePaths() {
  const { SEO_INDEXABLE_PATHS } = require('./seo-pages');
  return SEO_INDEXABLE_PATHS;
}

function isEnglishPublicMarketingPath(pathname) {
  const path = englishMarketingPathname(pathname);
  if (path === '/en') return true;
  if (!path.startsWith('/en/')) return false;
  if (ENGLISH_AUTH_PATHS.has(path)) return false;
  if (path.startsWith('/en/api')) return false;
  return true;
}

/** Swedish documents that should rank on .se. Never includes /en (that would loop). */
function isSwedishCanonicalPath(pathname) {
  const path = englishMarketingPathname(pathname);
  if (!path || path === '/' || path === '/en' || path.startsWith('/en/')) return false;
  return swedishIndexablePaths().has(path);
}

function createDomainRedirect() {
  return function domainRedirect(req, res, next) {
    const host = (req.headers.host || '').split(':')[0].toLowerCase();
    const safePath = sanitizeReturnUrl(req.originalUrl || '/');
    const method = String(req.method || 'GET').toUpperCase();
    const parts = splitSafeUrl(safePath);
    const pathname = englishMarketingPathname(parts.pathname);
    const trailingSlash = parts.pathname.length > 1 && parts.pathname.endsWith('/');
    const onSwedishHost = host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`;
    const onAppHost = host === APP_DOMAIN || host === `www.${APP_DOMAIN}`;
    const safeRead = method === 'GET' || method === 'HEAD';
    if (onSwedishHost && safeRead && isEnglishPublicMarketingPath(pathname)) {
      return res.redirect(301, `https://${APP_DOMAIN}${pathname}${parts.search}${parts.hash}`);
    }
    if (onAppHost && safeRead && (pathname === '/' || pathname === '')) {
      return res.redirect(301, `https://${APP_DOMAIN}/en${parts.search}${parts.hash}`);
    }
    if (onAppHost && safeRead && isSwedishCanonicalPath(pathname)) {
      return res.redirect(301, `https://${MAIN_DOMAIN}${pathname}${parts.search}${parts.hash}`);
    }
    if (onAppHost && safeRead && isEnglishPublicMarketingPath(pathname) && trailingSlash) {
      return res.redirect(301, `https://${APP_DOMAIN}${pathname}${parts.search}${parts.hash}`);
    }
    if (host === `www.${MAIN_DOMAIN}`) {
      return res.redirect(301, `https://${MAIN_DOMAIN}${safePath}`);
    }
    if (host === `www.${APP_DOMAIN}`) {
      return res.redirect(301, `https://${APP_DOMAIN}${safePath}`);
    }
    if (host && EU_REDIRECT_DOMAINS.has(host)) {
      return res.redirect(301, `https://${APP_DOMAIN}${safePath}`);
    }
    if (host && REDIRECT_TO_MAIN.has(host)) {
      return res.redirect(301, `https://${MAIN_DOMAIN}${safePath}`);
    }
    next();
  };
}

module.exports = {
  createDomainRedirect,
  MAIN_DOMAIN,
  APP_DOMAIN,
  REDIRECT_TO_MAIN,
  EU_REDIRECT_DOMAINS,
  ENGLISH_AUTH_PATHS,
  isEnglishPublicMarketingPath,
  isSwedishCanonicalPath,
};
