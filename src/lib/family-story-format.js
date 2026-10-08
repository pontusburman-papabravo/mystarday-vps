'use strict';

/**
 * Format family_event row into story item for UI (pure, no DB).
 * System template copy follows the locale bundle. User names stay as stored.
 * @param {object} row
 * @param {{ locale?: string }} [options]
 */
const { t } = require('./i18n');

function formatStoryEvent(row, options = {}) {
  const locale = options.locale;
  const payload = row.payload || {};
  let text = '';
  if (row.type === 'activity_contribution') {
    const name = payload.childName || row.child_name || t(locale, 'story.someone');
    const activity = payload.activityName || t(locale, 'story.anActivity');
    const stars = payload.starValue || 0;
    text = stars > 0
      ? t(locale, 'story.activityWithStars', { name, activity, stars })
      : t(locale, 'story.activity', { name, activity });
  } else if (row.type === 'project_completed') {
    const title = payload.title || t(locale, 'story.goalFallback');
    text = t(locale, 'story.goal', { title });
  } else {
    text = payload.text || row.type;
  }
  return {
    id: row.id,
    type: row.type,
    text,
    childId: row.child_id,
    childName: row.child_name || payload.childName || null,
    createdAt: row.created_at,
    payload,
  };
}

module.exports = { formatStoryEvent };
