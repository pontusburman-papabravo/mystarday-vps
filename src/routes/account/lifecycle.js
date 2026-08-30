'use strict';

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');

const router = express.Router();

const LEGACY_DELETION_GONE = {
  error: 'Den här raderingsvägen är avvecklad. Använd Inställningar → Radera konto.',
};

// ─── POST /api/account/delete ───────────────────────────
// Legacy 30-day soft-delete write path — no active clients. Settings uses
// DELETE /api/family/delete-account with canonical administrative authority.
router.post('/delete', requireParent, async (_req, res) => {
  return res.status(410).json(LEGACY_DELETION_GONE);
});

// ─── POST /api/account/cancel-deletion ─────────────────
router.post('/cancel-deletion', requireParent, async (_req, res) => {
  return res.status(410).json(LEGACY_DELETION_GONE);
});

// ─── GET /api/account/widget-order ────────────────────────
router.get('/widget-order', requireParent, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT widget_order FROM parent WHERE id = $1',
      [req.user.id]
    );
    res.json({ widget_order: result.rows[0]?.widget_order || [] });
  } catch (err) {
    console.error('[ACCOUNT] Get widget-order error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/account/widget-order ───────────────────────
router.put('/widget-order', requireParent, async (req, res) => {
  try {
    const { widget_order } = req.body;
    if (!Array.isArray(widget_order)) {
      return res.status(400).json({ error: 'widget_order must be an array' });
    }

    await db.query(
      'UPDATE parent SET widget_order = $1 WHERE id = $2',
      [JSON.stringify(widget_order), req.user.id]
    );

    res.json({ message: 'Ordning sparad', widget_order });
  } catch (err) {
    console.error('[ACCOUNT] Save widget-order error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/share-notify ──────────────────────
// Fires when a parent shares the app with someone. Sends an
// email notification to info@mystarday.se with the sharer's details. // pragma: allowlist secret
router.post('/share-notify', requireParent, async (req, res) => {
  try {
    const parentResult = await db.query(
      'SELECT email, name FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const { email: parentEmail, name: parentName } = parentResult.rows[0];
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });
    const body = req.body || {};
    const recipient = typeof body.recipient === 'string' ? body.recipient.trim().slice(0, 200) : '';
    const channel = typeof body.channel === 'string' ? body.channel.trim().slice(0, 40) : '';
    const channelLabels = {
      native_share: 'Telefonens delningsmeny',
      copy: 'Kopierad länk',
      email: 'E-post',
      facebook: 'Facebook',
      whatsapp: 'WhatsApp',
    };
    const channelLabel = channelLabels[channel] || (channel || '—');
    const recipientLine = recipient || '— (ej angivet)';
    const plainBody =
      'Förälder: ' + (parentName || '—') + '\n' +
      'E-post: ' + parentEmail + '\n' +
      'Till vem: ' + recipientLine + '\n' +
      'Kanal: ' + channelLabel + '\n' +
      'Tidpunkt: ' + now;

    // Send notification email to [REDACTED] (fire-and-forget) // pragma: allowlist secret
    const { sendEmail } = require('../../lib/email');
    sendEmail({
      to: '[REDACTED]', // pragma: allowlist secret
      subject: `📤 Delning — ${parentName || parentEmail} tipsade${recipient ? ' ' + recipient : ''}`,
      body: plainBody,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">📤 Ny delning av appen</h2>
          <p><strong>Förälder:</strong> ${parentName || '—'}</p>
          <p><strong>E-post:</strong> ${parentEmail}</p>
          <p><strong>Till vem:</strong> ${recipientLine}</p>
          <p><strong>Kanal:</strong> ${channelLabel}</p>
          <p><strong>Tidpunkt:</strong> ${now}</p>
        </div>`,
    }).catch(err => {
      console.warn('[ACCOUNT] Failed to send share notification:', err.message);
    });

    res.json({ message: 'Tack för att du delade!' });
  } catch (err) {
    console.error('[ACCOUNT] Share notify error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

// ─── GET /api/account/referral ───────────────────────────
// Personal referral code only when Journey/value gate allows (growth_referral_cta_v1).
router.get('/referral', requireParent, async (req, res) => {
  try {
    const { evaluateReferralEligibility } = require('../../lib/referral-eligibility');
    const eligibility = await evaluateReferralEligibility(req.user.familyId);
    if (!eligibility.eligible) {
      return res.json({
        eligible: false,
        reason: eligibility.reason,
        blockers: eligibility.blockers || [],
        code: null,
        registerUrl: null,
      });
    }
    const referralDb = require('../../../db/referral');
    const code = await referralDb.getOrCreateReferralCode(req.user.id);
    const baseUrl = (process.env.APP_URL || 'https://mystarday.se').replace(/\/$/, '');
    const registerUrl = `${baseUrl}/register?ref=${encodeURIComponent(code)}`;
    require('../../../db/analytics').track(req.user.familyId, 'referral_shown', {
      code,
    }).catch(() => {});
    res.json({
      eligible: true,
      reason: eligibility.reason,
      code,
      registerUrl,
    });
  } catch (err) {
    console.error('[ACCOUNT] Referral code error:', err);
    res.status(500).json({ error: 'Kunde inte hämta värvningskod' });
  }
});

// ─── POST /api/account/attribution ───────────────────────
// Idempotent first-touch capture for OAuth / late client attach. Never blocks UX.
router.post('/attribution', requireParent, async (req, res) => {
  try {
    const { recordFamilyAttribution, normalizeAttributionInput, toAnalyticsMetadata } =
      require('../../lib/acquisition-attribution');
    const raw = req.body || {};
    const normalized = normalizeAttributionInput(raw);
    const result = await recordFamilyAttribution(req.user.familyId, raw, {
      registeredAt: new Date(),
    });
    if (result.stored && normalized) {
      require('../../lib/analytics-tracker').trackSignupAttribution(
        req.user.familyId,
        toAnalyticsMetadata(normalized)
      );
    }
    if (normalized?.referral_code) {
      try {
        const { isActivationFlagEnabled, FLAG_KEYS } = require('../../lib/activation-flags');
        const enabled = await isActivationFlagEnabled(FLAG_KEYS.referral, req.user.familyId);
        if (enabled) {
          const referralDb = require('../../../db/referral');
          const referrer = await referralDb.findReferrerByCode(normalized.referral_code);
          if (referrer && referrer.family_id !== req.user.familyId) {
            await referralDb.createPendingReferral({
              referrerParentId: referrer.parent_id,
              referredFamilyId: req.user.familyId,
              code: normalized.referral_code,
            });
            require('../../../db/analytics').track(req.user.familyId, 'referral_signup', {
              code: normalized.referral_code,
            }).catch(() => {});
          }
        }
      } catch (refErr) {
        console.error('[ACCOUNT] referral from attribution failed:', refErr.message);
      }
    }
    res.json({ ok: true, stored: result.stored, reason: result.reason });
  } catch (err) {
    console.error('[ACCOUNT] Attribution error:', err);
    res.json({ ok: false, stored: false, reason: 'error' });
  }
});

// ─── POST /api/account/delete-immediate ─────────────────
// Legacy bypass removed — use Settings → DELETE /api/family/delete-account.
router.post('/delete-immediate', requireParent, async (_req, res) => {
  return res.status(410).json({
    error: 'Den här raderingsvägen är avvecklad. Använd Inställningar → Radera konto.',
  });
});

module.exports = router;
