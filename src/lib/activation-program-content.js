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

module.exports = { getDayContent };
