'use strict';

const { escapeHtml, escapeUserDisplay } = require('./email-html');
const { localizeLandingNewsItem } = require('./landing-news-locale');

const COPY = {
  sv: {
    empty: 'Inga arkiverade nyheter ännu.',
    readMore: 'Läs mer',
    datePrefix: 'Publicerad',
  },
  en: {
    empty: 'No archived news yet.',
    readMore: 'Read more',
    datePrefix: 'Published',
  },
};

function formatArchiveDate(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tag = locale === 'en' ? 'en-GB' : 'sv-SE';
  return d.toLocaleDateString(tag, { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildArchiveListHtml(items, locale = 'sv') {
  const lang = locale === 'en' ? 'en' : 'sv';
  const copy = COPY[lang];
  if (!items.length) {
    return `<p class="archive-empty">${escapeHtml(copy.empty)}</p>`;
  }
  return items
    .map((row) => {
      const item = localizeLandingNewsItem(row, lang);
      const dateIso = item.archived_at || item.created_at;
      const dateLabel = formatArchiveDate(dateIso, lang);
      const dateLine = dateLabel
        ? `<p class="archive-card__date">${escapeHtml(copy.datePrefix)} ${escapeHtml(dateLabel)}</p>`
        : '';
      const imgHtml = item.image_url
        ? `<div class="archive-card__media"><img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : '';
      const bodyHtml = item.body
        ? `<p class="archive-card__body">${escapeUserDisplay(item.body)}</p>`
        : '';
      const btnHtml = item.button_url
        ? `<a href="${escapeHtml(item.button_url)}" class="archive-card__link">${escapeHtml(item.button_text || copy.readMore)}</a>`
        : '';
      return (
        `<article class="archive-card">` +
        imgHtml +
        `<div class="archive-card__content">` +
        dateLine +
        `<h2 class="archive-card__title">${escapeUserDisplay(item.title)}</h2>` +
        bodyHtml +
        btnHtml +
        `</div></article>`
      );
    })
    .join('\n');
}

module.exports = {
  buildArchiveListHtml,
  formatArchiveDate,
};
