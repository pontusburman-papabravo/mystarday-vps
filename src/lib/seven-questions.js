/**
 * De sju frågorna — normalize + render order (§7.1, E6).
 */

const QUESTION_ORDER = ['what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why'];

const QUESTION_LABELS = {
  what: 'Vad?',
  where: 'Var?',
  who: 'Vem?',
  how_long: 'Hur länge?',
  what_next: 'Vad händer sen?',
  what_need: 'Vad behöver jag?',
  why: 'Varför?',
};

/**
 * Strip virtual fields and empty entries before persist.
 * @param {object} raw
 */
function normalizeSevenQuestions(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key === 'what' || val?.virtual) continue;
    if (!val || typeof val !== 'object') continue;
    const text = (val.text || '').trim();
    const icon_key = val.icon_key || null;
    const emoji = val.emoji || null;
    const image_url = val.image_url || null;
    if (!text && !icon_key && !emoji && !image_url) continue;
    out[key] = { text, icon_key, emoji, image_url };
    if (key === 'what_next' && val.activity_template_id) {
      out[key].activity_template_id = val.activity_template_id;
    }
    if (key === 'how_long' && val.minutes != null) {
      out[key].minutes = Number(val.minutes) || null;
    }
  }
  return out;
}

/**
 * Inject virtual `what` from activity for client rendering.
 * @param {object} activity
 * @param {object} sevenQuestions
 */
function enrichForClient(activity, sevenQuestions = {}) {
  const sq = { ...sevenQuestions };
  sq.what = {
    text: activity?.name || '',
    icon_key: activity?.icon_key || null,
    emoji: activity?.icon || null,
    image_url: activity?.avatar_url || null,
    virtual: true,
  };
  return sq;
}

/**
 * Scrub what_next references when linked activity is deleted (§7.2).
 * @param {object} client — pg client in transaction
 * @param {string} familyId
 * @param {string} deletedActivityId
 * @param {object} snapshot — { name, emoji, icon_key }
 */
async function scrubWhatNextReferences(client, familyId, deletedActivityId, snapshot) {
  const { rows } = await client.query(
    `SELECT id, seven_questions FROM activity_template
     WHERE family_id = $1 AND seven_questions::text LIKE '%' || $2 || '%'`,
    [familyId, deletedActivityId]
  );

  for (const row of rows) {
    const sq = row.seven_questions || {};
    const wn = sq.what_next;
    if (!wn || wn.activity_template_id !== deletedActivityId) continue;

    const frozen = {
      text: snapshot.name || wn.text || 'Nästa aktivitet',
      emoji: snapshot.emoji || wn.emoji || null,
      icon_key: snapshot.icon_key || wn.icon_key || null,
      frozen_at: new Date().toISOString(),
    };
    delete frozen.activity_template_id;

    const updated = { ...sq, what_next: frozen };
    await client.query(
      'UPDATE activity_template SET seven_questions = $2 WHERE id = $1',
      [row.id, JSON.stringify(updated)]
    );
  }
}

module.exports = {
  QUESTION_ORDER,
  QUESTION_LABELS,
  normalizeSevenQuestions,
  enrichForClient,
  scrubWhatNextReferences,
};
