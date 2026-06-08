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

/**
 * Normalize a features row for API/admin UI.
 */
function normalizeFeatureRow(row) {
  if (!row) return null;

  let documentation = parseJsonbField(row.documentation, {});
  if (typeof documentation === 'string') {
    documentation = parseJsonbField(documentation, {});
  }
  if (!documentation || typeof documentation !== 'object' || Array.isArray(documentation)) {
    documentation = {};
  }

  const topDevNotes = parseJsonbField(row.dev_notes, null);
  const topChangelog = parseJsonbField(row.changelog, null);
  const docDevNotes = parseJsonbField(documentation.dev_notes, null);
  const docChangelog = parseJsonbField(documentation.changelog, null);

  const devNotes = Array.isArray(docDevNotes)
    ? docDevNotes
    : (Array.isArray(topDevNotes) ? topDevNotes : []);
  const changelog = Array.isArray(docChangelog)
    ? docChangelog
    : (Array.isArray(topChangelog) ? topChangelog : []);

  documentation = { ...documentation, dev_notes: devNotes, changelog };

  let tags = row.tags;
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = [];
    }
  }
  if (!Array.isArray(tags)) tags = tags ? [tags] : [];

  return {
    ...row,
    tags,
    documentation,
    dev_notes: devNotes,
    changelog,
  };
}

module.exports = { normalizeFeatureRow, parseJsonbField };
