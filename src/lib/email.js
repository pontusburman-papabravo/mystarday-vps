/**
 * Email service — Resend API (https://resend.com).
 * Owns: all outbound transactional email for Min Stjärndag.
 * Does NOT own: push notifications (push.js), in-app messages (system-messages).
 *
 * Env: RESEND_API_KEY (required for live sends), RESEND_API_KEY_WEEKLY (optional — weekly
 *      summary only; falls back to RESEND_API_KEY), EMAIL_ENABLED=false kill switch.
 */
const config = require('./config');
const { buildListUnsubscribeHeaders } = require('./list-unsubscribe-headers');
const { t } = require('./i18n');
const { validateLocale } = require('./locale');

const FROM_ADDRESS = config.email.from;
const FROM_HEADER = `${config.email.fromName} <${FROM_ADDRESS}>`;
const RESEND_API_URL = 'https://api.resend.com/emails';
const { maskEmail } = require('./log-redact');

function maskToField(to) {
  return normalizeRecipients(to).map(maskEmail).join(',') || '(redacted)';
}

/** RFC 2606 / common test domains — never send to these in production. */
const TEST_MAILBOX_SUFFIXES = [
  '@example.com',
  '@example.org',
  '@example.net',
  '@test.com',
];

function getResendApiKey(profile = 'default') {
  if (profile === 'weekly') {
    return process.env.RESEND_API_KEY_WEEKLY || process.env.RESEND_API_KEY || null;
  }
  return process.env.RESEND_API_KEY || null;
}

function isTestMailbox(email) {
  const normalized = String(email || '').toLowerCase().trim();
  return TEST_MAILBOX_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function normalizeRecipients(to) {
  return (Array.isArray(to) ? to : [to]).filter(Boolean);
}

/**
 * Legacy hook from Polsia era — Resend does not require pre-registering contacts.
 * Kept for call-site compatibility (signup, resend verification).
 */
async function registerContact(_email, _name, _source = 'signup') {
  return;
}

/**
 * Send an email via Resend.
 */
async function sendEmail({ to, subject, body: textBody, html, from, tags, apiKeyProfile, unsubscribeUrl, headers: extraHeaders }) {
  const recipients = normalizeRecipients(to);
  if (recipients.length > 0 && recipients.every(isTestMailbox)) {
    console.log(`[EMAIL] Suppressed (test mailbox): to=${maskToField(to)}, subject="${subject}"`);
    return { success: true, provider: 'suppressed_test_mailbox' };
  }

  if (process.env.EMAIL_ENABLED === 'false') {
    console.log(`[EMAIL] Suppressed (EMAIL_ENABLED=false): to=${maskToField(to)}, subject="${subject}"`);
    return { success: true, provider: 'suppressed' };
  }

  const keyProfile = apiKeyProfile === 'weekly' ? 'weekly' : 'default';
  const apiKey = getResendApiKey(keyProfile);
  const keyEnvName = keyProfile === 'weekly' && process.env.RESEND_API_KEY_WEEKLY
    ? 'RESEND_API_KEY_WEEKLY'
    : 'RESEND_API_KEY';

  console.log(
    `[EMAIL] Sending email to=${maskToField(to)}, subject="${subject}", keyProfile=${keyProfile}, hasApiKey=${!!apiKey}`
  );

  if (!apiKey) {
    console.error(`[EMAIL] No ${keyEnvName} — email not sent. Check env vars.`);
    return { success: false, provider: 'none', error: `${keyEnvName} saknas` };
  }

  const plainText = textBody || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : subject);
  const toList = recipients;

  const listHeaders = buildListUnsubscribeHeaders(unsubscribeUrl);
  const headers = { ...(extraHeaders || {}), ...(listHeaders || {}) };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from || FROM_HEADER,
        to: toList,
        subject,
        html: html || undefined,
        text: plainText,
        reply_to: FROM_ADDRESS,
        tags: Array.isArray(tags) && tags.length > 0 ? tags : undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log(`[EMAIL] Sent OK to=${maskToField(to)}, provider=resend, id=${data.id || 'n/a'}`);
      return { success: true, provider: 'resend', data, emailId: data.id || null };
    }

    const errText = data.message || data.error || JSON.stringify(data);
    console.error(`[EMAIL] Resend returned ${res.status}: ${errText}`);
    return { success: false, provider: 'resend', status: res.status, error: errText };
  } catch (err) {
    console.error('[EMAIL] Resend request failed:', err.message);
    return { success: false, provider: 'none', error: err.message };
  }
}

function brandName() {
  return config.email.fromName || 'Stjärndag';
}

/**
 * Send email verification link.
 */
async function sendVerificationEmail(email, token, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  const brand = brandName();
  const url = `${config.email.baseUrl}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: t(lang, 'email.verify.subject', { brand }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">${t(lang, 'email.verify.title', { brand })}</h2>
        <p>${t(lang, 'email.verify.body')}</p>
        <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">${t(lang, 'email.verify.button')}</a>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">${t(lang, 'email.verify.expiry', { hours: String(config.verification.tokenExpiryHours) })}</p>
      </div>
    `,
  });
}

/**
 * Send password reset link.
 */
async function sendPasswordResetEmail(email, token, recipientName, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  const brand = brandName();
  const url = `${config.email.baseUrl}/reset-password?token=${token}`;
  const greeting = recipientName
    ? t(lang, 'email.resetPassword.greeting', { name: recipientName })
    : t(lang, 'email.resetPassword.greetingGeneric');
  return sendEmail({
    to: email,
    subject: t(lang, 'email.resetPassword.subject', { brand }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">${t(lang, 'email.resetPassword.title')}</h2>
        <p>${greeting}, ${t(lang, 'email.resetPassword.body')}</p>
        <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">${t(lang, 'email.resetPassword.button')}</a>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">${t(lang, 'email.resetPassword.expiry', { hours: String(config.verification.resetTokenExpiryHours) })}</p>
      </div>
    `,
  });
}

/**
 * Send family invite link to new member.
 */
async function sendInviteEmail(email, token, { inviteeName, inviterName, familyName, locale = 'sv-SE' } = {}) {
  const lang = validateLocale(locale);
  const brand = brandName();
  const url = `${config.email.baseUrl}/accept-invite?token=${token}`;
  const greeting = inviteeName
    ? t(lang, 'email.common.greetingNamed', { name: inviteeName })
    : t(lang, 'email.common.greeting');
  const inviterText = inviterName || t(lang, 'email.common.genericInviter');
  const familyLabel = familyName
    ? t(lang, 'email.common.familyNamed', { familyName })
    : t(lang, 'email.common.aFamily');
  return sendEmail({
    to: email,
    subject: t(lang, 'email.invite.subject', { familyLabel, brand }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">${t(lang, 'email.invite.title')}</h2>
        <p>${t(lang, 'email.invite.body', { greeting, inviterName: inviterText, familyLabel, brand })}</p>
        <p>${t(lang, 'email.invite.intro', { brand })}</p>
        <p>${t(lang, 'email.invite.ctaIntro')}</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">${t(lang, 'email.invite.button')}</a>
        </div>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">${t(lang, 'email.invite.footer')}</p>
      </div>
    `,
  });
}

async function sendChildLockoutNotification(parentEmail, childName, locale = 'sv-SE') {
  return sendPinWarningEmail(parentEmail, childName, locale);
}

async function sendPinWarningEmail(parentEmail, childName, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  const brand = brandName();
  const baseUrl = config.email.baseUrl;
  return sendEmail({
    to: parentEmail,
    subject: t(lang, 'email.pinWarning.subject', { childName }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">${t(lang, 'email.pinWarning.title', { brand })}</h2>
        <p>${t(lang, 'email.pinWarning.body', { childName, brand })}</p>
        <p>${t(lang, 'email.pinWarning.help')}</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${baseUrl}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">${t(lang, 'email.pinWarning.button', { brand })}</a>
        </div>
        <p style="color: #5A6178; font-size: 14px;">${t(lang, 'email.pinWarning.footer')}</p>
      </div>
    `,
  });
}

async function sendAccountDeletionRequestedEmail(email, firstName, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  const brand = brandName();
  const baseUrl = config.email.baseUrl;
  const supportEmail = FROM_ADDRESS;
  return sendEmail({
    to: email,
    subject: t(lang, 'email.accountDeletionRequested.subject', { brand }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">${t(lang, 'email.accountDeletionRequested.greeting', { name: firstName })}</h2>
        <p>${t(lang, 'email.accountDeletionRequested.intro')}</p>
        <div style="background: #FFF3D6; border-left: 4px solid #F5A623; border-radius: 8px; padding: 1rem 1.2rem; margin: 1.5rem 0;">
          <p style="color: #1B2340; font-weight: 600; margin: 0;">${t(lang, 'email.accountDeletionRequested.graceTitle')}</p>
        </div>
        <p>${t(lang, 'email.accountDeletionRequested.undo')}</p>
        <p>${t(lang, 'email.accountDeletionRequested.loginHint', { brand: `<a href="${baseUrl}" style="color: #F5A623; font-weight: 600;">${brand}</a>` })}</p>
        <p style="color: #5A6178; font-size: 14px; margin-top: 2rem;">${t(lang, 'email.accountDeletionRequested.footer')}</p>
        <p style="color: #5A6178; font-size: 14px;">${t(lang, 'email.accountDeletionRequested.contact', { supportEmail: `<a href="mailto:${supportEmail}" style="color: #F5A623;">${supportEmail}</a>` })}</p>
      </div>
    `,
  });
}

async function sendAccountDeletedEmail(email, firstName, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  const brand = brandName();
  const brandUrl = config.email.baseUrl;
  return sendEmail({
    to: email,
    subject: t(lang, 'email.accountDeleted.subject', { brand }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">${t(lang, 'email.accountDeleted.greeting', { name: firstName })}</h2>
        <p>${t(lang, 'email.accountDeleted.intro', { brand })}</p>
        <div style="background: #E0F5EC; border-left: 4px solid #22C55E; border-radius: 8px; padding: 1rem 1.2rem; margin: 1.5rem 0;">
          <p style="color: #1B2340; font-weight: 600; margin: 0;">${t(lang, 'email.accountDeleted.dataRemoved')}</p>
        </div>
        <p>${t(lang, 'email.accountDeleted.thanks', { brand })}</p>
        <p style="font-size: 14px; color: #5A6178; margin-top: 20px;">
          ${t(lang, 'email.accountDeleted.return', { brandUrl: `<a href="${brandUrl}" style="color: #F5A623; font-weight: 600;">${brandUrl.replace(/^https?:\/\//, '')}</a>` })}
        </p>
      </div>
    `,
  });
}

async function sendWinBackEmail({ to, parentName, childName, ctaUrl, locale = 'sv-SE' }) {
  const lang = validateLocale(locale);
  const firstName = (parentName || '').split(' ')[0] || t(lang, 'email.common.genericParent');
  const child = childName || t(lang, 'email.common.genericChild');
  const settingsLink = t(lang, 'email.common.settingsNotificationsHtml');
  return sendEmail({
    to,
    subject: t(lang, 'email.winBack.subject'),
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
        <h2 style="color:#1B2340;">${t(lang, 'email.winBack.greeting', { name: firstName })}</h2>
        <p style="color:#5A6178;line-height:1.6;">
          ${t(lang, 'email.winBack.body1', { childName: child })}
        </p>
        <p style="color:#5A6178;line-height:1.6;">
          ${t(lang, 'email.winBack.body2')}
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#F5A623;color:white;padding:14px 36px;
                    border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            ${t(lang, 'email.winBack.button')}
          </a>
        </div>
        <p style="color:#5A6178;font-size:14px;margin-top:16px;">
          ${t(lang, 'email.winBack.settingsHint', { settingsLink })}
        </p>
      </div>
    `,
  });
}

async function sendPedagogInviteEmail({
  to,
  inviteeName,
  inviterName,
  familyName,
  inviteToken,
  locale = 'sv-SE',
}) {
  const lang = validateLocale(locale);
  const brand = brandName();
  const baseUrl = config.email.baseUrl;
  const url = `${baseUrl}/pedagog-invite?token=${inviteToken}`;
  const greeting = inviteeName
    ? t(lang, 'email.pedagogInvite.greetingNamed', { name: inviteeName })
    : t(lang, 'email.pedagogInvite.greeting');
  const inviterText = inviterName || t(lang, 'email.common.genericPedagogInviter');
  const familyText = familyName || brand;

  return sendEmail({
    to,
    subject: t(lang, 'email.pedagogInvite.subject', { familyName: familyText }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1B2340;">
        <h2 style="color: #1B2340;">${t(lang, 'email.pedagogInvite.title')}</h2>
        <p>${greeting}</p>
        <p>${t(lang, 'email.pedagogInvite.body', { inviterName: inviterText, familyName: familyText, brand })}</p>
        <p>${t(lang, 'email.pedagogInvite.intro')}</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            ${t(lang, 'email.pedagogInvite.button')}
          </a>
        </div>
        <p style="color: #5A6178; font-size: 14px;">
          ${t(lang, 'email.pedagogInvite.footer')}
        </p>
      </div>
    `,
  });
}

async function sendActivationProgramInviteEmail({
  to,
  parentName,
  childName,
  ctaUrl,
  locale = 'sv-SE',
}) {
  const lang = validateLocale(locale);
  const firstName = (parentName || '').split(' ')[0] || t(lang, 'email.common.genericYou');
  const child = childName || t(lang, 'email.common.genericChild');
  return sendEmail({
    to,
    subject: t(lang, 'email.activationProgramInvite.subject', { childName: child }),
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
        <h2 style="color:#1B2340;">${t(lang, 'email.activationProgramInvite.greeting', { name: firstName })}</h2>
        <p style="color:#5A6178;">
          ${t(lang, 'email.activationProgramInvite.body1', { childName: child })}
        </p>
        <p style="color:#5A6178;">
          ${t(lang, 'email.activationProgramInvite.body2')}
        </p>
        <p style="color:#5A6178;">
          ${t(lang, 'email.activationProgramInvite.body3')}
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#4F46E5;color:white;padding:14px 36px;
                    border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            ${t(lang, 'email.activationProgramInvite.button')}
          </a>
        </div>
        <p style="color:#5A6178;font-size:14px;">
          ${t(lang, 'email.activationProgramInvite.footer')}
        </p>
      </div>
    `,
  });
}

async function sendNewsletterSubscriptionConfirmation(email, recipientName, locale = 'sv-SE') {
  const lang = validateLocale(locale);
  const brand = brandName();
  const greeting = recipientName
    ? t(lang, 'email.newsletterConfirm.greetingNamed', { name: recipientName })
    : t(lang, 'email.newsletterConfirm.greeting');
  const settingsUrl = `${config.email.baseUrl}/settings`;
  return sendEmail({
    to: email,
    subject: t(lang, 'email.newsletterConfirm.subject', { brand }),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">${t(lang, 'email.newsletterConfirm.title')}</h2>
        <p>${greeting}</p>
        <p>${t(lang, 'email.newsletterConfirm.body', { brand })}</p>
        <p>${t(lang, 'email.newsletterConfirm.settings', { settingsUrl })}</p>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">${t(lang, 'email.newsletterConfirm.signoff', { brand })}</p>
      </div>
    `,
  });
}

async function sendChildHandoffReminderEmail({ to, parentName, ctaUrl, locale = 'sv-SE' }) {
  const lang = validateLocale(locale);
  const firstName = (parentName || '').split(' ')[0] || t(lang, 'email.common.genericParent');
  const url = ctaUrl || `${(process.env.APP_URL || '').replace(/\/$/, '')}/onboarding`;
  return sendEmail({
    to,
    subject: t(lang, 'email.childHandoff.subject'),
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
        <h2 style="color:#1B2340;">${t(lang, 'email.childHandoff.greeting', { name: firstName })}</h2>
        <p style="color:#5A6178;line-height:1.6;">
          ${t(lang, 'email.childHandoff.body')}
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${url}"
             style="display:inline-block;background:#F5A623;color:white;padding:14px 36px;
                    border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            ${t(lang, 'email.childHandoff.button')}
          </a>
        </div>
      </div>
    `,
  });
}

async function sendActivationNudgeEmail({ to, parentName, ctaUrl, locale = 'sv-SE' }) {
  const lang = validateLocale(locale);
  const firstName = (parentName || '').split(' ')[0] || t(lang, 'email.common.genericParent');
  const url = ctaUrl || `${(process.env.APP_URL || '').replace(/\/$/, '')}/dashboard`;
  return sendEmail({
    to,
    subject: t(lang, 'email.activationNudge.subject'),
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
        <h2 style="color:#1B2340;">${t(lang, 'email.activationNudge.greeting', { name: firstName })}</h2>
        <p style="color:#5A6178;line-height:1.6;">
          ${t(lang, 'email.activationNudge.body1')}
        </p>
        <p style="color:#5A6178;line-height:1.6;">
          ${t(lang, 'email.activationNudge.body2')}
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${url}"
             style="display:inline-block;background:#F5A623;color:white;padding:14px 36px;
                    border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            ${t(lang, 'email.activationNudge.button')}
          </a>
        </div>
      </div>
    `,
  });
}

async function sendRewardRedemptionEmail({
  to,
  parentName,
  childName,
  childEmoji,
  rewardName,
  rewardIcon,
  starCost,
  locale = 'sv-SE',
}) {
  const lang = validateLocale(locale);
  const firstName = (parentName || '').split(' ')[0] || t(lang, 'email.common.genericParent');
  const settingsLink = t(lang, 'email.common.settingsNotificationsHtml');
  const emoji = childEmoji || '⭐';
  const icon = rewardIcon || '🎁';
  return sendEmail({
    to,
    subject: t(lang, 'email.rewardRedemption.subject', { childName, rewardName }),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1B2340;">
        <h2 style="color:#1B2340;margin-bottom:4px;">${t(lang, 'email.rewardRedemption.title')}</h2>
        <p>${t(lang, 'email.rewardRedemption.greeting', { name: firstName })}</p>
        <div style="border:1px solid #E8ECF4;border-radius:12px;padding:20px;margin:16px 0;">
          <p style="margin:0;font-size:18px;">${t(lang, 'email.rewardRedemption.wantsToRedeem', { childEmoji: emoji, childName })}</p>
          <p style="margin:12px 0 0;font-size:22px;font-weight:700;color:#F5A623;">${icon} ${rewardName}</p>
          <p style="margin:4px 0 0;color:#5A6178;">${t(lang, 'email.rewardRedemption.cost', { starCost: String(starCost) })}</p>
        </div>
        <p>${t(lang, 'email.rewardRedemption.approveHint')}</p>
        <p style="margin-top:24px;font-size:14px;color:#5A6178;">
          ${t(lang, 'email.rewardRedemption.settingsHint', { settingsLink })}
        </p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  getResendApiKey,
  isTestMailbox,
  registerContact,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
  sendChildLockoutNotification,
  sendPinWarningEmail,
  sendAccountDeletionRequestedEmail,
  sendAccountDeletedEmail,
  sendWinBackEmail,
  sendChildHandoffReminderEmail,
  sendActivationNudgeEmail,
  sendActivationProgramInviteEmail,
  sendPedagogInviteEmail,
  sendNewsletterSubscriptionConfirmation,
  sendRewardRedemptionEmail,
};
