'use strict';

const { ACTIVE_RELEASE_ID } = require('./l1-governance-config');

const GO_LIVE_ITEMS = [
  {
    key: 'engine_readonly',
    label: 'Engine körs read-only i prod (ingen state write, bara rekommendationer)',
    due_offset_days: 0,
    verify_how:
      'På Hem (/dashboard): leta efter kortet med rubriken NÄSTA STEG (inte dagens sammanfattning med t.ex. "Astrid är redo för nästa aktivitet"). ' +
      'Engine-coachen har en gul fullbredds-knapp (t.ex. "Visa barnet" / "Öppna schema"). ' +
      'Desktop: DevTools → Network → GET /api/family/first-success (200). Inget skrivande anrop från engine vid sidladdning. ' +
      'Mobil: räcker att NÄSTA STEG-kortet syns efter omladdning.',
  },
  {
    key: 'first_success_payload',
    label: '/first-success returnerar stabil payload (intent + policy + release_id)',
    due_offset_days: 0,
    verify_how:
      'Inloggad på /dashboard: DevTools → Network → first-success → Response 200. ' +
      'JSON ska innehålla policy (id, name), milestone och trace (evaluatedNeed, policySet). ' +
      'Coach på sidan ska rendera utan fel i konsolen. release_id coach_primary_v1 syns i coach-intro vid ny release.',
  },
  {
    key: 'l1_admin_ui',
    label: 'L1 admin UI aktivt (ja/nej + beslutstyp + override)',
    due_offset_days: 0,
    verify_how:
      'Du är på denna sida. Klicka Ja/Nej på minst en fråga — rekommendation uppdateras. ' +
      'Välj valfritt override i listan — förhandslogg ändras. Kryssa i godkännande och testa Spara beslut (kan vara HOLD).',
  },
  {
    key: 'decision_logging',
    label: 'Beslut loggas (decision_type, override, release_id, timestamp)',
    due_offset_days: 0,
    verify_how:
      'Spara ett beslut (t.ex. HOLD). Scrolla till Beslutslogg: ny rad med datum, decision_type och loggrad som innehåller coach_primary_v1. ' +
      'Om du använde override ska det synas i loggraden / answers (used_override).',
  },
  {
    key: 'coach_mount_only',
    label: '#engineCoachMount är enda A-yta (ingen parallell coach i frontend)',
    due_offset_days: 0,
    verify_how:
      'På /dashboard: coach ska ligga i elementet #engineCoachMount (högerklick → Inspektera). ' +
      'Det ska inte finnas en second coach-ruta med annan copy som uppdateras parallellt av annat script.',
  },
  {
    key: 'bcd_unchanged',
    label: 'B/C fortsätter men skriver inte coach-slotten',
    due_offset_days: 0,
    verify_how:
      'På /dashboard: readiness-sektionen finns kvar under coach. Klicka en readiness-åtgärd — coach-texten i #engineCoachMount ska vara oförändrad efteråt. ' +
      'Bara engine-coach.js skriver i coach-mount.',
  },
  {
    key: 'no_auto_act',
    label: 'Engine auto-agerar inte (ingen ACT/INVESTIGATE automation)',
    due_offset_days: 0,
    verify_how:
      'Bekräfta frysperiod: inget beslut skrivs i L1-loggen utan att du klickat Spara. ' +
      'Ingen deploy/scheduler ska auto-ändra L1 state eller skicka ACT/INVESTIGATE utan människa. Bocka när du accepterat detta till dag 14.',
  },
  {
    key: 'observability_axes',
    label: '3 observability-axlar aktiva (competition, ambiguity, non-adoption)',
    due_offset_days: 0,
    verify_how:
      'På denna sida: raden med Coach klick 7d, Conflict 7d, Readiness klick 7d m.fl. ska laddas (siffror kan vara 0 i början). ' +
      'Det visar att event-strukturen finns — inte att trafiken är hög.',
  },
  {
    key: 'accept_unknown_active',
    label: 'ACCEPT-UNKNOWN kan registreras som aktivt beslut',
    due_offset_days: 7,
    verify_how:
      'Först dag 7+. I L1-panelen: svara Ja på intent + non-adoption, Nej på drift — rekommendation blir ACCEPT-UNKNOWN. ' +
      'Spara med godkännande (eller override ACCEPT-UNKNOWN). Verifiera i beslutslogg — inte bara HOLD som default.',
  },
  {
    key: 'l1_owners_scheduled',
    label: 'L1-ägare + backup + dag 7/14 review bokad',
    due_offset_days: 0,
    verify_how:
      'Primär + backup ifyllda nedan och sparade. Dag 7 och dag 14 satta. ' +
      'Boka båda i kalender (gul påminnelse) och kryssa i “Jag har bokat dag 7 och dag 14”.',
  },
];

function addDays(isoStart, days) {
  const d = new Date(isoStart);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(9, 0, 0, 0);
  return d.toISOString();
}

function buildDefaultChecklist(startedAt) {
  const start = startedAt || new Date().toISOString();
  return {
    release_id: ACTIVE_RELEASE_ID,
    items: GO_LIVE_ITEMS.map((item, idx) => ({
      key: item.key,
      label: item.label,
      verify_how: item.verify_how,
      sort: idx + 1,
      checked: false,
      checked_at: null,
      checked_by: null,
      due_at: addDays(start, item.due_offset_days),
    })),
    updated_at: new Date().toISOString(),
  };
}

function mergeChecklist(stored, startedAt) {
  const defaults = buildDefaultChecklist(startedAt);
  if (!stored || !stored.items || !stored.items.length) return defaults;
  const byKey = {};
  for (const item of stored.items) byKey[item.key] = item;
  return {
    ...defaults,
    items: defaults.items.map((def) => {
      const prev = byKey[def.key];
      if (!prev) return def;
      return {
        ...def,
        checked: Boolean(prev.checked),
        checked_at: prev.checked_at || null,
        checked_by: prev.checked_by || null,
        note: prev.note || null,
      };
    }),
    updated_at: stored.updated_at || defaults.updated_at,
  };
}

function checklistProgress(items) {
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  return { done, total, all_complete: done === total };
}

module.exports = {
  GO_LIVE_ITEMS,
  buildDefaultChecklist,
  mergeChecklist,
  checklistProgress,
  addDays,
};
