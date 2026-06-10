'use strict';

/**
 * Format family_event row into story item for UI (pure, no DB).
 */
function formatStoryEvent(row) {
  const payload = row.payload || {};
  let text = '';
  if (row.type === 'activity_contribution') {
    const name = payload.childName || row.child_name || 'Någon';
    const activity = payload.activityName || 'en aktivitet';
    const stars = payload.starValue || 0;
    text = stars > 0
      ? `${name} klarade ${activity} (+${stars} ⭐)`
      : `${name} klarade ${activity}`;
  } else if (row.type === 'project_completed') {
    text = `Familjen nådde målet: ${payload.title || 'projekt'} 🎉`;
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
