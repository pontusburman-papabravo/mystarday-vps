'use strict';

const { ACTIVE_RELEASE_ID } = require('./l1-governance-config');

const GO_LIVE_ITEMS = [
  {
    key: 'engine_readonly',
    label: 'Engine körs read-only i prod (ingen state write, bara rekommendationer)',
    due_offset_days: 0,
  },
  {
    key: 'first_success_payload',
    label: '/first-success returnerar stabil payload (intent + policy + release_id)',
    due_offset_days: 0,
  },
  {
    key: 'l1_admin_ui',
    label: 'L1 admin UI aktivt (ja/nej + beslutstyp + override)',
    due_offset_days: 0,
  },
  {
    key: 'decision_logging',
    label: 'Beslut loggas (decision_type, override, release_id, timestamp)',
    due_offset_days: 0,
  },
  {
    key: 'coach_mount_only',
    label: '#engineCoachMount är enda A-yta (ingen parallell coach i frontend)',
    due_offset_days: 0,
  },
  {
    key: 'bcd_unchanged',
    label: 'B/C fortsätter men skriver inte coach-slotten',
    due_offset_days: 0,
  },
  {
    key: 'no_auto_act',
    label: 'Engine auto-agerar inte (ingen ACT/INVESTIGATE automation)',
    due_offset_days: 0,
  },
  {
    key: 'observability_axes',
    label: '3 observability-axlar aktiva (competition, ambiguity, non-adoption)',
    due_offset_days: 0,
  },
  {
    key: 'accept_unknown_active',
    label: 'ACCEPT-UNKNOWN kan registreras som aktivt beslut',
    due_offset_days: 7,
  },
  {
    key: 'l1_owners_scheduled',
    label: 'L1-ägare + backup + dag 7/14 review bokad',
    due_offset_days: 0,
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
