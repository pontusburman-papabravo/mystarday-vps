/**
 * Email service — wraps the Polsia email proxy.
 * Owns: all outbound transactional email for Min Stjärndag.
 * Does NOT own: push notifications (push.js), in-app messages (system-messages).
 *
 * Kill switch: set EMAIL_ENABLED=false to disable all sending (safe for local dev).
 */
const config = require('./config');

/**
 * Register a user as a known contact with the Polsia proxy.
 * Call on signup so transactional emails are never rate-limited.
 */
async function registerContact(email, name, source = 'signup') {
  const apiKey = process.env.POLSIA_API_KEY;
  if (!apiKey) return;

  try {
    await fetch('https://polsia.com/api/proxy/email/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email, name, source }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non-critical — fire-and-forget
  }
}

/**
 * Send an email via the Polsia email proxy.
 * https://polsia.com/api/proxy/email/send
 */
const FROM_ADDRESS = 'info@mystarday.se';

async function sendEmail({ to, subject, body: textBody, html, from }) {
  // Kill switch
  if (process.env.EMAIL_ENABLED === 'false') {
    console.log(`[EMAIL] Suppressed (EMAIL_ENABLED=false): to=${to}, subject="${subject}"`);
    return { success: true, provider: 'suppressed' };
  }

  const apiKey = process.env.POLSIA_API_KEY;

  console.log(`[EMAIL] Sending email to=${to}, subject="${subject}", hasApiKey=${!!apiKey}`);

  if (!apiKey) {
    console.error('[EMAIL] No POLSIA_API_KEY — email not sent. Check env vars.');
    return { success: false, provider: 'none' };
  }

  // plain-text body is required by the proxy; derive from html if caller omits it
  const plainText = textBody || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : subject);

  try {
    const payload = {
      to,
      from: from || `Min Stjärndag <${FROM_ADDRESS}>`,
      replyTo: `Min Stjärndag <${FROM_ADDRESS}>`,
      subject,
      body: plainText,
      html,
    };

    const res = await fetch('https://polsia.com/api/proxy/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.log(`[EMAIL] Sent OK to=${to}, provider=polsia-proxy`);
      return { success: true, provider: 'polsia-proxy', data };
    }

    const errText = await res.text().catch(() => '');
    console.error(`[EMAIL] Proxy returned ${res.status}: ${errText}`);
    return { success: false, provider: 'polsia-proxy', status: res.status, error: errText };
  } catch (err) {
    console.error('[EMAIL] Proxy request failed:', err.message);
    return { success: false, provider: 'none', error: err.message };
  }
}

/**
 * Send email verification link.
 */
async function sendVerificationEmail(email, token) {
  const url = `${config.email.baseUrl}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Verifiera din e-post — Min Stjärndag',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">Välkommen till Min Stjärndag! ⭐</h2>
        <p>Klicka på knappen nedan för att verifiera din e-postadress:</p>
        <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verifiera e-post</a>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">Länken är giltig i ${config.verification.tokenExpiryHours} timmar.</p>
      </div>
    `,
  });
}

/**
 * Send password reset link.
 */
async function sendPasswordResetEmail(email, token, recipientName) {
  const url = `${config.email.baseUrl}/reset-password?token=${token}`;
  const greeting = recipientName ? `Hej ${recipientName}` : 'Hej';
  return sendEmail({
    to: email,
    subject: 'Återställ lösenord — Min Stjärndag',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">Återställ ditt lösenord</h2>
        <p>${greeting}, klicka här för att sätta ett nytt lösenord:</p>
        <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Återställ lösenord</a>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">Länken är giltig i ${config.verification.resetTokenExpiryHours} timme. Ignorera detta mail om du inte begärde en återställning.</p>
      </div>
    `,
  });
}

/**
 * Send family invite link to new member.
 * @param {string} email - Recipient email
 * @param {string} token - Invite token
 * @param {object} opts - { inviteeName, inviterName, familyName }
 */
async function sendInviteEmail(email, token, { inviteeName, inviterName, familyName } = {}) {
  const url = `${config.email.baseUrl}/accept-invite?token=${token}`;
  const greeting = inviteeName ? `Hej ${inviteeName}` : 'Hej';
  const inviterText = inviterName || 'Någon';
  const familyText = familyName ? `familjen "${familyName}"` : 'en familj';
  return sendEmail({
    to: email,
    subject: `Du är inbjuden till ${familyText} på Min Stjärndag ⭐`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">Du har blivit inbjuden! ⭐</h2>
        <p>${greeting}, ${inviterText} har bjudit in dig till ${familyText} på Min Stjärndag.</p>
        <p>Min Stjärndag är ett visuellt dagsschema som hjälper barn att förstå sin dag, bocka av aktiviteter och samla stjärnor.</p>
        <p>Klicka här för att skapa ditt lösenord och aktivera ditt konto:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Aktivera konto</a>
        </div>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">Inbjudan gäller i 7 dagar. Ignorera detta mail om du inte förväntade dig denna inbjudan.</p>
      </div>
    `,
  });
}

/**
 * Send notification to parent about child's failed login attempts.
 * Legacy function — kept for compat. New code uses sendPinWarningEmail.
 */
async function sendChildLockoutNotification(parentEmail, childName) {
  return sendPinWarningEmail(parentEmail, childName);
}

/**
 * Send a heads-up to the parent when the child has made 3 failed PIN attempts.
 * Not a lockout — just a friendly warning so parent can assist.
 * Subject uses ⚠️ prefix per task spec.
 */
async function sendPinWarningEmail(parentEmail, childName) {
  const baseUrl = config.email.baseUrl;
  return sendEmail({
    to: parentEmail,
    subject: `⚠️ ${childName} försöker logga in`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">Inloggningsförsök på Min Stjärndag</h2>
        <p>${childName} har skrivit fel PIN-kod 3 gånger på Min Stjärndag.</p>
        <p>Du kan hjälpa till med rätt kod eller återställa PIN:en i appen.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${baseUrl}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Öppna Min Stjärndag</a>
        </div>
        <p style="color: #5A6178; font-size: 14px;">Om detta inte var ditt barn kan du logga in och ändra PIN-koden under barnets inställningar.</p>
      </div>
    `,
  });
}

/**
 * Send deletion confirmation when account deletion is requested.
 */
async function sendAccountDeletionRequestedEmail(email, firstName) {
  const baseUrl = config.email.baseUrl;
  return sendEmail({
    to: email,
    subject: 'Ditt konto hos Min Stjärndag har markerats för radering',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">Hej ${firstName}!</h2>
        <p>Vi har tagit emot en begäran om att radera ditt konto och all tillhörande data.</p>
        <div style="background: #FFF3D6; border-left: 4px solid #F5A623; border-radius: 8px; padding: 1rem 1.2rem; margin: 1.5rem 0;">
          <p style="color: #1B2340; font-weight: 600; margin: 0;">⏳ Dina data raderas permanent om 30 dagar.</p>
        </div>
        <p>Under denna period kan du logga in och <strong>ångra raderingen</strong> om du ändrar dig.</p>
        <p>Om du ångrar dig — logga in på <a href="${baseUrl}" style="color: #F5A623; font-weight: 600;">Min Stjärndag</a> så ser du ett alternativ att avbryta.</p>
        <p style="color: #5A6178; font-size: 14px; margin-top: 2rem;">Om detta var ett misstag kan du ignorera detta mejl. Dina data kommer att raderas om 30 dagar om du inte avbryter.</p>
        <p style="color: #5A6178; font-size: 14px;">Om du har frågor, kontakta oss på <a href="mailto:info@mystarday.se" style="color: #F5A623;">info@mystarday.se</a></p>
      </div>
    `,
  });
}

/**
 * Send confirmation when account has been fully deleted.
 */
async function sendAccountDeletedEmail(email, firstName) {
  return sendEmail({
    to: email,
    subject: 'Ditt konto hos Min Stjärndag har raderats',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">Hej ${firstName}</h2>
        <p>Ditt konto och all tillhörande data har nu raderats permanent från Min Stjärndag.</p>
        <div style="background: #E0F5EC; border-left: 4px solid #22C55E; border-radius: 8px; padding: 1rem 1.2rem; margin: 1.5rem 0;">
          <p style="color: #1B2340; font-weight: 600; margin: 0;">Alla familjer, barn, scheman, aktiviteter och stjärnor har tagits bort.</p>
        </div>
        <p>Vi hoppas att Min Stjärndag har varit till hjälp under tiden.</p>
        <p style="font-size: 14px; color: #5A6178; margin-top: 20px;">
          Om du vill skapa ett nytt konto är du välkommen tillbaka när som helst på <a href="https://mystarday.se" style="color: #F5A623; font-weight: 600;">mystarday.se</a>
        </p>
      </div>
    `,
  });
}

/**
 * Send win-back re-engagement email.
 * Subject/Body are in docs/win-back-email-copy.md (UTKAST — not approved for live sending).
 * Copy is isolated here for easy modification without touching scheduler logic.
 *
 * @param {string} to          — recipient email
 * @param {string} parentName  — first name for personalization
 * @param {string} childName   — child's name for CTA headline
 * @param {string} ctaUrl      — CTA button URL with UTM params
 */
async function sendWinBackEmail({ to, parentName, childName, ctaUrl }) {
  const firstName = (parentName || '').split(' ')[0] || 'Förälder';
  return sendEmail({
    to,
    subject: `${childName}s schema väntar — en snabb koll? ⭐`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1B2340;">
        <h2 style="color:#1B2340;">Hej ${firstName}! 👋</h2>
        <p style="color:#5A6178;">Det var ett tag sedan du var här inne — ${childName}s schema väntar på dig.</p>

        <div style="background:#FFF8E8;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">⭐</div>
          <p style="margin:0;font-size:18px;font-weight:600;color:#1B2340;">
            Det tar bara en minut att kolla av schemat
          </p>
        </div>

        <p style="color:#5A6178;">
          Barnet har stjärnor att tjäna och belöningar att lösa in. Så fort du öppnar appen är allt på plats.
        </p>

        <div style="text-align:center;margin:28px 0;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#F5A623;color:white;padding:14px 36px;
                    border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            Öppna schemat →
          </a>
        </div>

        <p style="color:#5A6178;font-size:14px;margin-top:16px;">
          Du kan stänga av dessa mejl under <strong>Inställningar → Aviseringar</strong> i appen.
        </p>
      </div>
    `,
  });
}

/**
 * Send pedagog invite email.
 * @param {string} to - Recipient email
 * @param {string|null} inviteeName - Recipient name
 * @param {string} inviterName - Inviting parent name
 * @param {string} familyName - Family name
 * @param {string} inviteToken - Invite token
 */
async function sendPedagogInviteEmail({ to, inviteeName, inviterName, familyName, inviteToken }) {
  const baseUrl = config.email.baseUrl;
  const url = `${baseUrl}/pedagog-invite?token=${inviteToken}`;
  const greeting = inviteeName ? `Hej ${inviteeName}` : 'Hej';
  const inviterText = inviterName || 'En förälder';
  const familyText = familyName || 'Min Stjärndag';

  return sendEmail({
    to,
    subject: `Du bjuds in som pedagog i ${familyText} ⭐`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1B2340;">
        <h2 style="color: #1B2340;">Välkommen som pedagog! ⭐</h2>
        <p>${greeting},</p>
        <p><strong>${inviterText}</strong> har bjudit in dig som pedagog i ${familyText} på Min Stjärndag.</p>
        <p>Som pedagog får du tillgång till att dokumentera observationer och följa barnets schema.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Acceptera inbjudan →
          </a>
        </div>
        <p style="color: #5A6178; font-size: 14px;">
          Inbjudan gäller i 7 dagar. Om du inte förväntade dig detta mail kan du ignorera det.
        </p>
      </div>
    `,
  });
}

/**
 * Confirm newsletter opt-in (settings toggle or registration).
 */
async function sendNewsletterSubscriptionConfirmation(email, recipientName) {
  const greeting = recipientName ? `Hej ${recipientName}` : 'Hej';
  const settingsUrl = `${config.email.baseUrl}/settings`;
  return sendEmail({
    to: email,
    subject: 'Du prenumererar på nyhetsbrev från Min Stjärndag',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1B2340;">Tack för din prenumeration! ⭐</h2>
        <p>${greeting},</p>
        <p>Du prenumererar nu på nyhetsbrev från Min Stjärndag med tips, nyheter och uppdateringar om appen.</p>
        <p>Du kan när som helst avsluta prenumerationen under <a href="${settingsUrl}">Inställningar</a> i appen, eller via länken längst ner i varje nyhetsbrev.</p>
        <p style="color: #5A6178; font-size: 14px; margin-top: 24px;">Med vänliga hälsningar,<br>Min Stjärndag</p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  registerContact,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
  sendChildLockoutNotification,
  sendPinWarningEmail,
  sendAccountDeletionRequestedEmail,
  sendAccountDeletedEmail,
  sendWinBackEmail,
  sendPedagogInviteEmail,
  sendNewsletterSubscriptionConfirmation,
};
