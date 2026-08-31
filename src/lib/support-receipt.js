'use strict';

/**
 * Confirmation email after a contact_message is created — points at the web thread.
 */
const config = require('./config');
const { supportFollowUpUrl, signSupportFollowUpToken } = require('./support-follow-up-token');
const { escapeHtml } = require('./contact-message-reply');

function isLandingShareMailbox(email) {
  return String(email || '').toLowerCase().startsWith('landing-share@');
}

function shouldSendSupportReceipt(email) {
  return Boolean(email) && email.includes('@') && !isLandingShareMailbox(email);
}

function threadPath(messageId) {
  return `/support/svar/${signSupportFollowUpToken(messageId)}`;
}

function buildReceiptBodies({ recipientName, followUpUrl, locale }) {
  const en = String(locale || '').toLowerCase().startsWith('en');
  const greetingName = recipientName && !String(recipientName).includes('@')
    ? String(recipientName).trim()
    : (en ? 'there' : 'där');

  const text = en
    ? `Hi ${greetingName}!

We have received your message. Follow the conversation and write back here (a normal email reply is not visible to us):
${followUpUrl}

Best regards,
${config.email.fromName}`
    : `Hej ${greetingName}!

Vi har tagit emot ditt meddelande. Följ ärendet och skriv tillbaka här (ett vanligt mejlsvar syns inte hos oss):
${followUpUrl}

Vänliga hälsningar,
${config.email.fromName}`;

  const linkLabel = en ? 'Open your conversation' : 'Öppna ditt ärende';
  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1B2340;">
      <p>${en ? 'Hi' : 'Hej'} ${escapeHtml(greetingName)}!</p>
      <p>${en
    ? 'We have received your message.'
    : 'Vi har tagit emot ditt meddelande.'}</p>
      <p style="line-height: 1.5;"><a href="${escapeHtml(followUpUrl)}" style="color: #C4851A; font-weight: 600;">${linkLabel}</a>
      ${en
    ? 'to follow the conversation and write back. A normal email reply is not visible to us.'
    : 'för att följa ärendet och skriva tillbaka. Ett vanligt mejlsvar syns inte hos oss.'}</p>
      <p style="margin-top: 24px;">${en ? 'Best regards' : 'Vänliga hälsningar'},<br>${escapeHtml(config.email.fromName)}</p>
    </div>`;

  return {
    subject: en ? 'Your support conversation' : 'Ditt ärende',
    text,
    html,
  };
}

function publicThreadFor(messageId) {
  return {
    threadUrl: threadPath(messageId),
    followUpUrl: supportFollowUpUrl(messageId),
  };
}

module.exports = {
  isLandingShareMailbox,
  shouldSendSupportReceipt,
  threadPath,
  buildReceiptBodies,
  publicThreadFor,
};
