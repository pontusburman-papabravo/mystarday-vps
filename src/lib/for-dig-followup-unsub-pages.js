'use strict';

const { escapeHtml } = require('./escape-html');

function pageShell(title, inner) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:64px 24px;color:#374151;background:#f9fafb;}button,a.btn{display:inline-block;margin-top:24px;background:#F5A623;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;border:0;font-size:16px;cursor:pointer;}</style>
</head><body>
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:48px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    ${inner}
  </div>
</body></html>`;
}

function renderFollowupOptedOutPage({ undoAction }) {
  const undo = undoAction
    ? `<form method="POST" action="${escapeHtml(undoAction)}"><button type="submit">Ångra</button></form>`
    : '';
  return pageShell(
    'Avregistrerad',
    `<p style="font-size:48px;margin:0 0 16px;">✅</p>
    <h1 style="margin:0 0 12px;font-size:22px;">Du får inte längre uppföljningsmejl om För dig.</h1>
    <p style="color:#6b7280;">Nyhetsbrev och andra mejl från oss påverkas inte.</p>
    ${undo}`
  );
}

function renderFollowupUndoPage() {
  return pageShell(
    'Ångrat',
    `<p style="font-size:48px;margin:0 0 16px;">✅</p>
    <h1 style="margin:0 0 12px;font-size:22px;">Du kan få uppföljningsmejl om För dig igen.</h1>
    <a class="btn" href="/">Till appen</a>`
  );
}

function renderFollowupUnsubErrorPage() {
  return pageShell(
    'Ogiltig länk',
    `<h1 style="margin:0 0 12px;font-size:22px;">Länken är ogiltig</h1>
    <p style="color:#6b7280;">Försök igen via länken i mejlet, eller kontakta support.</p>`
  );
}

module.exports = {
  renderFollowupOptedOutPage,
  renderFollowupUndoPage,
  renderFollowupUnsubErrorPage,
};
