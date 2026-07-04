// Domain redirect middleware: redirects secondary domains to main domain.
// Runs before any route handler.

const REDIRECT_DOMAINS = new Set([
  'mystarday.eu', 'www.mystarday.eu',
  'minstjärndag.se', 'www.minstjärndag.se',
  'stjärndag.se', 'www.stjärndag.se',
  'xn--minstjrndag-q8a.se', 'www.xn--minstjrndag-q8a.se',
  'xn--stjrndag-2za.se', 'www.xn--stjrndag-2za.se',
]);
const MAIN_DOMAIN = 'mystarday.se';

function createDomainRedirect() {
  return function domainRedirect(req, res, next) {
    const host = (req.headers.host || '').split(':')[0].toLowerCase();
    if (host === `www.${MAIN_DOMAIN}`) {
      return res.redirect(301, `https://${MAIN_DOMAIN}${req.originalUrl}`);
    }
    if (host && REDIRECT_DOMAINS.has(host)) {
      return res.redirect(301, `https://${MAIN_DOMAIN}${req.originalUrl}`);
    }
    next();
  };
}

module.exports = { createDomainRedirect, MAIN_DOMAIN };