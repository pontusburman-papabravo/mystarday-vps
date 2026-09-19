// Mounted above auth middleware — serves static public pages, no auth required.
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { hasAccess } = require('../../db/features');
const { MIRROR_ENTRIES } = require('../../config/en-public-mirror');
const {
  injectSiteUrl,
  injectBrandPlaceholders,
} = require('../lib/public-html-placeholders');
const { getPlayStoreUrl, APPLE_APP_STORE_SHORT_URL } = require('../../config/store-links');

function injectStoreLinks(html) {
  return html
    .replace(/__PLAY_STORE_URL__/g, getPlayStoreUrl())
    .replace(/__APPLE_STORE_URL__/g, APPLE_APP_STORE_SHORT_URL);
}

function defaultSupportEmail() {
  const raw = process.env.EMAIL_FROM || '';
  const angle = raw.match(/<([^>]+)>/);
  if (angle) return angle[1];
  if (raw && !raw.includes('REDACTED')) return raw;
  return ['info', '@', 'mys', 'tar', 'day', '.se'].join('');
}

function injectSupportEmail(html) {
  return html.replace(/__SUPPORT_EMAIL__/g, defaultSupportEmail());
}

// Privacy policy
router.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'privacy.html'));
});

// Contact page
router.get('/kontakt', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'kontakt.html'));
});

router.get('/support/svar/:token', async (req, res, next) => {
  const { applySupportSecurityHeaders } = require('../lib/support-security-headers');
  const {
    isLegacyToken,
    resolveSupportToken,
    migrateLegacyToOpaque,
    threadPath,
  } = require('../lib/support-reply-token');
  applySupportSecurityHeaders(res);
  try {
    const token = String(req.params.token || '').trim();
    if (isLegacyToken(token)) {
      const verified = await resolveSupportToken(token);
      if (!verified.ok) {
        return res.sendFile(path.join(__dirname, '../../public', 'support-svar.html'));
      }
      const issued = await migrateLegacyToOpaque(verified.messageId);
      return res.redirect(303, threadPath(issued.raw));
    }
    res.sendFile(path.join(__dirname, '../../public', 'support-svar.html'));
  } catch (err) {
    next(err);
  }
});

// About page (founder story)
router.get('/om-oss', (req, res) => {
  const htmlPath = path.join(__dirname, '../../public', 'om-oss.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = injectSiteUrl(html);
  html = injectBrandPlaceholders(html);
  html = injectSupportEmail(html);
  res.type('html').send(html);
});

// Service incident information (linked from landing banner)
router.get('/viktig-information', (req, res) => {
  const htmlPath = path.join(__dirname, '../../public', 'viktig-information.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = injectSiteUrl(html);
  html = injectBrandPlaceholders(html);
  html = injectSupportEmail(html);
  res.type('html').send(html);
});

// Full FAQ page
router.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'faq.html'));
});

// Terms of Service
router.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'terms.html'));
});

const { PUBLIC_WEB_ROUTES, EN_ONLY_STATIC } = require('../../config/public-web-routes');

for (const route of PUBLIC_WEB_ROUTES) {
  if (route.en === '/en') continue;
  router.get(route.en, (req, res) => {
    const htmlPath = path.join(__dirname, '../../public', route.fileEn);
    if (route.fileEn === 'en-pricing.html') {
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = injectStoreLinks(html);
      return res.type('html').send(html);
    }
    res.sendFile(htmlPath);
  });
}

for (const route of EN_ONLY_STATIC) {
  router.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', route.file));
  });
}

// English mirrors for all public subpages (resurser, SEO articles, etc.)
const mirroredEnPaths = new Set([
  ...PUBLIC_WEB_ROUTES.map((r) => r.en),
  ...EN_ONLY_STATIC.map((r) => r.path),
]);
for (const entry of MIRROR_ENTRIES) {
  if (mirroredEnPaths.has(entry.en)) continue;
  router.get(entry.en, (req, res) => {
    const htmlPath = path.join(__dirname, '../../public', entry.fileEn);
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = injectSiteUrl(html);
    html = injectBrandPlaceholders(html);
    res.type('html').send(html);
  });
}

// English PDF binaries live in public/en/resources/pdf/ (English filenames).
// Swedish filenames on the EN path stay as aliases so old links keep working.
const { englishFilenameFor } = require('../../config/resurser-catalog');
const RESURSER_PDF_DIR = path.join(__dirname, '../../public/resurser/pdf');
const EN_RESOURCES_PDF_DIR = path.join(__dirname, '../../public/en/resources/pdf');
const EN_RESOURCES_PDF_FILE_RE = /^[a-z0-9-]+\.pdf$/;

function sendPdfNoIndex(res, pdfPath) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.type('application/pdf');
  res.sendFile(pdfPath);
}

function resolveEnglishPdf(filename) {
  const direct = path.join(EN_RESOURCES_PDF_DIR, filename);
  if (fs.existsSync(direct)) return direct;
  const mapped = englishFilenameFor(filename);
  if (mapped) {
    const aliased = path.join(EN_RESOURCES_PDF_DIR, mapped);
    if (fs.existsSync(aliased)) return aliased;
  }
  const svFallback = path.join(RESURSER_PDF_DIR, filename);
  if (fs.existsSync(svFallback)) return svFallback;
  return null;
}

router.get('/en/resources/pdf/:filename', (req, res, next) => {
  const filename = String(req.params.filename || '');
  if (!EN_RESOURCES_PDF_FILE_RE.test(filename)) return next();
  const pdfPath = resolveEnglishPdf(filename);
  if (!pdfPath) return next();
  sendPdfNoIndex(res, pdfPath);
});

// Public landing page for pedagogue/therapist audience
// Gate 2F: redirect to / if professionell_landingssida feature is OFF
router.get('/pedagoger-och-terapeuter', async (req, res) => {
  const allowed = await hasAccess(null, 'professionell_landingssida');
  if (!allowed) return res.redirect('/');
  res.sendFile(path.join(__dirname, '../../public', 'pedagoger-och-terapeuter.html'));
});

// ── Additional public pages moved from server.js ──
const { optionalAuth } = require('../middleware/auth');

// Skattkammaren — demo for visitors; parent app when logged in
router.get('/skattkammaren', optionalAuth, (req, res) => {
  const forceDemo = req.query.demo === '1';
  if (req.user && req.user.type === 'child' && !forceDemo) {
    return res.redirect(302, '/child/world');
  }
  if (forceDemo || !req.user) {
    return res.sendFile(path.join(__dirname, '../../public', 'skattkammaren.html'));
  }
  // Logged-in parent — per-child treasury (child chips + star balance)
  return res.sendFile(path.join(__dirname, '../../public', 'skattkammaren-parent.html'));
});

// Registration page
router.get('/register', (req, res) => {
  const htmlPath = path.join(__dirname, '../../public', 'register.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = injectStoreLinks(html);
  html = injectBrandPlaceholders(html);
  res.type('html').send(html);
});

// Founder program / access info — public regardless of billing UI state
router.get('/pricing-info', (req, res) => {
  const htmlPath = path.join(__dirname, '../../public', 'pricing-info.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = injectStoreLinks(html);
  html = injectBrandPlaceholders(html);
  res.type('html').send(html);
});

// SEO content articles (cornerstone content for organic acquisition)
router.get('/morgonrutin-barn', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'morgonrutin-barn.html'));
});
router.get('/beloningssystem-barn', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'beloningssystem-barn.html'));
});
router.get('/rutiner-npf-barn', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'rutiner-npf-barn.html'));
});
router.get('/bildschema-app', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'bildschema-app.html'));
});
router.get('/alternativ-bildschema-tavla', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'alternativ-bildschema-tavla.html'));
});
router.get('/veckoschema-bildstod', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'veckoschema-bildstod.html'));
});

// Resursbibliotek hub + R1/R2 category/PDF pages (Phase R0–R2)
const {
  R1_CATEGORY_PAGES,
  R1_BILDKORT_PAGES,
  R1_PDF_PAGES,
} = require('../../config/resurser-r1');
const {
  R2_CATEGORY_PAGES,
  R2_BILDKORT_PAGES,
  R2_PDF_PAGES,
} = require('../../config/resurser-r2');
const { R3_LONGTAIL_PAGES, R3_PDF_PAGES } = require('../../config/resurser-r3');
const { R3_ALIAS_REDIRECTS } = require('../../config/resurser-r3-aliases');

function sendPublicHtml(relativeFile) {
  return (req, res) => {
    const htmlPath = path.join(__dirname, '../../public', relativeFile);
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = injectSiteUrl(html);
    html = injectBrandPlaceholders(html);
    res.type('html').send(html);
  };
}

router.get('/resurser', sendPublicHtml('resurser.html'));

for (const { from, to } of R3_ALIAS_REDIRECTS) {
  router.get(from, (req, res) => res.redirect(301, to));
}

for (const page of [
  ...R1_CATEGORY_PAGES,
  ...R1_BILDKORT_PAGES,
  ...R1_PDF_PAGES,
  ...R2_CATEGORY_PAGES,
  ...R2_BILDKORT_PAGES,
  ...R2_PDF_PAGES,
  ...R3_LONGTAIL_PAGES,
  ...R3_PDF_PAGES,
]) {
  router.get(page.path, sendPublicHtml(page.file));
}

// /treasury → canonical Swedish URL
router.get('/treasury', (req, res) => res.redirect(301, '/skattkammaren'));

module.exports = router;