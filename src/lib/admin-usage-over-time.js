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

const CSV_BOM = '\uFEFF';
const CSV_SEPARATOR = ';';
const CSV_HEADER = [
  'tabell',
  'nyckel',
  'etikett',
  'antal',
  'familjer',
  'barn',
  'andel_procent',
  'anteckning',
];

const DEFINITION_LABELS = {
  families: 'Familjer',
  completions: 'Avbockningar',
  customActivities: 'Egna aktiviteter',
  libraryActivities: 'Biblioteket',
  unknownActivities: 'Okänd källa',
  weekday: 'Veckodag',
  schedules: 'Scheman',
  namedTemplates: 'Namngivna mallar',
};

function csvCell(value) {
  if (value == null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvLine(cells) {
  return cells.map(csvCell).join(CSV_SEPARATOR);
}

function addCsvRow(rows, tabell, nyckel, etikett, fields = {}) {
  rows.push([
    tabell,
    nyckel,
    etikett,
    fields.count == null ? '' : fields.count,
    fields.families == null ? '' : fields.families,
    fields.children == null ? '' : fields.children,
    fields.share == null ? '' : fields.share,
    fields.note == null ? '' : fields.note,
  ]);
}

function usageCsvFilename(data, now = new Date()) {
  const days = (data && data.period && data.period.days) || 90;
  const stamp = (data && data.period && data.period.to)
    || now.toISOString().slice(0, 10);
  return `anvandning-over-tid-${days}d-${stamp}.csv`;
}

function buildUsageOverTimeCsv(data = {}) {
  const rows = [CSV_HEADER];
  const period = data.period || {};
  const totals = data.totals || {};
  const custom = data.custom || {};
  const weekday = data.weekday || {};
  const templateSources = data.template_sources || {};
  const completionSources = data.completion_sources || {};
  const completionFamilies = completionSources.families || {};
  const rewards = data.rewards || {};
  const specialDays = data.special_days || {};
  const definitions = data.definitions || DEFINITIONS;

  addCsvRow(rows, 'period', 'dagar', 'Antal dagar', { note: period.days });
  addCsvRow(rows, 'period', 'from', 'Från', { note: period.from });
  addCsvRow(rows, 'period', 'to', 'Till', { note: period.to });
  addCsvRow(rows, 'period', 'timezone', 'Tidszon', {
    note: period.timezone || 'Europe/Stockholm',
  });
  addCsvRow(rows, 'period', 'format', 'Filformat', {
    note: 'Semikolon och UTF-8 så Excel i Sverige öppnar kolumnerna och åäö rätt. Samma population som fliken Så används appen — inte händelseloggen.',
  });
  addCsvRow(rows, 'sammanfattning', 'headline', 'Sammanfattning', {
    note: data.headline || '',
  });

  addCsvRow(rows, 'total', 'product_families', 'Produktfamiljer', {
    families: totals.product_families,
  });
  addCsvRow(rows, 'total', 'completions', 'Avbockningar i perioden', {
    count: totals.completions,
    families: totals.families_active,
    children: totals.children_active,
  });
  addCsvRow(rows, 'total', 'peak_daily_families', 'Flest familjer en enskild dag', {
    families: totals.peak_daily_families,
  });
  addCsvRow(rows, 'total', 'children', 'Barn i produktfamiljer', {
    children: totals.children,
  });
  addCsvRow(rows, 'total', 'children_with_week', 'Barn med veckoschema', {
    children: totals.children_with_week,
  });
  addCsvRow(rows, 'total', 'children_with_items', 'Barn med minst en aktivitetsrad', {
    children: totals.children_with_items,
  });

  for (const row of data.daily || []) {
    addCsvRow(rows, 'dag', row.day, row.day, {
      count: row.completions,
      families: row.families,
      children: row.children,
    });
  }

  for (const row of weekday.days || []) {
    addCsvRow(rows, 'veckodag', row.iso_dow, row.label, {
      count: row.completions,
      families: row.families,
    });
  }
  addCsvRow(rows, 'veckodag', 'vardag_andel', 'Vardagar mån–fre', {
    share: weekday.weekday_share,
  });
  addCsvRow(rows, 'veckodag', 'helg_andel', 'Helg lör–sön', {
    share: weekday.weekend_share,
  });
  if (weekday.peak) {
    addCsvRow(rows, 'veckodag', 'topp', weekday.peak.label, {
      count: weekday.peak.completions,
      families: weekday.peak.families,
      note: 'Veckodag med flest avbockningar',
    });
  }

  for (const row of data.sections || []) {
    addCsvRow(rows, 'dagdel', row.section, row.label, {
      count: row.completions,
      families: row.families,
    });
  }

  addCsvRow(rows, 'aktivitetskalla', 'user', SOURCE_LABELS.user, {
    count: custom.user_templates,
    families: custom.families_with_user,
    share: templateSources.user_share,
  });
  addCsvRow(rows, 'aktivitetskalla', 'library', SOURCE_LABELS.library, {
    count: custom.library_templates,
    families: custom.families_with_library,
    share: templateSources.library_share,
  });
  addCsvRow(rows, 'aktivitetskalla', 'unknown', SOURCE_LABELS.unknown, {
    count: custom.unknown_templates,
    families: custom.families_with_unknown,
    share: templateSources.unknown_share,
  });
  addCsvRow(rows, 'aktivitetskalla', 'totalt', 'Alla aktiviteter i familjebiblioteket', {
    count: custom.templates_total,
    families: custom.families_with_any_template,
  });

  addCsvRow(rows, 'avbockningskalla', 'user', SOURCE_LABELS.user, {
    count: completionSources.user,
    families: completionFamilies.user,
    share: completionSources.user_share,
  });
  addCsvRow(rows, 'avbockningskalla', 'library', SOURCE_LABELS.library, {
    count: completionSources.library,
    families: completionFamilies.library,
    share: completionSources.library_share,
  });
  addCsvRow(rows, 'avbockningskalla', 'unknown', SOURCE_LABELS.unknown, {
    count: completionSources.unknown,
    families: completionFamilies.unknown,
    share: completionSources.unknown_share,
  });

  for (const row of data.top_activities || []) {
    addCsvRow(rows, 'aktivitet', row.name, row.name, {
      count: row.completions,
      families: row.families,
    });
  }

  for (const row of data.schedule_weekdays || []) {
    addCsvRow(rows, 'veckoschema', row.day_of_week, row.label, {
      count: row.items,
      children: row.children,
      note: 'Aktivitetsrader just nu. Söndag är dag 0 i databasen.',
    });
  }

  for (const row of data.named_templates || []) {
    addCsvRow(rows, 'namngivet_schema', row.name, row.name, {
      count: row.schedule_rows,
      families: row.families,
      children: row.children,
    });
  }

  addCsvRow(rows, 'beloning', 'redemptions', 'Belöningar hämtade', {
    count: rewards.redemptions,
    families: rewards.families,
    children: rewards.children,
  });
  addCsvRow(rows, 'specialdag', 'count', 'Specialdagar just nu', {
    count: specialDays.count,
    children: specialDays.children,
  });

  for (const [key, text] of Object.entries(definitions)) {
    addCsvRow(rows, 'definition', key, DEFINITION_LABELS[key] || key, { note: text });
  }

  return `${CSV_BOM}${rows.map(csvLine).join('\r\n')}\r\n`;
}

module.exports = {
  WEEKDAY_ISO_LABELS,
  WEEKDAY_JS_LABELS,
  WEEKDAY_JS_DISPLAY_ORDER,
  SECTION_ORDER,
  SECTION_LABELS,
  SOURCE_LABELS,
  DEFINITIONS,
  CSV_BOM,
  CSV_SEPARATOR,
  CSV_HEADER,
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
  usageCsvFilename,
  buildUsageOverTimeCsv,
};
