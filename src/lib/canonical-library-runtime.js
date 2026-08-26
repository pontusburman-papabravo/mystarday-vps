'use strict';

/**
 * PR4 runtime adapters — map legacy onboarding/seed entry points to canonical copy engine.
 * Identity: canonical_id only for Standard Library-derived family snapshots.
 */

const {
  CanonicalCopyError,
  CANONICAL_VARIANT_REQUIRED,
  CANONICAL_VARIANT_INVALID,
  CANONICAL_SOURCE_INVALID,
  CANONICAL_DUPLICATE_IDENTITY,
  CANONICAL_SCHEDULE_NOT_FOUND,
  copyCanonicalScheduleToFamily,
  copyCanonicalDefaultActivityToFamily,
  copyCanonicalActivityFromDefaultId,
  prepareCanonicalScheduleFamilyActivities,
  familyHasCanonicalActivity,
  pickLocaleString,
} = require('./canonical-library-copy');

/** Onboarding template_group → frozen v1.1 schedule canonical_id */
const TEMPLATE_GROUP_TO_CANONICAL_SCHEDULE = Object.freeze({
  forskola: 'preschool_weekday',
  skola: 'school_weekday',
  helg: 'weekend',
  morgon: 'morning_routine',
  kvall: 'evening_routine',
  dag: 'preschool_weekday',
});

/**
 * Compatibility INPUT adapter only — maps legacy external labels to frozen canonical_id.
 * Never used in SQL; DB resolution after mapping uses canonical_id / defaultScheduleId only.
 * @see config/standard-library/v1.1-legacy-map.json schedules section
 */
const LEGACY_SCHEDULE_NAME_TO_CANONICAL = Object.freeze({
  'Förskola vardag': 'preschool_weekday',
  'Skola vardag': 'school_weekday',
  Helg: 'weekend',
  Morgonrutin: 'morning_routine',
  'Kort morgon': 'morning_routine',
  Kvällsrutin: 'evening_routine',
  Lov: 'school_break',
  Sommarlov: 'summer_break',
  Jullov: 'christmas_break',
});

/**
 * Non-interactive flows that materialize school_weekday without variant UI.
 * Product default: return-home path (legacy Skola vardag auto-seed intent).
 * Interactive routes must pass explicit variants in request body.
 */
const NON_INTERACTIVE_AFTER_SCHOOL_VARIANT = 'after_school_home';

function resolveCanonicalScheduleId({ templateGroup, legacyScheduleName, canonicalScheduleId }) {
  if (canonicalScheduleId) return canonicalScheduleId;
  if (templateGroup && TEMPLATE_GROUP_TO_CANONICAL_SCHEDULE[templateGroup]) {
    return TEMPLATE_GROUP_TO_CANONICAL_SCHEDULE[templateGroup];
  }
  if (legacyScheduleName && LEGACY_SCHEDULE_NAME_TO_CANONICAL[legacyScheduleName]) {
    return LEGACY_SCHEDULE_NAME_TO_CANONICAL[legacyScheduleName];
  }
  return null;
}

function resolveVariantsForScheduleCopy({ canonicalScheduleId, callerVariants, allowNonInteractiveDefault }) {
  const variants = callerVariants && typeof callerVariants === 'object' ? { ...callerVariants } : {};

  if (canonicalScheduleId !== 'school_weekday') {
    return Object.keys(variants).length > 0 ? variants : null;
  }

  if (variants.after_school) {
    return variants;
  }

  if (allowNonInteractiveDefault) {
    return { after_school: NON_INTERACTIVE_AFTER_SCHOOL_VARIANT };
  }

  return null;
}

/**
 * Localizes the raw variant_options (name_i18n per key) attached to a variant error
 * into {key, label} pairs the client can render directly without owning its own
 * copy of the Standard Library variant names.
 */
function localizeVariantOptions(details, locale) {
  if (!Array.isArray(details?.variant_options)) return details;
  return {
    ...details,
    variant_options: details.variant_options.map((v) => ({
      key: v.variant_key,
      label: pickLocaleString(v.name_i18n, locale, v.variant_key),
    })),
  };
}

function mapCanonicalCopyErrorToHttp(err, locale = 'sv-SE') {
  if (!(err instanceof CanonicalCopyError)) return null;
  switch (err.code) {
    case CANONICAL_VARIANT_REQUIRED:
      return { status: 400, body: { error: 'Variant krävs för efter skolan.', code: err.code, details: localizeVariantOptions(err.details, locale) } };
    case CANONICAL_VARIANT_INVALID:
      return { status: 400, body: { error: 'Ogiltig variant för efter skolan.', code: err.code, details: localizeVariantOptions(err.details, locale) } };
    case CANONICAL_DUPLICATE_IDENTITY:
      return { status: 409, body: { error: 'Standardbiblioteket har duplicerad identitet.', code: err.code, details: err.details } };
    case CANONICAL_SCHEDULE_NOT_FOUND:
    case CANONICAL_SOURCE_INVALID:
      return { status: 400, body: { error: 'Standardinnehållet hittades inte.', code: err.code, details: err.details } };
    default:
      return { status: 400, body: { error: err.message, code: err.code, details: err.details } };
  }
}

async function copyStandardScheduleToChild(client, options) {
  const {
    familyId,
    childId,
    days,
    overwrite = false,
    optionalSelections = null,
    locale = 'sv-SE',
    templateGroup = null,
    legacyScheduleName = null,
    canonicalScheduleId = null,
    defaultScheduleId = null,
    variants: callerVariants = null,
    allowNonInteractiveAfterSchoolDefault = false,
    externalTransaction = false,
  } = options;

  const resolvedCanonicalId = resolveCanonicalScheduleId({
    templateGroup,
    legacyScheduleName,
    canonicalScheduleId,
  });

  const variants = resolveVariantsForScheduleCopy({
    canonicalScheduleId: resolvedCanonicalId,
    callerVariants,
    allowNonInteractiveDefault: allowNonInteractiveAfterSchoolDefault,
  });

  if (resolvedCanonicalId === 'school_weekday' && !variants?.after_school) {
    throw new CanonicalCopyError(CANONICAL_VARIANT_REQUIRED, {
      activity_id: 'after_school',
      allowed_variants: ['after_school_club', 'after_school_home'],
    });
  }

  return copyCanonicalScheduleToFamily(client, {
    familyId,
    childId,
    days,
    overwrite,
    optionalSelections,
    variants,
    locale,
    defaultScheduleId: resolvedCanonicalId ? null : defaultScheduleId,
    canonicalScheduleId: resolvedCanonicalId || null,
    externalTransaction,
  });
}

async function materializeStandardScheduleActivities(client, options) {
  const {
    familyId,
    locale = 'sv-SE',
    defaultScheduleId = null,
    canonicalScheduleId = null,
    legacyScheduleName = null,
    templateGroup = null,
    optionalSelections = null,
    callerVariants = null,
    allowNonInteractiveAfterSchoolDefault = false,
  } = options;

  const resolvedCanonicalId = resolveCanonicalScheduleId({
    templateGroup,
    legacyScheduleName,
    canonicalScheduleId,
  });

  const variants = resolveVariantsForScheduleCopy({
    canonicalScheduleId: resolvedCanonicalId,
    callerVariants,
    allowNonInteractiveDefault: allowNonInteractiveAfterSchoolDefault,
  });

  if (resolvedCanonicalId === 'school_weekday' && !variants?.after_school) {
    throw new CanonicalCopyError(CANONICAL_VARIANT_REQUIRED, {
      activity_id: 'after_school',
      allowed_variants: ['after_school_club', 'after_school_home'],
    });
  }

  return prepareCanonicalScheduleFamilyActivities(client, {
    familyId,
    defaultScheduleId: resolvedCanonicalId ? null : defaultScheduleId,
    canonicalScheduleId: resolvedCanonicalId || null,
    optionalSelections,
    variants,
    locale,
  });
}

async function copyStandardActivityToFamily(client, options) {
  const {
    familyId,
    defaultActivityId = null,
    canonicalActivityId = null,
    locale = 'sv-SE',
    variants = null,
    sortOrder = 0,
    externalTransaction = false,
  } = options;

  if (canonicalActivityId) {
    return copyCanonicalDefaultActivityToFamily(client, {
      familyId,
      canonicalActivityId,
      locale,
      variants,
      sortOrder,
      externalTransaction,
    });
  }

  return copyCanonicalActivityFromDefaultId(client, {
    familyId,
    defaultActivityId,
    locale,
    variants,
    sortOrder,
    externalTransaction,
  });
}

module.exports = {
  TEMPLATE_GROUP_TO_CANONICAL_SCHEDULE,
  LEGACY_SCHEDULE_NAME_TO_CANONICAL,
  NON_INTERACTIVE_AFTER_SCHOOL_VARIANT,
  CanonicalCopyError,
  CANONICAL_VARIANT_REQUIRED,
  CANONICAL_VARIANT_INVALID,
  CANONICAL_SOURCE_INVALID,
  CANONICAL_DUPLICATE_IDENTITY,
  CANONICAL_SCHEDULE_NOT_FOUND,
  resolveCanonicalScheduleId,
  resolveVariantsForScheduleCopy,
  mapCanonicalCopyErrorToHttp,
  copyStandardScheduleToChild,
  materializeStandardScheduleActivities,
  copyStandardActivityToFamily,
  familyHasCanonicalActivity,
  copyCanonicalScheduleToFamily,
  copyCanonicalDefaultActivityToFamily,
};
