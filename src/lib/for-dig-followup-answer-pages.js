'use strict';

const { escapeHtml } = require('./escape-html');
const { ANSWER_PATH } = require('./for-dig-followup-answer-token');
const { GOAL_FALLBACK, OUTCOME_CHOICES } = require('./for-dig-outcome-email-template');

function pageShell(title, inner) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:48px 20px;color:#374151;background:#f9fafb;}h1{margin:0 0 12px;font-size:22px;line-height:1.3;}p{margin:0 0 12px;color:#6b7280;line-height:1.5;}form{margin:0;}button,a.btn{display:block;width:100%;box-sizing:border-box;margin:10px 0 0;background:#F5A623;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:600;border:0;font-size:16px;cursor:pointer;min-height:44px;}button.secondary,a.secondary{background:#fff;color:#374151;border:2px solid #e5e7eb;}button.choice{background:#fff;color:#1B2340;border:2px solid #F5A623;}</style>
</head><body>
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:36px 28px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    ${inner}
  </div>
</body></html>`;
}

function questionLine(item) {
  const goal = escapeHtml(item.goal_title || item.goalTitle || GOAL_FALLBACK);
  const child = escapeHtml(item.child_name || item.childName || 'ditt barn');
  return `Hur har det gått med <strong>${goal}</strong> för ${child}?`;
}

function hiddenFields(token, item) {
  return `
    <input type="hidden" name="t" value="${escapeHtml(token)}">
    <input type="hidden" name="child_id" value="${escapeHtml(item.child_id)}">
    <input type="hidden" name="goal_slug" value="${escapeHtml(item.goal_slug)}">
  `;
}

function renderAnswerQuestionPage({ token, item, remainingCount = 1 }) {
  const more = remainingCount > 1
    ? `<p>Du kan svara på resten efteråt — en fråga i taget.</p>`
    : '';
  const buttons = OUTCOME_CHOICES.map((choice) => `
    <form method="POST" action="${escapeHtml(ANSWER_PATH)}">
      ${hiddenFields(token, item)}
      <input type="hidden" name="score" value="${choice.score}">
      <button type="submit" class="choice">${choice.emoji} ${escapeHtml(choice.label)}</button>
    </form>
  `).join('');
  return pageShell(
    'Hur har det gått?',
    `<h1>Hur har det gått?</h1>
    <p>${questionLine(item)}</p>
    ${more}
    ${buttons}
    <p style="margin-top:24px;font-size:13px;">Svaret ändrar inte schemat. Det hjälper oss förstå vad som fungerar.</p>`
  );
}

function renderAnswerConfirmPage({ token, item, score }) {
  const choice = OUTCOME_CHOICES.find((row) => row.score === score) || OUTCOME_CHOICES[0];
  return pageShell(
    'Bekräfta svaret',
    `<h1>Stämmer det här?</h1>
    <p>${questionLine(item)}</p>
    <p><strong>${choice.emoji} ${escapeHtml(choice.label)}</strong></p>
    <form method="POST" action="${escapeHtml(ANSWER_PATH)}">
      ${hiddenFields(token, item)}
      <input type="hidden" name="score" value="${choice.score}">
      <button type="submit">Bekräfta</button>
    </form>
    <a class="btn secondary" href="${escapeHtml(ANSWER_PATH)}?t=${encodeURIComponent(token)}">Välj något annat</a>`
  );
}

function renderAnswerThanksPage({ nextItem, token } = {}) {
  if (nextItem && token) {
    return pageShell(
      'Tack',
      `<p style="font-size:48px;margin:0 0 16px;">✅</p>
      <h1>Tack — nästa fråga</h1>
      <p>${questionLine(nextItem)}</p>
      ${OUTCOME_CHOICES.map((choice) => `
        <form method="POST" action="${escapeHtml(ANSWER_PATH)}">
          ${hiddenFields(token, nextItem)}
          <input type="hidden" name="score" value="${choice.score}">
          <button type="submit" class="choice">${choice.emoji} ${escapeHtml(choice.label)}</button>
        </form>
      `).join('')}`
    );
  }
  return pageShell(
    'Tack',
    `<p style="font-size:48px;margin:0 0 16px;">✅</p>
    <h1>Tack — det räcker.</h1>
    <p>Ditt svar är sparat. Inget i schemat har ändrats.</p>
    <a class="btn" href="/dashboard">Till Hem</a>`
  );
}

function renderAnswerAlreadyPage() {
  return pageShell(
    'Redan svarat',
    `<h1>Du har redan svarat.</h1>
    <p>Tack — vi behöver inget mer just nu.</p>
    <a class="btn" href="/dashboard">Till Hem</a>`
  );
}

function renderAnswerErrorPage() {
  return pageShell(
    'Ogiltig länk',
    `<h1>Länken är ogiltig</h1>
    <p>Försök igen via länken i mejlet, eller öppna Hem och svara där.</p>
    <a class="btn" href="/dashboard">Till Hem</a>`
  );
}

module.exports = {
  renderAnswerQuestionPage,
  renderAnswerConfirmPage,
  renderAnswerThanksPage,
  renderAnswerAlreadyPage,
  renderAnswerErrorPage,
};
