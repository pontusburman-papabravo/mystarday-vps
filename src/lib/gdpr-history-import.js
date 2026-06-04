/**
 * Import star/completion history from GDPR export ZIP (07_aktiviteter.csv, 09_manuella_stjarnor.csv).
 */

const { randomUUID } = require('crypto');

function parseCsv(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'Ingen data') continue;
    const values = parseCsvLine(line);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (line.charAt(i + 1) === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseBool(value) {
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === 't' || s === 'ja' || s === '1';
}

function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * @param {object} opts
 * @param {Map<string, string>} opts.childByName — lowercased child name → id
 * @param {Map<string, string>} opts.activityByName — lowercased activity name → id
 * @param {Map<string, string>} opts.activityIconByName
 * @param {Map<string, string>} opts.logByChildDate — `${childId}:${date}` → daily_log id
 * @param {string} [opts.primaryParentId]
 */
function buildGdprHistoryBundles(opts, csv) {
  const activities = parseCsv(csv.activities || '');
  const manual = parseCsv(csv.manualStars || '');

  const itemRows = [];
  const manualRows = [];
  const warnings = [];
  const sortByLog = new Map();

  for (const row of activities) {
    const childName = row.barn?.trim();
    const date = normalizeDate(row.datum);
    const activityName = row.aktivitet?.trim() || 'Aktivitet';
    if (!childName || !date) continue;

    const childId = opts.childByName.get(childName.toLowerCase());
    if (!childId) {
      warnings.push(`aktivitet: barn "${childName}" hittades inte — hoppar rad`);
      continue;
    }

    const logKey = `${childId}:${date}`;
    const dailyLogId = opts.logByChildDate.get(logKey);
    if (!dailyLogId) {
      warnings.push(`aktivitet: daily_log saknas för ${childName} ${date} — kör import:harvest först`);
      continue;
    }

    const templateId = opts.activityByName.get(activityName.toLowerCase()) || null;
    const icon = opts.activityIconByName.get(activityName.toLowerCase()) || '⭐';
    const completed = parseBool(row.avbockad);
    const starValue = parseInt(row.tjänade_stjärnor || row['tjänade_stjarnor'] || row.tjarnade_stjarnor || '1', 10) || 1;
    const section = row.section?.trim() || 'morgon';
    const completedAt = row.avbockad_kl?.trim() || null;

    const sortKey = dailyLogId;
    const sortOrder = sortByLog.get(sortKey) ?? 0;
    sortByLog.set(sortKey, sortOrder + 1);

    itemRows.push({
      id: randomUUID(),
      daily_log_id: dailyLogId,
      activity_template_id: templateId,
      name: activityName,
      icon,
      star_value: starValue,
      completed,
      completed_at: completed && completedAt ? completedAt : completed ? `${date}T12:00:00.000Z` : null,
      completed_date: completed ? date : null,
      sort_order: sortOrder,
      child_sort_order: sortOrder,
      section,
    });
  }

  for (const row of manual) {
    const childName = row.barn?.trim();
    if (!childName) continue;
    const childId = opts.childByName.get(childName.toLowerCase());
    if (!childId) {
      warnings.push(`manuella stjärnor: barn "${childName}" hittades inte`);
      continue;
    }
    manualRows.push({
      id: randomUUID(),
      child_id: childId,
      granted_by: opts.primaryParentId || null,
      star_count: parseInt(row.stjarnor || row.stjärnor || '1', 10) || 1,
      reason: row.anledning?.trim() || null,
      created_at: row.datum?.trim() || new Date().toISOString(),
    });
  }

  return {
    bundles: [
      { table: 'daily_log_item', conflict: ['id'], rows: itemRows },
      { table: 'manual_star_grant', conflict: ['id'], rows: manualRows },
    ],
    warnings,
    meta: { items: itemRows.length, manualStars: manualRows.length },
  };
}

module.exports = {
  parseCsv,
  parseCsvLine,
  buildGdprHistoryBundles,
};
