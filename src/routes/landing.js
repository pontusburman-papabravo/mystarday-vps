/**
 * Landing page routes — serves index.html (Swedish) and en.html (English).
 * Owns: slug injection, language routing.
 * Does NOT own: feature flags, analytics tracking.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getFounderStatus } = require('../lib/payment-policy');
const { getProgramCatalog } = require('../../config/program-catalog');
const { getActiveItems } = require('../../db/landing-news');
const { getPlayStoreUrl } = require('../../config/store-links');
const incidentNotice = require('../../config/incident-notice');
const {
  brandName,
  siteUrl,
  injectSiteUrl,
  injectBrandPlaceholders,
} = require('../lib/public-html-placeholders');

const router = express.Router();

function injectSocialLinks(html) {
  const slug = process.env.FACEBOOK_PAGE_SLUG || 'mystarday'; // pragma: allowlist secret
  return html.replace(/__FACEBOOK_SLUG__/g, slug);
}

function injectStoreLinks(html) {
  const playStoreUrl = getPlayStoreUrl();
  return html.replace(/__PLAY_STORE_URL__/g, playStoreUrl);
}

const STORE_BADGE_IMG_DIR = path.join(__dirname, '..', '..', 'public', 'img');
const STORE_BADGE_IMG_RE = /<img src="\/img\/(app-store-badge-sv|google-play-badge-sv)\.svg" alt="" class="store-badge" width="140" height="47">/g;
let cachedInlineStoreBadges = null;

function toInlineStoreBadgeSvg(filename) {
  const raw = fs.readFileSync(path.join(STORE_BADGE_IMG_DIR, filename), 'utf8');
  return raw
    .replace(/<\?xml[\s\S]*?\?>\s*/i, '')
    .replace(
      /<svg[^>]*>/,
      '<svg class="store-badge" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 52" width="140" height="47" aria-hidden="true" focusable="false">'
    )
    .replace(/\srole="img"/, '')
    .replace(/\saria-label="[^"]*"/, '');
}

function getInlineStoreBadges() {
  if (!cachedInlineStoreBadges) {
    cachedInlineStoreBadges = {
      'app-store-badge-sv': toInlineStoreBadgeSvg('app-store-badge-sv.svg'),
      'google-play-badge-sv': toInlineStoreBadgeSvg('google-play-badge-sv.svg'),
    };
  }
  return cachedInlineStoreBadges;
}

/** Inline store badge SVGs — external /img/*.svg in <img> breaks on iOS Safari (SW v393). */
function injectStoreBadgeSvgs(html) {
  const badges = getInlineStoreBadges();
  return html.replace(STORE_BADGE_IMG_RE, (_match, slug) => badges[slug] || _match);
}

function injectIncidentNotice(html) {
  const mountRe = /<div id="incidentNoticeMount"><\/div>/;
  if (!mountRe.test(html) || !incidentNotice.landingBannerEnabled) {
    return html.replace(mountRe, '');
  }
  const infoPath = incidentNotice.infoPagePath || '/viktig-information';
  const bannerHtml =
    '<div id="incidentNoticeBanner" class="incident-notice-banner" role="region" aria-label="Viktig information">' +
    '<div class="incident-notice-banner__inner">' +
    '<p class="incident-notice-banner__title">Viktig information om ' + esc(brandName()) + '</p>' +
    '<p class="incident-notice-banner__body">Vi har återställt tjänsten efter ett tekniskt fel. ' +
    'Uppgifter som skapades eller ändrades mellan den 30 juli och 1 augusti kan tyvärr saknas.</p>' +
    '<p class="incident-notice-banner__detail">Det kan bland annat gälla nya konton, barn, scheman, avprickade aktiviteter och intjänade stjärnor.</p>' +
    '<a href="' + infoPath + '" class="incident-notice-banner__link">Läs mer och få hjälp</a>' +
    '</div></div>';
  return html.replace(mountRe, bannerHtml);
}

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

async function serveLandingHtml(res, filename) {
  const slug = process.env.POLSIA_ANALYTICS_SLUG || '';
  const htmlPath = path.join(__dirname, '..', '..', 'public', filename);

  if (!fs.existsSync(htmlPath)) {
    return false;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace('__POLSIA_SLUG__', slug);
  html = injectBrandPlaceholders(html);
  html = injectSiteUrl(html);
  html = injectSocialLinks(html);
  html = injectStoreLinks(html);
  html = injectStoreBadgeSvgs(html);
  html = await injectLandingNews(html);
  html = injectIncidentNotice(html);
  html = injectAppMode(html);
  res.type('html').send(html);
  return true;
}

// ─── GET / — Swedish landing page ──────────────────────────
router.get('/', async (req, res) => {
  const served = await serveLandingHtml(res, 'index.html');
  if (!served) {
    res.json({ message: 'Min Stjärndag API' });
  }
});

// ─── GET /en — English landing page ────────────────────────
router.get('/en', async (req, res) => {
  const served = await serveLandingHtml(res, 'en.html');
  if (!served) {
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

// English waitlist thank-you + pain-point survey
router.get('/en/thank-you', async (req, res) => {
  const htmlPath = path.join(__dirname, '..', '..', 'public', 'en', 'thank-you.html');
  if (!fs.existsSync(htmlPath)) {
    return res.redirect(302, '/en');
  }
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = injectBrandPlaceholders(html);
  html = injectSiteUrl(html);
  html = injectSocialLinks(html);
  res.type('html').send(html);
});

// ─── GET /api/landing/stats — landing page counter data ───
// No auth — public endpoint for the family counter on the homepage
router.get('/api/landing/stats', async (req, res) => {
  try {
    const status = await getFounderStatus();
    res.json({
      count: status.count,
      limit: status.limit,
      spots_remaining: status.spots_remaining,
      price_sek: status.price_sek,
      founder_program_active: status.founder_program_active,
    });
  } catch (err) {
    console.error('[landing] stats error:', err.message);
    res.status(200).json({ count: 93, limit: 225, spots_remaining: 132, price_sek: 59, founder_program_active: true });
  }
});

router.get('/api/public/pricing-info', async (req, res) => {
  try {
    res.json(await getFounderStatus());
  } catch (err) {
    console.error('[landing] pricing-info error:', err.message);
    res.status(200).json({
      count: 0, limit: 225, spots_remaining: 225, price_sek: 59,
      payment_enabled: false, founder_program_active: true,
    });
  }
});

router.get('/api/public/program-catalog', (req, res) => {
  res.json(getProgramCatalog());
});

module.exports = router;
