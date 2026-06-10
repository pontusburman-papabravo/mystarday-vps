/**
 * Per-day copy for activation programs (Fas 3).
 * MVP: onboarding_7d only (invariant #15).
 */

function getDayContent(effectiveDay, ctx = {}) {
  const childName = ctx.childName || 'barnet';
  const days = {
    1: {
      title: 'Dag 1 — kika tillsammans',
      body: `Så här ser ${childName} sitt schema — kika tillsammans.`,
      cta_label: 'Visa barnupplevelsen',
      cta_type: 'open_child_view',
      show_preview: true,
    },
    2: {
      title: 'Dag 2 — morgonkollen',
      body: 'Öppna dashboarden någon gång idag — det tar bara 30 sekunder.',
      cta_label: 'Öppna schemat',
      cta_type: 'open_schedule',
      cta_url: '/dashboard',
    },
    3: {
      title: 'Dag 3 — fira en stjärna',
      body: `Har ${childName} fått en stjärna? Fira tillsammans!`,
      cta_label: 'Se dagens schema',
      cta_type: 'open_schedule',
      cta_url: '/dashboard',
      supportive_fallback: 'Första veckan handlar om att komma igång — det räcker att du kikar in och ser att schemat ligger redo.',
    },
    4: {
      title: 'Dag 4 — er app',
      body: 'Något som känns fel? Byt ut en aktivitet vid behov.',
      cta_label: 'Redigera schema',
      cta_type: 'open_schedule',
      cta_url: '/schedule',
    },
    5: {
      title: 'Dag 5 — belöning',
      body: `Kolla Skattkammaren — vad drömmer ${childName} om?`,
      cta_label: 'Öppna Skattkammaren',
      cta_type: 'open_rewards',
      cta_url: '/library-treasury',
    },
    6: {
      title: 'Dag 6 — dela ansvaret',
      body: 'Vill du dela ansvaret med någon?',
      cta_label: 'Bjud in någon',
      cta_type: 'invite_coparent',
      cta_url: '/family',
      solo_label: 'Jag kör solo!',
    },
    7: {
      title: 'En vecka! 🎉',
      body: 'Grattis! Hur har veckan varit?',
      cta_label: 'Svara på frågan',
      cta_type: 'submit_reflection',
    },
  };
  return days[effectiveDay] || days[7];
}

/**
 * Push copy for days 2–7 (spec §4). Day 1 has no push.
 * @returns {{ title: string, body: string, url: string } | null}
 */
function getPushContent(effectiveDay, ctx = {}) {
  if (effectiveDay < 2 || effectiveDay > 7) return null;

  const childName = ctx.childName || 'barnet';
  const dayContent = getDayContent(effectiveDay, ctx);
  const bodies = {
    2: `God morgon! Kolla ${childName}s schema — tar 30 sek 🌅`,
    3: `Har ${childName} fått en stjärna idag? Fira tillsammans ⭐`,
    4: 'Något som känns fel? Byt ut en aktivitet ✏️',
    5: `Kolla Skattkammaren — vad drömmer ${childName} om? 🎁`,
    6: 'Vill du dela ansvaret med någon? 👥',
    7: 'Grattis! Hur har veckan varit?',
  };

  const baseUrl = dayContent.cta_url || '/dashboard';
  const separator = baseUrl.includes('?') ? '&' : '?';

  return {
    title: 'Min Stjärndag',
    body: bodies[effectiveDay],
    url: `${baseUrl}${separator}ap_push=${effectiveDay}`,
  };
}

module.exports = { getDayContent, getPushContent };
