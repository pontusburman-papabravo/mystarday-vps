/**
 * Landing page routes — serves index.html (Swedish) and en.html (English).
 * Owns: slug injection, language routing.
 * Does NOT own: feature flags, analytics tracking.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { hasAccess } = require('../../db/features');
const { getFounderCount } = require('../../db/family-stats');
const { getActiveItems } = require('../../db/landing-news');

const router = express.Router();

// Shared script injection — adds window.__APP_MODE__ for registration mode
function injectAppMode(html) {
  const injectedScript = `<script>window.__APP_MODE__ = {"mode":"registration","registration_enabled":true};</script>`;
  if (html.includes('<!-- ===== SCRIPTS ===== -->')) {
    return html.replace('<!-- ===== SCRIPTS ===== -->', injectedScript + '\n<!-- ===== SCRIPTS ===== -->');
  }
  return html.replace('</body>', injectedScript + '</body>');
}

// Escape HTML entities for safe attribute/text insertion
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Server-side renders landing news directly into the HTML (no client-side JS needed)
async function injectLandingNews(html) {
  let items = [];
  try {
    items = await getActiveItems();
  } catch (err) {
    console.error('[landing] news injection error:', err.message);
  }
  if (!items || !items.length) {
    // Hide the section entirely when no news
    return html.replace(
      /(<div id="landingNewsSection")[^>]*(>[\s\S]*?<\/div>\s*<\/div>)/,
      '$1 style="display:none"$2'
    );
  }
  // Build cards HTML server-side
  const cardsHtml = items.map(item => {
    const imgHtml = item.image_url
      ? '<div style="overflow:hidden;border-radius:14px 14px 0 0;background:#f7f3ea;">'
          + (item.button_url
              ? '<a href="' + esc(item.button_url) + '" aria-label="Läs mer" tabindex="0" style="display:block;">'
                  + '<img src="' + esc(item.image_url) + '" alt="" loading="eager" style="width:100%;display:block;object-fit:cover;max-height:240px;min-height:140px;cursor:pointer;" onerror="this.style.display=\'none\'">'
                  + '</a>'
              : '<img src="' + esc(item.image_url) + '" alt="" loading="eager" style="width:100%;display:block;object-fit:cover;max-height:240px;min-height:140px;" onerror="this.style.display=\'none\'">'
            )
          + '</div>'
      : '';
    const btnHtml = item.button_url
      ? '<a href="' + esc(item.button_url) + '" style="display:inline-block;background:var(--amber);color:#fff;text-decoration:none;padding:0.5rem 1rem;border-radius:10px;font-weight:700;font-size:0.82rem;">' + esc(item.button_text || 'Läs mer') + '</a>'
      : '';
    return '<div style="background:linear-gradient(135deg,#FFF8E6,#FFF3D6);border:2px solid rgba(245,166,35,0.25);border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(28,35,64,0.06);">'
      + imgHtml
      + '<div style="padding:1rem 1.2rem;display:flex;flex-direction:column;gap:0.4rem;">'
      + '<div style="display:flex;align-items:center;gap:0.5rem;"><span style="font-size:1.1rem;">\u{1F4F0}</span>'
      + '<h3 style="font-family:\'Fraunces\',serif;font-size:1rem;font-weight:700;color:var(--navy);letter-spacing:-0.02em;line-height:1.3;margin:0;">' + esc(item.title) + '</h3></div>'
      + (item.body ? '<p style="color:var(--text-2);font-size:0.85rem;line-height:1.5;margin:0;">' + esc(item.body) + '</p>' : '')
      + (btnHtml ? '<div style="margin-top:0.3rem;">' + btnHtml + '</div>' : '')
      + '</div></div>';
  }).join('');

  // Replace the placeholder section with the pre-rendered content (visible)
  const sectionHtml = '<div id="landingNewsSection" style="width:100%;max-width:460px;margin-bottom:1.4rem;">'
    + '<div id="landingNewsGrid" style="display:flex;flex-direction:column;gap:0.8rem;">' + cardsHtml + '</div>'
    + '</div>';
  return html.replace(
    /<div id="landingNewsSection"[^>]*>[\s\S]*?<\/div>\s*<\/div>/,
    sectionHtml
  );
}

// ─── GET / — Swedish landing page ──────────────────────────
router.get('/', async (req, res) => {
  const slug = process.env.POLSIA_ANALYTICS_SLUG || '';
  const htmlPath = path.join(__dirname, '..', '..', 'public', 'index.html');

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('__POLSIA_SLUG__', slug);
    html = await injectLandingNews(html);
    html = injectAppMode(html);
    res.type('html').send(html);
  } else {
    res.json({ message: 'Min Stjärndag API' });
  }
});

// ─── GET /en — English landing page ────────────────────────
// Gate 2G: redirect to / if engelsk_landingssida feature is OFF
router.get('/en', async (req, res) => {
  const allowed = await hasAccess(null, 'engelsk_landingssida');
  if (!allowed) return res.redirect('/');
  const slug = process.env.POLSIA_ANALYTICS_SLUG || '';
  const htmlPath = path.join(__dirname, '..', '..', 'public', 'en.html');

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('__POLSIA_SLUG__', slug);
    html = injectAppMode(html);
    res.type('html').send(html);
  } else {
    res.status(404).send('English page not found');
  }
});

// ─── GET /sv/tack — Swedish professional interest thank-you page ──
router.get('/sv/tack', async (req, res) => {
  const htmlPath = path.join(__dirname, '..', '..', 'public', 'sv-tack.html');

  if (fs.existsSync(htmlPath)) {
    res.type('html').sendFile(htmlPath);
  } else {
    res.redirect(302, '/pedagoger-och-terapeuter');
  }
});

// ─── GET /en/thank-you — English waitlist thank-you page ──
router.get('/en/thank-you', async (req, res) => {
  const slug = process.env.POLSIA_ANALYTICS_SLUG || '';
  const htmlPath = path.join(__dirname, '..', '..', 'public', 'en-thank-you.html');

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('__POLSIA_SLUG__', slug);
    res.type('html').send(html);
  } else {
    res.redirect(302, '/en');
  }
});

// ─── GET /api/landing/stats — landing page counter data ───
// No auth — public endpoint for the family counter on the homepage
router.get('/api/landing/stats', async (req, res) => {
  try {
    const count = await getFounderCount();
    res.json({ count, limit: 200 });
  } catch (err) {
    console.error('[landing] stats error:', err.message);
    res.status(200).json({ count: 93, limit: 200 }); // fail-safe: preserve last known value
  }
});

module.exports = router;