'use strict';

/**
 * Pick Swedish or English landing-news fields (fallback to Swedish).
 * @param {object} item DB row
 * @param {'sv'|'en'} locale
 */
function localizeLandingNewsItem(item, locale) {
  if (locale === 'en') {
    return {
      title: (item.title_en && String(item.title_en).trim()) || item.title,
      body: (item.body_en && String(item.body_en).trim()) || item.body,
      button_text:
        (item.button_text_en && String(item.button_text_en).trim()) ||
        item.button_text ||
        'Read more',
      image_url: item.image_url,
      button_url: item.button_url,
      archived_at: item.archived_at,
      created_at: item.created_at,
    };
  }
  return {
    title: item.title,
    body: item.body,
    button_text: item.button_text || 'Läs mer',
    image_url: item.image_url,
    button_url: item.button_url,
    archived_at: item.archived_at,
    created_at: item.created_at,
  };
}

module.exports = {
  localizeLandingNewsItem,
};
