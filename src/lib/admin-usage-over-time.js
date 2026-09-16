'use strict';

/**
 * Pure helpers for founder-facing “Så används appen”.
 * Completions, weekdays, and activity sources stay on one population —
 * never mix analytics_events with daily_log / schedule tables.
 */

const WEEKDAY_ISO_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const WEEKDAY_JS_LABELS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
const WEEKDAY_JS_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SECTION_ORDER = ['morgon', 'dag', 'kvall', 'natt'];
const SECTION_LABELS = {
  morgon: 'Morgon',
  dag: 'Dag',
  kvall: 'Kväll',
  natt: 'Natt',
};
const SOURCE_LABELS = {
  user: 'Egna (skapade i familjen)',
  library: 'Från biblioteket',
  unknown: 'Okänd källa (ofta inläst vid start)',
};

const DEFINITIONS = {
  families: 'Icke-arkiverade familjer utan administratörskonto.',
  completions:
    'Avbockade aktiviteter. Dagen är schemadagen (completed_date), annars klockslaget i svensk tid.',
  customActivities:
    'Aktiviteter där källan är user — skapade i familjen, inte kopierade från biblioteket.',
  libraryActivities: 'Aktiviteter där källan är admin — inlästa från biblioteket.',
  unknownActivities:
    'Aktiviteter utan sparad källa. Ofta inlästa vid registrering innan källan fanns.',
  weekday:
    'Veckodag för avbockningens schemadag. Måndag–söndag i Europe/Stockholm.',
  schedules:
    'Barnets veckoschema just nu, inte historik. Söndag är dag 0 i databasen.',
  namedTemplates:
    'Namngivna veckomallar (fältet name). De flesta barn har dagsschema utan namn.',
};

function clampDays(raw, { min = 7, max = 90, fallback = 90 } = {}) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sharePct(part, whole) {
  const p = Number(part) || 0;
  const w = Number(whole) || 0;
  if (w <= 0) return 0;
  return Math.round((p / w) * 1000) / 10;
}

function classifyTemplateSource(source) {
  const value = String(source || '').trim().toLowerCase();
  if (value === 'user') return 'user';
  if (value === 'admin') return 'library';
  return 'unknown';
}

function addUtcDays(isoDate, days) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function eachDateInclusive(fromStr, toStr) {
  const from = String(fromStr || '');
  const to = String(toStr || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return [];
  }
  const out = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addUtcDays(cur, 1);
  }
  return out;
}

function fillDailySeries(rows, fromStr, toStr) {
  const byDay = new Map();
  for (const row of rows || []) {
    const day = String(row.day || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    byDay.set(day, {
      day,
      completions: Number(row.completions) || 0,
      families: Number(row.families) || 0,
      children: Number(row.children) || 0,
    });
  }
  return eachDateInclusive(fromStr, toStr).map((day) => (
    byDay.get(day) || { day, completions: 0, families: 0, children: 0 }
  ));
}

function weekdayFromIsoRows(rows) {
  const filled = [];
  for (let dow = 1; dow <= 7; dow++) {
    const row = (rows || []).find((r) => Number(r.iso_dow) === dow) || {};
    filled.push({
      iso_dow: dow,
      label: WEEKDAY_ISO_LABELS[dow - 1],
      completions: Number(row.completions) || 0,
      families: Number(row.families) || 0,
    });
  }
  const total = filled.reduce((sum, row) => sum + row.completions, 0);
  const weekdayCompletions = filled
    .filter((row) => row.iso_dow <= 5)
    .reduce((sum, row) => sum + row.completions, 0);
  const weekendCompletions = filled
    .filter((row) => row.iso_dow >= 6)
    .reduce((sum, row) => sum + row.completions, 0);
  let peak = filled[0];
  for (const row of filled) {
    if (row.completions > peak.completions) peak = row;
  }
  return {
    days: filled,
    total,
    peak,
    weekday_share: sharePct(weekdayCompletions, total),
    weekend_share: sharePct(weekendCompletions, total),
  };
}

function sectionsFromRows(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    const key = String(row.section || '').trim() || 'okand';
    byKey.set(key, {
      section: key,
      label: SECTION_LABELS[key] || key,
      completions: Number(row.completions) || 0,
      families: Number(row.families) || 0,
    });
  }
  const ordered = SECTION_ORDER
    .map((key) => byKey.get(key) || {
      section: key,
      label: SECTION_LABELS[key],
      completions: 0,
      families: 0,
    });
  for (const [key, row] of byKey) {
    if (!SECTION_ORDER.includes(key)) ordered.push(row);
  }
  return ordered;
}

function scheduleWeekdaysFromRows(rows) {
  const byDow = new Map();
  for (const row of rows || []) {
    const dow = Number(row.day_of_week);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) continue;
    byDow.set(dow, {
      day_of_week: dow,
      label: WEEKDAY_JS_LABELS[dow],
      items: Number(row.items) || 0,
      children: Number(row.children) || 0,
    });
  }
  return WEEKDAY_JS_DISPLAY_ORDER.map((dow) => (
    byDow.get(dow) || {
      day_of_week: dow,
      label: WEEKDAY_JS_LABELS[dow],
      items: 0,
      children: 0,
    }
  ));
}

function sourceBucketsFromCounts(counts) {
  const user = Number(counts.user) || 0;
  const library = Number(counts.library) || 0;
  const unknown = Number(counts.unknown) || 0;
  const total = user + library + unknown;
  return {
    user,
    library,
    unknown,
    total,
    user_share: sharePct(user, total),
    library_share: sharePct(library, total),
    unknown_share: sharePct(unknown, total),
  };
}

function buildUsageHeadline({ weekday, custom, periodDays }) {
  const days = Number(periodDays) || 0;
  const peak = weekday && weekday.peak;
  const parts = [];
  if (!peak || peak.completions <= 0) {
    parts.push(`Inga avbockningar under de senaste ${days} dagarna.`);
  } else {
    parts.push(`${peak.label} har flest avbockningar (${peak.completions}).`);
    parts.push(
      `Helgen är ${weekday.weekend_share} % av avbockningarna, vardagar ${weekday.weekday_share} %.`
    );
  }
  const familiesWithTemplates = Number(custom && custom.families_with_any_template) || 0;
  const familiesWithUser = Number(custom && custom.families_with_user) || 0;
  if (familiesWithTemplates > 0) {
    parts.push(
      `${familiesWithUser} av ${familiesWithTemplates} familjer med aktiviteter har skapat minst en egen.`
    );
  }
  return parts.join(' ');
}

module.exports = {
  WEEKDAY_ISO_LABELS,
  WEEKDAY_JS_LABELS,
  WEEKDAY_JS_DISPLAY_ORDER,
  SECTION_ORDER,
  SECTION_LABELS,
  SOURCE_LABELS,
  DEFINITIONS,
  clampDays,
  sharePct,
  classifyTemplateSource,
  addUtcDays,
  eachDateInclusive,
  fillDailySeries,
  weekdayFromIsoRows,
  sectionsFromRows,
  scheduleWeekdaysFromRows,
  sourceBucketsFromCounts,
  buildUsageHeadline,
};
