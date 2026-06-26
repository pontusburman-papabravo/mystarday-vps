/**
 * RFC 8058 List-Unsubscribe headers for bulk/marketing email.
 * https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails
 */

function buildListUnsubscribeHeaders(unsubscribeUrl) {
  const url = String(unsubscribeUrl || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return null;
  }
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

module.exports = { buildListUnsubscribeHeaders };
