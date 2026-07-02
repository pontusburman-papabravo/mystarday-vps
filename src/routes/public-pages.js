// Mounted above auth middleware — serves static public pages, no auth required.
const express = require('express');
const router = express.Router();
const path = require('path');
const { hasAccess } = require('../../db/features');

// Privacy policy
router.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'privacy.html'));
});

// Contact page
router.get('/kontakt', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'kontakt.html'));
});

// Full FAQ page
router.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'faq.html'));
});

// Terms of Service
router.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'terms.html'));
});

// English landing page — Gate 2G: redirect to / if engelsk_landingssida feature is OFF
router.get('/en', async (req, res) => {
  const allowed = await hasAccess(null, 'engelsk_landingssida');
  if (!allowed) return res.redirect('/');
  res.sendFile(path.join(__dirname, '../../public', 'en.html'));
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

function sendPublicHtml(relativeFile) {
  return (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', relativeFile));
  };
}

router.get('/resurser', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'resurser.html'));
});

for (const page of [
  ...R1_CATEGORY_PAGES,
  ...R1_BILDKORT_PAGES,
  ...R1_PDF_PAGES,
  ...R2_CATEGORY_PAGES,
  ...R2_BILDKORT_PAGES,
  ...R2_PDF_PAGES,
]) {
  router.get(page.path, sendPublicHtml(page.file));
}

// /treasury → canonical Swedish URL
router.get('/treasury', (req, res) => res.redirect(301, '/skattkammaren'));

module.exports = router;