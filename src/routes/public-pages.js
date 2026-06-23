// Mounted above auth middleware — serves static public pages, no auth required.
const express = require('express');
const router = express.Router();
const path = require('path');
const { hasAccess } = require('../../db/features');
const { isBillingUiEnabled } = require('../lib/billing-ui');

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
  if (req.user.type !== 'child') {
    return res.redirect(302, '/rewards');
  }
  return res.sendFile(path.join(__dirname, '../../public', 'skattkammaren-parent.html'));
});

// Registration page
router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'register.html'));
});

// Founder program info — gated until billing UI enabled (Apple review freeze)
router.get('/pricing-info', async (req, res) => {
  const billingOk = await isBillingUiEnabled();
  if (!billingOk) return res.redirect(302, '/dashboard');
  res.sendFile(path.join(__dirname, '../../public', 'pricing-info.html'));
});

// /treasury → canonical Swedish URL
router.get('/treasury', (req, res) => res.redirect(301, '/skattkammaren'));

module.exports = router;