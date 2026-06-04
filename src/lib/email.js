/**
 * Email service — SMTP (nodemailer).
 * Owns: all outbound transactional email for Min Stjärndag.
 * Does NOT own: push notifications (push.js), in-app messages (system-messages).
 *
 * Kill switch: EMAIL_ENABLED=false disables all sending.
 *
 * Required env: SMTP_HOST, SMTP_USER, SMTP_PASS (SMTP_PORT default 587).
 */
const nodemailer = require('nodemailer');
const config = require('./config');

const FROM_ADDRESS = 'info@mystarday.se';

let _transport = null;

function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transport;
}

/**
 * No-op — kept for signup hook compatibility (former Polsia contacts API).
 */
async function registerContact() {
  return;
}

/**
 * Send an email via SMTP.
 */
async function sendEmail({ to, subject, body: textBody, html, from }) {
  if (process.env.EMAIL_ENABLED === 'false') {
    console.log(`[EMAIL] Suppressed (EMAIL_ENABLED=false): to=${to}, subject="${subject}"`);
    return { success: true, provider: 'suppressed' };
  }

  console.log(`[EMAIL] Sending email to=${to}, subject="${subject}", configured=${isEmailConfigured()}`);

  if (!isEmailConfigured()) {
    console.error('[EMAIL] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS');
    return { success: false, provider: 'none' };
  }

  const plainText = textBody || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : subject);
  const fromHeader = from || `Min Stjärndag <${FROM_ADDRESS}>`;

  try {
    const info = await getTransport().sendMail({
      from: fromHeader,
      to,
      replyTo: `Min Stjärndag <${FROM_ADDRESS}>`,
      subject,
      text: plainText,
      html,
    });
    console.log(`[EMAIL] Sent OK to=${to}, messageId=${info.messageId || 'n/a'}`);
    return { success: true, provider: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL] SMTP send failed:', err.message);
    return { success: false, provider: 'smtp', error: err.message };
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

async function sendChildLockoutNotification(parentEmail, childName) {
  return sendPinWarningEmail(parentEmail, childName);
}

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
          <p style="margin:0;font-size:18px;font-weight:600;color:#1B2340;">Det tar bara en minut att kolla av schemat</p>
        </div>
        <p style="color:#5A6178;">Barnet har stjärnor att tjäna och belöningar att lösa in. Så fort du öppnar appen är allt på plats.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${ctaUrl}" style="display:inline-block;background:#F5A623;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Öppna schemat →</a>
        </div>
        <p style="color:#5A6178;font-size:14px;margin-top:16px;">Du kan stänga av dessa mejl under <strong>Inställningar → Aviseringar</strong> i appen.</p>
      </div>
    `,
  });
}

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
          <a href="${url}" style="display: inline-block; background: #F5A623; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">Acceptera inbjudan →</a>
        </div>
        <p style="color: #5A6178; font-size: 14px;">Inbjudan gäller i 7 dagar. Om du inte förväntade dig detta mail kan du ignorera det.</p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  registerContact,
  isEmailConfigured,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
  sendChildLockoutNotification,
  sendPinWarningEmail,
  sendAccountDeletionRequestedEmail,
  sendAccountDeletedEmail,
  sendWinBackEmail,
  sendPedagogInviteEmail,
};