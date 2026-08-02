// Mounted above auth middleware — serves static public pages, no auth required.
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { hasAccess } = require('../../db/features');
const { MIRROR_ENTRIES } = require('../../config/en-public-mirror');

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

// Service incident information (linked from landing banner)
router.get('/viktig-information', (req, res) => {
  const htmlPath = path.join(__dirname, '../../public', 'viktig-information.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
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
    res.sendFile(path.join(__dirname, '../../public', route.fileEn));
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
    res.sendFile(path.join(__dirname, '../../public', entry.fileEn));
  });
}

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
  res.sendFile(path.join(__dirname, '../../public', 'register.html'));
});

// Founder program / access info — public regardless of billing UI state
router.get('/pricing-info', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'pricing-info.html'));
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
    res.sendFile(path.join(__dirname, '../../public', relativeFile));
  };
}

router.get('/resurser', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'resurser.html'));
});

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