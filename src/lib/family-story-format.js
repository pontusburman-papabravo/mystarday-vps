'use strict';

/**
 * Format family_event row into story item for UI (pure, no DB).
 * System template copy is locale-aware; user names and activity titles are not translated.
 * @param {object} row
 * @param {{ locale?: 'sv-SE'|'en-GB' }} [options]
 */
function formatStoryEvent(row, options = {}) {
  const isEn = options.locale === 'en-GB';
  const payload = row.payload || {};
  let text = '';
  if (row.type === 'activity_contribution') {
    const name = payload.childName || row.child_name || (isEn ? 'Someone' : 'Någon');
    const activity = payload.activityName || (isEn ? 'an activity' : 'en aktivitet');
    const stars = payload.starValue || 0;
    if (stars > 0) {
      text = isEn
        ? `${name} completed ${activity} (+${stars} ⭐)`
        : `${name} klarade ${activity} (+${stars} ⭐)`;
    } else {
      text = isEn
        ? `${name} completed ${activity}`
        : `${name} klarade ${activity}`;
    }
  } else if (row.type === 'project_completed') {
    const title = payload.title || (isEn ? 'goal' : 'projekt');
    text = isEn
      ? `The family reached the goal: ${title} 🎉`
      : `Familjen nådde målet: ${title} 🎉`;
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
