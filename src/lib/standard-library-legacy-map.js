'use strict';

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const DEFAULT_LEGACY_MAP_PATH = path.join(
  __dirname,
  '../../config/standard-library/v1.1-legacy-map.json'
);

const MAP_FORMAT = '\u006dystarday-standard-library-legacy-map';

const CLASSIFICATIONS = [
  'EXACT',
  'SAFE_EXPLICIT_MAPPING',
  'TEACCH_OVERLAY',
  'LEGACY_ROW_PRESERVE',
  'NON_STANDARD_CONTENT',
  'AMBIGUOUS',
  'UNMAPPED',
];

const PRESERVE_CLASSIFICATIONS = new Set([
  'TEACCH_OVERLAY',
  'LEGACY_ROW_PRESERVE',
  'NON_STANDARD_CONTENT',
]);

const MatchRuleSchema = z.object({
  legacy_id: z.string().uuid().optional(),
  legacy_name: z.string().min(1).optional(),
  package_component: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
}).strict().refine(
  (match) => match.legacy_id || match.legacy_name,
  'match must include legacy_id and/or legacy_name'
);

const ActivityMapEntrySchema = z.object({
  match: MatchRuleSchema,
  canonical_id: z.string().regex(/^[a-z][a-z0-9_]*$/).nullable().optional(),
  classification: z.enum(CLASSIFICATIONS),
  treatment: z.string().optional(),
  reason: z.string().optional(),
}).strict();

const ScheduleMapEntrySchema = z.object({
  match: z.object({
    legacy_id: z.string().uuid().optional(),
    legacy_name: z.string().min(1),
  }).strict(),
  canonical_schedule_id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  classification: z.enum(['EXACT', 'SAFE_EXPLICIT_MAPPING', 'AMBIGUOUS', 'UNMAPPED']),
  reason: z.string().optional(),
}).strict();

const LegacyMapSchema = z.object({
  format: z.literal(MAP_FORMAT),
  schema_version: z.literal(1),
  content_version: z.literal('1.1'),
  activities: z.array(ActivityMapEntrySchema),
  schedules: z.array(ScheduleMapEntrySchema),
}).strict();

function readLegacyMapFile(mapPath = DEFAULT_LEGACY_MAP_PATH) {
  const resolved = path.resolve(mapPath);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function parseLegacyMap(raw) {
  return LegacyMapSchema.parse(raw);
}

function loadLegacyMap(mapPath = DEFAULT_LEGACY_MAP_PATH) {
  const parsed = parseLegacyMap(readLegacyMapFile(mapPath));
  validateLegacyMapDeterminism(parsed);
  return parsed;
}

function validateLegacyMapDeterminism(map) {
  const seenActivityIds = new Map();
  const seenScheduleIds = new Map();

  for (const entry of map.activities) {
    const legacyId = entry.match?.legacy_id;
    if (!legacyId) continue;
    if (seenActivityIds.has(legacyId)) {
      throw new Error(`duplicate activity legacy_id in map: ${legacyId}`);
    }
    seenActivityIds.set(legacyId, entry);
  }

  for (const entry of map.schedules) {
    const legacyId = entry.match?.legacy_id;
    if (!legacyId) continue;
    if (seenScheduleIds.has(legacyId)) {
      throw new Error(`duplicate schedule legacy_id in map: ${legacyId}`);
    }
    seenScheduleIds.set(legacyId, entry);
  }
}

function sortMapEntriesForProcessing(entries) {
  return [
    ...entries.filter((entry) => entry.match?.legacy_id),
    ...entries.filter((entry) => !entry.match?.legacy_id),
  ];
}

function isPreserveClassification(classification) {
  return PRESERVE_CLASSIFICATIONS.has(classification);
}

function packageComponentMatches(rowValue, ruleValue) {
  if (ruleValue === undefined) return true;
  if (ruleValue === null) return rowValue == null;
  return rowValue === ruleValue;
}

function activityRowMatches(row, match) {
  if (match.legacy_id && row.id !== match.legacy_id) return false;
  if (match.legacy_name !== undefined && row.name !== match.legacy_name) return false;
  if (!packageComponentMatches(row.package_component, match.package_component)) return false;
  if (match.sort_order !== undefined && row.sort_order !== match.sort_order) return false;
  return true;
}

function scheduleRowMatches(row, match) {
  if (match.legacy_id && row.id !== match.legacy_id) return false;
  if (match.legacy_name !== undefined && row.name !== match.legacy_name) return false;
  return true;
}

function findMatchingRows(rows, match, matcher) {
  return rows.filter((row) => matcher(row, match));
}

module.exports = {
  DEFAULT_LEGACY_MAP_PATH,
  MAP_FORMAT,
  CLASSIFICATIONS,
  PRESERVE_CLASSIFICATIONS,
  LegacyMapSchema,
  ActivityMapEntrySchema,
  ScheduleMapEntrySchema,
  readLegacyMapFile,
  parseLegacyMap,
  loadLegacyMap,
  validateLegacyMapDeterminism,
  sortMapEntriesForProcessing,
  isPreserveClassification,
  activityRowMatches,
  scheduleRowMatches,
  findMatchingRows,
};
