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

function createDomainRedirect() {
  return function domainRedirect(req, res, next) {
    const host = (req.headers.host || '').split(':')[0].toLowerCase();
    if (host === `www.${MAIN_DOMAIN}`) {
      return res.redirect(301, `https://${MAIN_DOMAIN}${req.originalUrl}`);
    }
    if (host === `www.${APP_DOMAIN}`) {
      return res.redirect(301, `https://${APP_DOMAIN}${req.originalUrl}`);
    }
    if (host && EU_REDIRECT_DOMAINS.has(host)) {
      return res.redirect(301, `https://${APP_DOMAIN}${req.originalUrl}`);
    }
    if (host && REDIRECT_TO_MAIN.has(host)) {
      return res.redirect(301, `https://${MAIN_DOMAIN}${req.originalUrl}`);
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
};
