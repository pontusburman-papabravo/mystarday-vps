/**
 * Shared HTML for newsletter unsubscribe confirmation page.
 */
function renderUnsubscribePage({ title, heading, message, showHomeLink = true }) {
  const homeLink = showHomeLink
    ? '<a href="/" style="display:inline-block;margin-top:24px;background:#F5A623;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;">Till appen</a>'
    : '';
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:64px 24px;color:#374151;background:#f9fafb;}</style>
</head><body>
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:48px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <p style="font-size:48px;margin:0 0 16px;">✅</p>
    <h1 style="margin:0 0 12px;font-size:22px;">${heading}</h1>
    <p style="color:#6b7280;">${message}</p>
    ${homeLink}
  </div>
</body></html>`;
}

function renderUnsubscribeErrorPage(title, message) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px;color:#374151;">
  <h1>${title}</h1>
  <p>${message}</p>
</body></html>`;
}

module.exports = { renderUnsubscribePage, renderUnsubscribeErrorPage };
