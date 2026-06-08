'use strict';

function parseJsonbField(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

/** Coerce seed/prod values to string[] (acceptance_criteria, user_stories). */
function asStringArray(val) {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map((s) => String(s)).filter(Boolean);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    return trimmed.split(/\n/).map((s) => s.trim()).filter(Boolean);
  }
  return [String(val)];
}

function asNoteArray(val) {
  if (!Array.isArray(val)) return [];
  return val.filter((n) => n && typeof n === 'object' && !Array.isArray(n));
}

function asChangelogArray(val) {
  if (!Array.isArray(val)) return [];
  return val.filter((e) => e && typeof e === 'object' && !Array.isArray(e));
}

/**
 * Normalize documentation JSONB for API + DB.
 * Seed data stores acceptance_criteria as string; admin UI expects string[].
 */
function normalizeDocumentation(doc) {
  let d = parseJsonbField(doc, {});
  if (typeof d === 'string') d = parseJsonbField(d, {});
  if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};

  const normalized = { ...d };

  if (normalized.acceptance_criteria != null) {
    normalized.acceptance_criteria = asStringArray(normalized.acceptance_criteria);
  }
  if (normalized.user_stories != null) {
    normalized.user_stories = asStringArray(normalized.user_stories);
  }
  if (normalized.user_story != null && typeof normalized.user_story !== 'string') {
    normalized.user_story = Array.isArray(normalized.user_story)
      ? normalized.user_story.join('\n')
      : String(normalized.user_story);
  }

  normalized.dev_notes = asNoteArray(normalized.dev_notes);
  normalized.changelog = asChangelogArray(normalized.changelog);

  return JSON.parse(JSON.stringify(normalized));
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (tags == null) return [];
  if (typeof tags === 'string') {
    const t = tags.trim();
    if (!t) return [];
    if (t.startsWith('{') && t.endsWith('}')) {
      return t
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
    }
    return [t];
  }
  return [String(tags)];
}

/**
 * Normalize a features row for API/admin UI.
 */
function normalizeFeatureRow(row) {
  if (!row) return null;

  const topDevNotes = parseJsonbField(row.dev_notes, null);
  const topChangelog = parseJsonbField(row.changelog, null);

  let documentation = normalizeDocumentation(row.documentation);
  const docDevNotes = documentation.dev_notes || [];
  const docChangelog = documentation.changelog || [];

  const devNotes = docDevNotes.length
    ? docDevNotes
    : asNoteArray(topDevNotes);
  const changelog = docChangelog.length
    ? docChangelog
    : asChangelogArray(topChangelog);

  documentation = { ...documentation, dev_notes: devNotes, changelog };

  return {
    ...row,
    tags: normalizeTags(row.tags),
    documentation,
    dev_notes: devNotes,
    changelog,
  };
}

/** Strip API-only fields and return values safe for features INSERT. */
function prepareFeatureForDb(row) {
  const n = normalizeFeatureRow(row);
  if (!n) return null;

  const documentation = normalizeDocumentation(n.documentation);
  const devNotes = n.dev_notes || [];
  const changelog = n.changelog || [];

  return {
    slug: n.slug,
    name: n.name,
    description: n.description || null,
    status: n.status || 'off',
    tags: normalizeTags(n.tags),
    priority: n.priority || 'medium',
    complexity: n.complexity != null ? Number(n.complexity) : 5,
    estimated_hours: n.estimated_hours != null && n.estimated_hours !== ''
      ? Number(n.estimated_hours)
      : null,
    documentation,
    dev_notes: devNotes,
    changelog,
    category: n.category || null,
  };
}

module.exports = {
  parseJsonbField,
  asStringArray,
  normalizeDocumentation,
  normalizeTags,
  normalizeFeatureRow,
  prepareFeatureForDb,
};
