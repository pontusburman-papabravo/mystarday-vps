'use strict';

/**
 * Build the public support conversation (no email, notes, or admin ids).
 */

function stampToIso(stamp) {
  return `${String(stamp).replace(' ', 'T')}:00.000Z`;
}

function stripResendFooter(body) {
  return String(body || '').replace(/\n\(Resend: [^)]+\)\s*$/, '').trim();
}

function originalMessage(message) {
  const text = String(message || '');
  const cut = text.search(/\n--- (?:Användarsvar|Svar) /);
  return (cut === -1 ? text : text.slice(0, cut)).trim();
}

function parseBlocks(text) {
  const re = /--- (Användarsvar|Svar) (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) ---\n([\s\S]*?)(?=\n--- (?:Användarsvar|Svar) |$)/g;
  const out = [];
  let match = re.exec(String(text || ''));
  while (match) {
    const body = stripResendFooter(match[3]);
    if (body) {
      out.push({ kind: match[1], at: stampToIso(match[2]), body });
    }
    match = re.exec(String(text || ''));
  }
  return out;
}

function eventTurns(events) {
  return (events || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .flatMap((ev) => {
      const body = ev.payload && ev.payload.body != null ? String(ev.payload.body).trim() : '';
      if (!body) return [];
      if (ev.event_type === 'user_reply') return [{ role: 'user', body, at: ev.created_at }];
      if (ev.event_type === 'reply_sent') return [{ role: 'support', body, at: ev.created_at }];
      return [];
    });
}

function buildPublicSupportThread({ createdAt, message, internalNote, events }) {
  const thread = [];
  const original = originalMessage(message);
  if (original) {
    thread.push({ role: 'user', body: original, at: createdAt });
  }

  const fromEvents = eventTurns(events);
  const extras = [];
  if (!fromEvents.some((turn) => turn.role === 'user')) {
    for (const block of parseBlocks(message)) {
      if (block.kind === 'Användarsvar') extras.push({ role: 'user', body: block.body, at: block.at });
    }
  }
  if (!fromEvents.some((turn) => turn.role === 'support')) {
    for (const block of parseBlocks(internalNote)) {
      if (block.kind === 'Svar') extras.push({ role: 'support', body: block.body, at: block.at });
    }
  }

  return thread.concat(fromEvents, extras).sort((a, b) => new Date(a.at) - new Date(b.at));
}

module.exports = {
  buildPublicSupportThread,
  originalMessage,
};
