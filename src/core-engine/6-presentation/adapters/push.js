'use strict';

/**
 * Dumb push adapter — respects validityWindow only. No DB reads, no local product rules.
 * @param {import('../../index').EngineOutput} output
 * @param {number} currentHour 0–23
 * @param {{ send: (payload: { title: string, body: string }) => Promise<void> }} transport
 */
async function processDirective(output, currentHour, transport) {
  const { policy } = output;
  const { startHour, endHour } = policy.validityWindow;

  if (currentHour < startHour || currentHour > endHour) {
    return { sent: false, reason: 'outside_validity_window', policy: policy.name };
  }

  const templates = {
    SHOW_CHILD: { title: 'Visa barnet rutinen', body: 'Det tar under en minut.' },
    ADD_EVENING: { title: 'Dags för kvällsrutinen?', body: 'Gör kvällen lika enkel som morgonen.' },
    TRIGGER_CELEBRATION: { title: 'Första steget är klart!', body: 'Klicka för att fira tillsammans.' },
    INVITE_CO_PARENT: { title: 'Dela rutinen', body: 'Bjud in den andra föräldern.' },
    SIMPLIFY_ROUTINE: { title: 'Vi finns kvar', body: 'Börja med ett litet steg idag.' },
    CUSTOMIZE_ROUTINE: { title: 'Anpassa rutinen', body: 'Gör schemat till er eget.' },
  };

  const payload = templates[policy.name];
  if (!payload) {
    return { sent: false, reason: 'no_template', policy: policy.name };
  }

  await transport.send(payload);
  return { sent: true, policy: policy.name };
}

module.exports = { processDirective };
