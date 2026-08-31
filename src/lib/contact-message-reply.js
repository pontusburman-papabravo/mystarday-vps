/**
 * contact-message-reply.js — Admin inbox reply email for contact_message rows.
 */
const config = require('./config');

const TYPE_SUBJECTS = {
  bug: 'Re: Din buggrapport',
  feedback: 'Re: Din feedback',
  language: 'Re: Ditt språkmeddelande',
  contact: 'Re: Ditt meddelande',
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPlainText(text) {
  return String(text || '').trim();
}

function buildReplySubject(messageType) {
  return TYPE_SUBJECTS[messageType] || TYPE_SUBJECTS.contact;
}

function buildReplyBodies({ recipientName, originalMessage, replyBody, followUpUrl }) {
  const greetingName = recipientName && !recipientName.includes('@')
    ? recipientName.trim()
    : 'där';
  const plainReply = formatPlainText(replyBody);
  const plainOriginal = formatPlainText(originalMessage);

  const text = `Hej ${greetingName}!

${plainReply}
${followUpUrl ? `
Läs hela ärendet och skriv tillbaka här (ett vanligt mejlsvar syns inte hos oss):
${followUpUrl}` : ''}

---
Ditt ursprungliga meddelande:
${plainOriginal}

Vänliga hälsningar,
${config.email.fromName}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1B2340;">
      <p>Hej ${escapeHtml(greetingName)}!</p>
      <div style="white-space: pre-wrap; line-height: 1.5;">${escapeHtml(plainReply)}</div>
      ${followUpUrl ? `<p style="margin-top: 20px; line-height: 1.5;"><a href="${escapeHtml(followUpUrl)}" style="color: #C4851A; font-weight: 600;">Öppna konversationen</a> för att läsa hela ärendet och skriva tillbaka. Ett vanligt mejlsvar syns inte hos oss.</p>` : ''}
      <hr style="border: none; border-top: 1px solid #EDE7F6; margin: 24px 0;">
      <p style="color: #5A6178; font-size: 13px; margin-bottom: 8px;">Ditt ursprungliga meddelande:</p>
      <blockquote style="margin: 0; padding: 12px 16px; background: #f5f5f5; border-left: 4px solid #F5A623; border-radius: 8px; color: #5A6178; font-size: 14px; white-space: pre-wrap;">${escapeHtml(plainOriginal)}</blockquote>
      <p style="margin-top: 24px;">Vänliga hälsningar,<br>${escapeHtml(config.email.fromName)}</p>
    </div>`;

  return { text, html };
}

module.exports = {
  buildReplySubject,
  buildReplyBodies,
  escapeHtml,
};
