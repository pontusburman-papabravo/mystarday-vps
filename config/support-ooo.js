'use strict';

/**
 * Temporary founder-away support window (1–10 September 2026).
 * User-facing copy is date-gated and turns itself off after 11 September.
 */

const TIMEZONE = 'Europe/Stockholm';
const FROM_DATE = '2026-09-01';
const THROUGH_DATE = '2026-09-11';

const COPY = {
  'sv-SE': {
    intro:
      'Vi är bortresta 1–10 september. Vi läser alla meddelanden. Kan vi hjälpa direkt gör vi det; annars återkommer vi så snart vi kan, senast 11 september.',
    success:
      'Tack! Vi har tagit emot ditt meddelande. Vi är bortresta 1–10 september och återkommer så snart vi kan, senast 11 september.',
    subtitle: 'Vi är bortresta 1–10 september',
    replyFallback:
      'Tack för att du hör av dig. Vi är bortresta just nu och återkommer så snart vi kan, senast 11 september.',
  },
  'en-GB': {
    intro:
      'We are away 1–10 September. We read every message. If we can help straight away we will; otherwise we will get back as soon as we can, by 11 September at the latest.',
    success:
      'Thanks! We received your message. We are away 1–10 September and will get back as soon as we can, by 11 September at the latest.',
    subtitle: 'We are away 1–10 September',
    replyFallback:
      'Thanks for getting in touch. We are away right now and will get back as soon as we can, by 11 September at the latest.',
  },
};

function stockholmDateStamp(now) {
  const date = now instanceof Date ? now : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isOooActive(now) {
  const stamp = stockholmDateStamp(now);
  return stamp >= FROM_DATE && stamp <= THROUGH_DATE;
}

function copyForLocale(locale) {
  const key = String(locale || '').toLowerCase().startsWith('en') ? 'en-GB' : 'sv-SE';
  return COPY[key];
}

module.exports = {
  TIMEZONE,
  FROM_DATE,
  THROUGH_DATE,
  COPY,
  stockholmDateStamp,
  isOooActive,
  copyForLocale,
};
