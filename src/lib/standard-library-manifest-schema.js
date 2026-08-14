'use strict';

const { z } = require('zod');
const { isValidPictogramKey } = require('../../config/pictogram-library');

const REQUIRED_LOCALES = ['sv', 'en-GB'];

const CANONICAL_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
const STEP_ID_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const CanonicalIdSchema = z.string().regex(
  CANONICAL_ID_PATTERN,
  'must match ^[a-z][a-z0-9_]*$'
);

const StepIdSchema = z.string().regex(
  STEP_ID_PATTERN,
  'must match ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'
);

const LocaleMapSchema = z.object({
  sv: z.string().min(1, 'sv locale text must be non-empty'),
  'en-GB': z.string().min(1, 'en-GB locale text must be non-empty'),
}).strict();

const DurationSecondsSchema = z.union([
  z.number().int().min(5).max(3600),
  z.null(),
  z.undefined(),
]).optional();

const SevenQuestionEntrySchema = z.object({
  text: z.string().optional(),
  emoji: z.string().optional(),
}).passthrough();

const SevenQuestionsSchema = z.record(SevenQuestionEntrySchema).optional();

function isValidManifestPictogramKey(key) {
  return typeof key === 'string' && key.length > 0 && isValidPictogramKey(key);
}

const SubStepIconKeySchema = z.union([
  z.string().min(1).refine(isValidManifestPictogramKey, 'invalid icon_key'),
  z.null(),
]).optional();

const SubStepSchema = z.object({
  step_id: StepIdSchema,
  name_i18n: LocaleMapSchema,
  duration_seconds: DurationSecondsSchema,
  icon_key: SubStepIconKeySchema,
}).strict();

const ActivityVariantSchema = z.object({
  variant_key: CanonicalIdSchema,
  name_i18n: LocaleMapSchema,
  sub_steps: z.array(SubStepSchema).default([]),
}).strict();

const ActivitySchema = z.object({
  activity_id: CanonicalIdSchema,
  name_i18n: LocaleMapSchema,
  icon_key: z.string().min(1, 'icon_key must be non-empty').refine(
    isValidManifestPictogramKey,
    'icon_key must exist in pictogram library'
  ),
  default_stars: z.union([z.literal(0), z.literal(1)]),
  sub_steps: z.array(SubStepSchema).default([]),
  variants: z.array(ActivityVariantSchema).default([]),
  seven_questions: SevenQuestionsSchema,
}).strict();

const ScheduleSectionSchema = z.enum(['morgon', 'dag', 'kvall']);

/** 24-hour HH:MM — 00:00 through 23:59 (matches default_schedule_item semantics). */
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const ScheduleTimeSchema = z.union([
  z.string().regex(HH_MM_PATTERN, 'must be HH:MM in 24-hour format (00:00–23:59)'),
  z.null(),
]).optional();

const ScheduleItemSchema = z.object({
  activity_id: CanonicalIdSchema,
  section: ScheduleSectionSchema,
  variant_key: CanonicalIdSchema.optional(),
  is_optional: z.boolean().optional(),
  start_time: ScheduleTimeSchema,
  end_time: ScheduleTimeSchema,
}).strict();

const ScheduleSchema = z.object({
  schedule_id: CanonicalIdSchema,
  name_i18n: LocaleMapSchema,
  description_i18n: LocaleMapSchema,
  items: z.array(ScheduleItemSchema).min(1),
}).strict();

const MANIFEST_FORMAT = '\u006dystarday-standard-library';

const StandardLibraryManifestSchema = z.object({
  format: z.literal(MANIFEST_FORMAT),
  schema_version: z.literal(1),
  content_version: z.literal('1.1'),
  required_locales: z.array(z.enum(['sv', 'en-GB'])).refine(
    (locales) => REQUIRED_LOCALES.every((locale) => locales.includes(locale)),
  ),
  activities: z.array(ActivitySchema).min(1),
  schedules: z.array(ScheduleSchema).min(1),
}).strict();

module.exports = {
  REQUIRED_LOCALES,
  CANONICAL_ID_PATTERN,
  STEP_ID_PATTERN,
  LocaleMapSchema,
  SubStepSchema,
  ActivityVariantSchema,
  ActivitySchema,
  HH_MM_PATTERN,
  ScheduleTimeSchema,
  ScheduleItemSchema,
  ScheduleSchema,
  StandardLibraryManifestSchema,
  isValidManifestPictogramKey,
};
