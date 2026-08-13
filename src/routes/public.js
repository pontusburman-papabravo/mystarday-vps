const express = require('express');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const db = require('../lib/db');
const { sendEmail, isTestMailbox } = require('../lib/email');
const { maskEmail } = require('../lib/log-redact');
const { createProfessionalInterest } = require('../../db/professional-interest');
const {
  addWaitlistEntry,
  updateWaitlistSurvey,
  markWaitlistSkipped,
} = require('../../db/waitlist');
const { WAITLIST_COUNTRIES, WAITLIST_COUNTRY_CODES } = require('../../config/market-countries');
const { subscribePublic, VALID_COMPONENTS } = require('../../db/public-newsletter');
const { getAllPreviewPackages } = require('../../config/preview-data');
const shareLink = require('../../db/professional-share-link');

const router = express.Router();

// 5 professional-interest submissions per IP per hour
const professionalInterestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `profi:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'För många försök. Försök igen om en timme.' });
  },
});

// 10 waitlist signups per IP per hour
const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `waitlist:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many attempts. Please try again in an hour.' });
  },
});

const publicNewsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `pubnews:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'För många försök. Försök igen om en timme.' });
  },
});

// ─── POST /api/contact ──────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Alla fält krävs' });
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Ogiltig e-postadress' });
    }
    if (message.trim().length < 10) {
      return res.status(400).json({ error: 'Meddelandet måste vara minst 10 tecken' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Store in DB with message_type = 'contact'
    await db.query(
      'INSERT INTO contact_message (name, email, message, message_type) VALUES ($1, $2, $3, $4)',
      [name.trim(), normalizedEmail, message.trim(), 'contact']
    );

    if (!isTestMailbox(normalizedEmail)) {
      const safeName = escapeHtml(name.trim());
      const safeEmail = escapeHtml(normalizedEmail);
      const safeMessage = escapeHtml(message.trim());
      await sendEmail({
      to: 'info@mystarday.se',
      subject: `Kontaktformulär — ${name.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">Nytt meddelande från Stjärndag</h2>
          <p><strong>Namn:</strong> ${safeName}</p>
          <p><strong>E-post:</strong> ${safeEmail}</p>
          <p><strong>Meddelande:</strong></p>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${safeMessage}</p>
        </div>
      `,
      });
    } else {
      console.log(`[CONTACT] Skipping owner email for test mailbox ${maskEmail(normalizedEmail)}`);
    }

    res.json({ message: 'Tack! Vi har tagit emot ditt meddelande.' });
  } catch (err) {
    console.error('[CONTACT] Error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/family-count ───────────────────────────────
// Public endpoint: returns number of registered families (for landing page counter)
router.get('/family-count', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM family WHERE archived_at IS NULL'
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('[PUBLIC] Family count error:', err);
    res.status(503).json({ error: 'Tjänsten är tillfälligt otillgänglig' });
  }
});

// ─── GET /api/registration-status ───────────────────────
// Registration is always open — no feature flag needed.
router.get('/registration-status', (req, res) => {
  res.json({ mode: 'registration', registration_enabled: true, payment_mode: false });
});

// ─── GET /api/app-config ─────────────────────────────────
// Klient feature flags + observability (Sprint 3c, 4, 14). Ingen PII.
router.get('/app-config', (req, res) => {
  const commit =
    process.env.RENDER_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'dev';
  const configuredRedirect = (process.env.APPLE_WEB_REDIRECT_URI || process.env.APP_URL || '')
    .replace(/\/$/, '');
  const requestOrigin = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
  res.json({
    parental_gate_enabled: process.env.PARENTAL_GATE_ENABLED !== 'false',
    native_tabbar_enabled: process.env.NATIVE_TABBAR_ENABLED !== 'false',
    sentryDsn: process.env.SENTRY_DSN || process.env.SENTRY_DSN_PUBLIC || '',
    native_debug_overlay: process.env.NATIVE_DEBUG_OVERLAY === 'true',
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
    // Web Sign in with Apple requires the Services ID — never fall back to bundle ID.
    appleClientId: process.env.APPLE_CLIENT_ID || '',
    appleWebRedirectUri: configuredRedirect || requestOrigin,
    release: `stjarndag@${(process.env.npm_package_version || '1.0.0')}+${commit.slice(0, 7)}`,
    buildId: commit,
  });
});

// ─── POST /api/client-log ─────────────────────────────────
// Lightweight client diagnostics (no PII). Used by Apple Sign In step logging.
const clientLogLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `clientlog:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ ok: false });
  },
});

const CLIENT_LOG_CHANNELS = new Set(['apple_sign_in', 'native_debug', 'android_stability', 'trusted_profile_unlock']);

router.post('/client-log', clientLogLimiter, (req, res) => {
  const { channel, step, detail, ts, native, ios, applePlugin, android } = req.body || {};
  if (!channel || !CLIENT_LOG_CHANNELS.has(channel) || !step) {
    return res.status(400).json({ ok: false });
  }
  console.log('[CLIENT-LOG]', JSON.stringify({
    channel,
    step,
    detail: detail || null,
    ts: ts || Date.now(),
    native: !!native,
    ios: !!ios,
    android: !!android,
    applePlugin: !!applePlugin,
    ip: req.ip,
    ua: (req.get('user-agent') || '').slice(0, 120),
  }));
  res.json({ ok: true });
});

// ─── POST /api/public/professional-interest ──────────────
// Public form submission from /pedagoger-och-terapeuter — no auth required.
const VALID_ROLES = ['Arbetsterapeut', 'Logoped', 'Specialpedagog', 'Psykolog', 'Annan'];

router.post('/public/professional-interest', professionalInterestLimiter, async (req, res) => {
  try {
    const { name, email, role, organization, message, gdprConsent } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Namn krävs (minst 2 tecken)' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Ogiltig e-postadress' });
    }
    if (!role || typeof role !== 'string' || role.trim().length < 2) {
      return res.status(400).json({ error: 'Roll krävs' });
    }
    if (!gdprConsent) {
      return res.status(400).json({ error: 'Du måste godkänna att vi sparar dina uppgifter' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();
    const normalizedRole = role.trim().substring(0, 100);
    const normalizedOrg = organization ? String(organization).trim().substring(0, 255) : null;
    const normalizedMsg = message ? String(message).trim().substring(0, 2000) : null;
    const ipAddress = req.ip || null;

    const row = await createProfessionalInterest({
      name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
      organization: normalizedOrg,
      message: normalizedMsg,
      gdprConsent: true,
      ipAddress,
    });

    if (!isTestMailbox(normalizedEmail)) {
    sendEmail({
      to: normalizedEmail,
      subject: 'Tack för ditt intresse — Min Stjärndag',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">Tack för ditt intresse, ${normalizedName}! ⭐</h2>
          <p>Vi har tagit emot din intresseanmälan och återkommer inom kort med mer information om hur Min Stjärndag kan användas i er verksamhet.</p>
          <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">
            Har du frågor i mellantiden? Kontakta oss på
            <a href="mailto:info@mystarday.se" style="color: #F5A623;">info@mystarday.se</a>
          </p>
          <p style="color: #5A6178; font-size: 12px; margin-top: 16px;">
            Dina uppgifter sparas i enlighet med vår
            <a href="https://mystarday.se/privacy" style="color: #F5A623;">integritetspolicy</a>.
            Vi delar inte dina uppgifter med tredje part.
          </p>
        </div>
      `,
    }).catch(() => {}); // Non-blocking — don't fail the request if email fails

    // Notify admin
    sendEmail({
      to: 'info@mystarday.se',
      subject: `Ny intresseanmälan — ${normalizedName} (${normalizedRole})`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">Ny intresseanmälan från pedagogsidan</h2>
          <p><strong>Namn:</strong> ${normalizedName}</p>
          <p><strong>E-post:</strong> ${normalizedEmail}</p>
          <p><strong>Roll:</strong> ${normalizedRole}</p>
          ${normalizedOrg ? `<p><strong>Organisation:</strong> ${normalizedOrg}</p>` : ''}
          ${normalizedMsg ? `<p><strong>Meddelande:</strong></p><p style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${normalizedMsg}</p>` : ''}
        </div>
      `,
    }).catch(() => {});
    } else {
      console.log(`[PROFESSIONAL-INTEREST] Skipping emails for test mailbox ${maskEmail(normalizedEmail)}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[PROFESSIONAL-INTEREST] Error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/waitlist ─────────────────────────────────────
// English landing page waitlist signup — no auth required.
// Stores name + email in the waitlist table.
// Redirects to /en/thank-you on success (handled client-side).
router.post('/waitlist', waitlistLimiter, async (req, res) => {
  try {
    const { name, email, marketing_consent: marketingConsent } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (marketingConsent !== true) {
      return res.status(400).json({
        error: 'Marketing consent is required to join the waitlist.',
      });
    }

    const normalizedName = name.trim().substring(0, 255);
    const normalizedEmail = email.toLowerCase().trim();
    const ipAddress = req.ip || null;
    const clamp = (v, max) =>
      typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
    const utmSource = clamp(req.body.utm_source, 64);
    const extra = {
      utm_medium: clamp(req.body.utm_medium, 64),
      utm_campaign: clamp(req.body.utm_campaign, 128),
      utm_content: clamp(req.body.utm_content, 128),
      landing_locale: req.body.landing_locale === 'sv-SE' ? 'sv-SE' : 'en-GB',
      marketing_consent: true,
      marketing_consent_version: 'waitlist_en_v1',
      platform: ['web', 'pwa', 'ios', 'android'].includes(req.body.platform)
        ? req.body.platform
        : 'web',
    };

    const entry = await addWaitlistEntry(
      normalizedName,
      normalizedEmail,
      utmSource,
      ipAddress,
      extra
    );

    // Funnel analytics — anonymised family_id null; use session-less track via events with null family skipped.
    // Persist as admin-visible signal through waitlist row only; client may also fire allowlisted event.

    if (!isTestMailbox(normalizedEmail)) {
    sendEmail({
      to: normalizedEmail,
      subject: "You're on the list! 🎉 — My Starday",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1C2340;">
          <h2 style="color: #1C2340;">You're in, ${normalizedName}! ⭐</h2>
          <p>You've secured your spot on the My Starday waitlist.</p>
          <p>We'll email you as soon as the English version is ready. In the meantime, feel free to try the Swedish version at <a href="https://mystarday.se" style="color:#F5A623;">mystarday.se</a>.</p>
          <p style="margin-top:24px;font-weight:700;">The first 100 families get their first year completely free. 🎁</p>
          <p style="color:#8A92AA;font-size:14px;margin-top:24px;">
            Questions? Email us at <a href="mailto:info@mystarday.se" style="color:#F5A623;">info@mystarday.se</a>
          </p>
        </div>
      `,
    }).catch(() => {});

    // Notify admin
    sendEmail({
      to: 'info@mystarday.se',
      subject: `New waitlist signup — ${normalizedName} (${normalizedEmail})`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">🌟 New waitlist signup</h2>
          <p><strong>Name:</strong> ${normalizedName}</p>
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Source:</strong> /en landing page (English)</p>
        </div>
      `,
    }).catch(() => {});
    } else {
      console.log(`[WAITLIST] Skipping emails for test mailbox ${maskEmail(normalizedEmail)}`);
    }

    res.json({ ok: true, message: 'Welcome to the waitlist!' });
  } catch (err) {
    console.error('[WAITLIST] Error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/waitlist/countries ─────────────────────────────
// Country list for optional Q3 on thank-you survey (EU launch).
router.get('/waitlist/countries', (_req, res) => {
  const countries = WAITLIST_COUNTRIES.map((entry) => ({
    code: entry.code,
    label: entry.labels['en-GB'] || entry.labels['sv-SE'] || entry.code,
  }));
  res.json({ countries });
});

// ─── POST /api/waitlist/survey ──────────────────────────────
// Thank-you page pain-point survey. Stores answers linked to email.
// 10 per IP per hour (shared with signup limit).
router.post('/waitlist/survey', waitlistLimiter, async (req, res) => {
  try {
    const { email, pain_points, pain_points_other, current_method, country_code } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!pain_points || !Array.isArray(pain_points) || pain_points.length === 0) {
      return res.status(400).json({ error: 'Please select at least one option for Q1.' });
    }
    if (!current_method || typeof current_method !== 'string' || current_method.trim().length === 0) {
      return res.status(400).json({ error: 'Please select an option for Q2.' });
    }

    const validPainPoints = ['morning_routines', 'bedtime', 'screen_time', 'homework', 'other'];
    const filteredPainPoints = pain_points
      .filter((p) => typeof p === 'string' && validPainPoints.includes(p))
      .slice(0, 5);
    const validMethods = ['paper', 'other_apps', 'verbal', 'nothing'];
    const normalizedMethod = validMethods.includes(current_method) ? current_method : null;

    let normalizedCountry = null;
    if (country_code !== undefined && country_code !== null && country_code !== '') {
      const code = String(country_code).trim().toUpperCase();
      if (!WAITLIST_COUNTRY_CODES.has(code)) {
        return res.status(400).json({ error: 'Please select a valid country.' });
      }
      normalizedCountry = code;
    }

    const updated = await updateWaitlistSurvey(
      email.trim(),
      filteredPainPoints,
      pain_points_other ? String(pain_points_other).trim().substring(0, 500) : null,
      normalizedMethod,
      normalizedCountry
    );

    if (!updated) {
      return res.status(404).json({ error: 'Signup not found. Please sign up first.' });
    }

    res.json({ ok: true, message: 'Survey submitted — thanks for your feedback!' });
  } catch (err) {
    console.error('[WAITLIST-SURVEY] Error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ─── POST /api/waitlist/skip ──────────────────────────────
// User chose to skip the survey — mark entry as skipped.
router.post('/waitlist/skip', waitlistLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    await markWaitlistSkipped(email.trim());
    res.json({ ok: true });
  } catch (err) {
    console.error('[WAITLIST-SKIP] Error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ─── GET /api/public/preview-data ─────────────────────────
// Static mock content for marketing previews (no auth).
router.get('/public/preview-data', (req, res) => {
  res.json(getAllPreviewPackages());
});

// ─── POST /api/public/newsletter-subscribe ────────────────
// Guest newsletter + optional package interest (no account required).
router.post('/public/newsletter-subscribe', publicNewsletterLimiter, async (req, res) => {
  try {
    const { email, name, component, source } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Ange en giltig e-postadress.' });
    }

    const normalizedEmail = email.toLowerCase().trim().slice(0, 255);
    const normalizedName = name && typeof name === 'string' ? name.trim().slice(0, 255) : null;
    const normalizedSource = typeof source === 'string' ? source.trim().slice(0, 64) : 'landing';
    const normalizedComponent = typeof component === 'string' && VALID_COMPONENTS.includes(component)
      ? component
      : null;

    const result = await subscribePublic({
      email: normalizedEmail,
      name: normalizedName,
      source: normalizedSource,
      component: normalizedComponent,
      ipAddress: req.ip || null,
    });

    if (!isTestMailbox(normalizedEmail)) {
      sendEmail({
        to: normalizedEmail,
        subject: 'Du är anmäld till nyhetsbrevet — My Starday',
        html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1C2340;">
          <h2>Tack! ⭐</h2>
          <p>${normalizedName ? `Hej ${normalizedName},` : 'Hej,'}</p>
          <p>Du är nu på vår nyhetsbrevmailing med nyheter och uppdateringar om My Starday.</p>
          ${normalizedComponent ? '<p>Vi har noterat ditt intresse och meddelar dig när paketet blir tillgängligt.</p>' : ''}
          <p style="color:#5A6178;font-size:14px;">Vill du skapa konto kan du göra det när som helst via registreringssidan i appen.</p>
        </div>
      `,
      }).catch(() => {});
    } else {
      console.log(`[PUBLIC-NEWSLETTER] Skipping email for test mailbox ${maskEmail(normalizedEmail)}`);
    }

    let message = 'Tack! Du är anmäld till nyhetsbrevet.';
    if (normalizedComponent) {
      message = result.alreadyHadComponent
        ? 'Du står redan på listan för det paketet. Vi hör av oss när det släpps.'
        : 'Tack! Vi meddelar dig när paketet släpps.';
    } else if (!result.isNew) {
      message = 'Du är redan anmäld till nyhetsbrevet.';
    }

    res.json({ ok: true, message, already_registered: !result.isNew || result.alreadyHadComponent });
  } catch (err) {
    console.error('[PUBLIC-NEWSLETTER] Error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── Professional share-link report API ──────────────────
// Public report access: GET /api/public/report/:publicId
// PIN session: POST /api/public/report/:publicId/session
//
// Security model:
//   - Expired/revoked links → 404 (never reveal existence)
//   - PIN required: 403 { pin_required: true }
//   - PIN session: short JWT (15 min, payload: { publicId }), stored in sessionStorage
//   - Date range: ALWAYS from link record, never from request

const jwt = require('jsonwebtoken');
const config = require('../lib/config');
const { verifyToken } = require('../middleware/auth');

// WHY module-scope: fmtWeek() is module-level and needs this; previously was
// inside route handler only, causing ReferenceError when fmtWeek was called.
const MONTHS_SV = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];

const reportPinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_ENABLED === 'false' ? 0 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `rpin:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'För många försök. Försök igen om en timme.' });
  },
});

/**
 * Verify a short-lived report session JWT.
 * Returns decoded payload or null.
 */
function verifyReportToken(token) {
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// GET /api/public/report/:publicId
// Returns full report data if session JWT is valid.
// Returns 403 { pin_required: true } if PIN is set and no valid session token.
// Returns 404 if not found / expired / revoked.
router.get('/public/report/:publicId', async (req, res) => {
  // Server-side timeout matching POST /api/reports 20s — prevents indefinite hang
  // if Neon cold-start or pool exhaustion makes DB slow to respond.
  req.setTimeout(20000, () => {
    console.warn(`[PUBLIC-REPORT] Timeout 20s — ${req.params.publicId}`);
  });

  try {
    const { publicId } = req.params;
    const link = await shareLink.getByPublicId(publicId);

    // 404 for everything invalid — do not reveal link existence
    if (!link) {
      return res.status(404).json({ error: 'Rapporten hittades inte eller länken har gått ut.' });
    }

    // If link has a PIN, verify Bearer token
    if (link.pin_hash) {
      const auth = req.headers['authorization'] || '';
      const bearerMatch = auth.match(/^Bearer (.+)$/);
      if (!bearerMatch) {
        return res.status(403).json({ pin_required: true });
      }

      const payload = verifyReportToken(bearerMatch[1]);
      if (!payload || payload.type !== 'report_session' || payload.publicId !== publicId) {
        return res.status(403).json({ pin_required: true });
      }
    }

    const fields = Array.isArray(link.fields) ? link.fields : [];
    // Date range is ALWAYS from the stored link — never from request params
    const blocks = await shareLink.getReportData(
      link.id, fields,
      link.date_from.toISOString ? link.date_from.toISOString().slice(0, 10) : String(link.date_from),
      link.date_to.toISOString   ? link.date_to.toISOString().slice(0, 10)   : String(link.date_to),
      link.child_id
    );

    shareLink.incrementViewCount(link.id).catch(() => {});

    // Normalize dates to YYYY-MM-DD strings (PostgreSQL returns Date objects)
    const fmtLinkDate = (d) => {
      if (!d) return null;
      if (typeof d === 'string') return d.slice(0, 10);
      if (d.toISOString) return d.toISOString().slice(0, 10);
      return String(d).slice(0, 10);
    };

    // Normalize block row dates (completion, emotions, etc.) — Date objects → YYYY-MM-DD
    const normalizeBlockDates = (blocks) => {
      const out = {};
      for (const [field, val] of Object.entries(blocks)) {
        if (!val) { out[field] = val; continue; }
        if (Array.isArray(val)) {
          out[field] = val.map(item => {
            if (item.date instanceof Date) {
              return { ...item, date: fmtLinkDate(item.date) };
            }
            if (item.date && typeof item.date === 'string' && item.date.indexOf('T') !== -1) {
              return { ...item, date: item.date.slice(0, 10) };
            }
            return item;
          });
        } else {
          // Object keyed by date (activities, parent_notes, child_notes)
          const normalized = {};
          for (const [dateKey, items] of Object.entries(val)) {
            const key = (dateKey instanceof Date) ? fmtLinkDate(dateKey) : dateKey;
            normalized[key] = items;
          }
          out[field] = normalized;
        }
      }
      return out;
    };

    const displayName = link.anonymous ? null : link.child_name;
    const displayEmoji = link.anonymous ? null : link.child_emoji;

    res.json({
      label:          link.label,
      child_label:    displayName,
      child_emoji:    displayEmoji,
      parent_summary: link.parent_summary || null,
      date_from:      fmtLinkDate(link.date_from),
      date_to:        fmtLinkDate(link.date_to),
      fields,
      blocks: normalizeBlockDates(blocks),
      generated_at:   new Date().toISOString(),
      anonymous:      !!link.anonymous,
    });
  } catch (err) {
    console.error('[PUBLIC-REPORT] Error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// GET /api/public/report/:publicId/pdf
// Same auth model as the JSON endpoint; streams a PDFKit-generated PDF.
// Output: max 2 A4 pages, Swedish labels. Layout lives in src/lib/report-pdf.js.
router.get('/public/report/:publicId/pdf', async (req, res) => {
  try {
    const { publicId } = req.params;
    const link = await shareLink.getByPublicId(publicId);

    if (!link) {
      return res.status(404).json({ error: 'Rapporten hittades inte eller länken har gått ut.' });
    }

    if (link.pin_hash) {
      const auth = req.headers['authorization'] || '';
      const bearerMatch = auth.match(/^Bearer (.+)$/);
      if (!bearerMatch) {
        return res.status(403).json({ pin_required: true });
      }
      const payload = verifyReportToken(bearerMatch[1]);
      if (!payload || payload.type !== 'report_session' || payload.publicId !== publicId) {
        return res.status(403).json({ pin_required: true });
      }
    }

    const fields = Array.isArray(link.fields) ? link.fields : [];
    const dateFrom = link.date_from.toISOString ? link.date_from.toISOString().slice(0, 10) : String(link.date_from);
    const dateTo   = link.date_to.toISOString   ? link.date_to.toISOString().slice(0, 10)   : String(link.date_to);
    const blocks   = await shareLink.getReportData(link.id, fields, dateFrom, dateTo, link.child_id);

    // Normalize date-keyed objects: Date objects → YYYY-MM-DD strings.
    const fmtLinkDate = (d) => {
      if (!d) return null;
      if (typeof d === 'string') return d.slice(0, 10);
      if (d.toISOString) return d.toISOString().slice(0, 10);
      return String(d).slice(0, 10);
    };
    for (const [field, val] of Object.entries(blocks)) {
      if (!val || typeof val !== 'object') continue;
      if (Array.isArray(val)) continue;
      const normalized = {};
      for (const [dateKey, items] of Object.entries(val)) {
        const key = (dateKey instanceof Date) ? fmtLinkDate(dateKey) : dateKey;
        normalized[key] = items;
      }
      blocks[field] = normalized;
    }

    const fileName = (link.label || 'rapport').replace(/[^a-zA-Z0-9\u00C0-\u017E _-]/g, '').trim() || 'rapport';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);

    const { generateReportPdf } = require('../lib/report-pdf');
    generateReportPdf(res, { link, fields, blocks, dateFrom, dateTo });
  } catch (err) {
    console.error('[PUBLIC-REPORT-PDF] Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Något gick fel.' });
  }
});

// GET /api/public/report/:publicId/playful
// Returns { viewModel } JSON for client-side playful PDF export.
// Same auth/PIN model as the main report endpoint.
router.get('/public/report/:publicId/playful', async (req, res) => {
  try {
    const { publicId } = req.params;
    const link = await shareLink.getByPublicId(publicId);
    if (!link) return res.status(404).json({ error: 'Rapporten hittades inte eller länken har gått ut.' });

    if (link.pin_hash) {
      const auth = req.headers['authorization'] || '';
      const bearerMatch = auth.match(/^Bearer (.+)$/);
      if (!bearerMatch) return res.status(403).json({ pin_required: true });
      const payload = verifyReportToken(bearerMatch[1]);
      if (!payload || payload.type !== 'report_session' || payload.publicId !== publicId) {
        return res.status(403).json({ pin_required: true });
      }
    }

    const fields = Array.isArray(link.fields) ? link.fields : [];
    const dateFrom = link.date_from.toISOString ? link.date_from.toISOString().slice(0, 10) : String(link.date_from);
    const dateTo = link.date_to.toISOString ? link.date_to.toISOString().slice(0, 10) : String(link.date_to);
    const blocks = await shareLink.getReportData(link.id, fields, dateFrom, dateTo, link.child_id);

    const { mapReportToPlayful } = require('../lib/report-playful-mapper');
    const viewModel = mapReportToPlayful({ link, blocks, fields, dateFrom, dateTo });
    res.json({ viewModel });
  } catch (err) {
    console.error('[PUBLIC-REPORT-PLAYFUL] Error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ISO week number helper
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

// Format week date range as "28 apr–4 maj"
function fmtWeek(dates) {
  if (!dates || dates.length === 0) return 'v.?';
  const sorted = [...dates].sort();
  const startD = new Date(sorted[0] + 'T00:00:00');
  const endD   = new Date(sorted[sorted.length - 1] + 'T00:00:00');
  return startD.getDate() + ' ' + MONTHS_SV[startD.getMonth()] + '–' + endD.getDate() + ' ' + MONTHS_SV[endD.getMonth()];
}

// POST /api/public/report/:publicId/session
// Verify PIN. Returns short JWT (15 min) for the publicId.
// Rate-limited: 5 attempts per IP per hour.
router.post('/public/report/:publicId/session', reportPinLimiter, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { pin } = req.body;

    if (!pin || typeof pin !== 'string' || pin.trim().length === 0) {
      return res.status(400).json({ error: 'Kod krävs.' });
    }

    const link = await shareLink.getByPublicId(publicId);
    if (!link) {
      // Consistent 404 — don't reveal whether link exists
      return res.status(404).json({ error: 'Rapporten hittades inte eller länken har gått ut.' });
    }

    if (!link.pin_hash) {
      // No PIN set — no session needed; return success so frontend can proceed
      return res.json({ token: null });
    }

    const valid = await shareLink.verifyPin(link.pin_hash, pin.trim());
    if (!valid) {
      return res.status(401).json({ error: 'Fel kod. Försök igen.' });
    }

    // Issue short-lived JWT — 15 min. Stored in sessionStorage (not httpOnly cookie)
    // to avoid tab-clobbering issues with existing parent session cookies.
    const token = jwt.sign(
      { type: 'report_session', publicId },
      config.jwt.secret,
      { expiresIn: '15m' }
    );

    res.json({ token });
  } catch (err) {
    console.error('[PUBLIC-REPORT-SESSION] Error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

// ─── GET /api/public/activation-program/invite/:token ───
// Väg B — track click, redirect to val-skärm (ingen auto-enroll).
router.get('/public/activation-program/invite/:token', async (req, res) => {
  try {
    const emailInviteDb = require('../../db/activation-program-email-invite');
    const config = require('../lib/config');
    const programAnalytics = require('../lib/activation-program-analytics');
    const { isActivationProgramEnabled, isPostLaunchEnrollment } = require('../lib/activation-program-enroll');
    const { FLAG_KEYS, isFlagEnabled } = require('../lib/journey/flags');

    if (!isActivationProgramEnabled() || !isPostLaunchEnrollment()) {
      return res.redirect('/');
    }

    if (!(await isFlagEnabled(FLAG_KEYS.activationNewEnrollments))) {
      return res.redirect('/');
    }

    const invite = await emailInviteDb.getByToken(req.params.token);
    if (!invite || !invite.sent_at) {
      return res.redirect('/');
    }

    await emailInviteDb.markClicked(req.params.token);
    programAnalytics.trackEmailInviteClicked(invite.family_id, invite.parent_id);

    const baseUrl = config.email?.baseUrl || `${req.protocol}://${req.get('host')}`;
    res.redirect(`${baseUrl}/activation-enroll.html?token=${invite.token}`);
  } catch (err) {
    console.error('[PUBLIC] activation invite click error:', err);
    res.redirect('/');
  }
});

module.exports = router;
