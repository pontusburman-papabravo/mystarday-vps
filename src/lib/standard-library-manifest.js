'use strict';

const fs = require('fs');
const path = require('path');
const { ZodError } = require('zod');
const {
  StandardLibraryManifestSchema,
  isValidManifestPictogramKey,
} = require('./standard-library-manifest-schema');

const DEFAULT_MANIFEST_PATH = path.join(
  __dirname,
  '../../config/standard-library/v1.1.json'
);

class StandardLibraryManifestError extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'StandardLibraryManifestError';
    this.errors = errors;
  }
}

function formatZodError(error) {
  if (!(error instanceof ZodError)) {
    return [error.message || String(error)];
  }
  return error.issues.map((issue) => {
    const pathLabel = issue.path.length ? issue.path.join('.') : '(root)';
    return `${pathLabel}: ${issue.message}`;
  });
}

function activityStepIdPrefix(activityId, stepId) {
  return stepId.startsWith(`${activityId}.`) && stepId.split('.').length === 2;
}

function variantStepIdPrefix(activityId, variantKey, stepId) {
  const prefix = `${activityId}.${variantKey}.`;
  return stepId.startsWith(prefix) && stepId.split('.').length >= 3;
}

function collectActivityStepIds(activity, errors, activityPath) {
  const stepIds = [];

  for (const [index, step] of activity.sub_steps.entries()) {
    const stepPath = `${activityPath}.sub_steps[${index}]`;
    if (!activityStepIdPrefix(activity.activity_id, step.step_id)) {
      errors.push(
        `${stepPath}.step_id: must start with activity_id "${activity.activity_id}" as "${activity.activity_id}.<step>"`
      );
    }
    stepIds.push(step.step_id);
  }

  const variantKeys = new Set();
  for (const [index, variant] of (activity.variants || []).entries()) {
    const variantPath = `${activityPath}.variants[${index}]`;
    if (variantKeys.has(variant.variant_key)) {
      errors.push(`${variantPath}.variant_key: duplicate variant_key "${variant.variant_key}"`);
    }
    variantKeys.add(variant.variant_key);

    for (const [stepIndex, step] of variant.sub_steps.entries()) {
      const stepPath = `${variantPath}.sub_steps[${stepIndex}]`;
      if (!variantStepIdPrefix(activity.activity_id, variant.variant_key, step.step_id)) {
        errors.push(
          `${stepPath}.step_id: must start with "${activity.activity_id}.${variant.variant_key}."`
        );
      }
      stepIds.push(step.step_id);
    }
  }

  return stepIds;
}

function validateBrushTeethTimer(activity, errors) {
  if (activity.activity_id !== 'brush_teeth') return;
  const brushStep = activity.sub_steps.find((step) => step.step_id === 'brush_teeth.brush');
  if (!brushStep) return;
  if (brushStep.duration_seconds !== 120) {
    errors.push(
      'activities[brush_teeth].sub_steps[brush_teeth.brush].duration_seconds: must be 120 when step exists'
    );
  }
}

function validateWashHandsTimer(activity, errors) {
  if (activity.activity_id !== 'wash_hands') return;
  const washStep = activity.sub_steps.find((step) => step.step_id === 'wash_hands.wash');
  if (!washStep) return;
  if (washStep.duration_seconds !== 20) {
    errors.push(
      'activities[wash_hands].sub_steps[wash_hands.wash].duration_seconds: must be 20 when step exists'
    );
  }
}

function validateManifestSemantics(manifest) {
  const errors = [];
  const activityIds = new Set();
  const scheduleIds = new Set();
  const globalStepIds = new Set();
  const activitiesById = new Map();

  for (const [index, activity] of manifest.activities.entries()) {
    const activityPath = `activities[${index}]`;

    if (activityIds.has(activity.activity_id)) {
      errors.push(`${activityPath}.activity_id: duplicate activity_id "${activity.activity_id}"`);
    }
    activityIds.add(activity.activity_id);
    activitiesById.set(activity.activity_id, activity);

    if (!isValidManifestPictogramKey(activity.icon_key)) {
      errors.push(`${activityPath}.icon_key: must be a non-empty pictogram library key`);
    }

    const stepIds = collectActivityStepIds(activity, errors, activityPath);
    for (const stepId of stepIds) {
      if (globalStepIds.has(stepId)) {
        errors.push(`step_id: duplicate global step_id "${stepId}"`);
      }
      globalStepIds.add(stepId);
    }

    validateBrushTeethTimer(activity, errors);
    validateWashHandsTimer(activity, errors);
  }

  for (const [index, schedule] of manifest.schedules.entries()) {
    const schedulePath = `schedules[${index}]`;

    if (scheduleIds.has(schedule.schedule_id)) {
      errors.push(`${schedulePath}.schedule_id: duplicate schedule_id "${schedule.schedule_id}"`);
    }
    scheduleIds.add(schedule.schedule_id);

    for (const [itemIndex, item] of schedule.items.entries()) {
      const itemPath = `${schedulePath}.items[${itemIndex}]`;
      const activity = activitiesById.get(item.activity_id);
      if (!activity) {
        errors.push(`${itemPath}.activity_id: unknown activity_id "${item.activity_id}"`);
        continue;
      }

      if (!item.variant_key) continue;

      const variant = (activity.variants || []).find((v) => v.variant_key === item.variant_key);
      if (!variant) {
        errors.push(
          `${itemPath}.variant_key: unknown variant_key "${item.variant_key}" for activity "${item.activity_id}"`
        );
      }
    }
  }

  return errors;
}

function parseStandardLibraryManifest(raw) {
  return StandardLibraryManifestSchema.parse(raw);
}

function validateStandardLibraryManifest(raw) {
  const errors = [];

  let manifest;
  try {
    manifest = parseStandardLibraryManifest(raw);
  } catch (err) {
    return {
      ok: false,
      errors: formatZodError(err),
      manifest: null,
    };
  }

  errors.push(...validateManifestSemantics(manifest));

  return {
    ok: errors.length === 0,
    errors,
    manifest,
  };
}

function readManifestFile(manifestPath = DEFAULT_MANIFEST_PATH) {
  const resolved = path.resolve(manifestPath);
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return raw;
}

function loadAndValidateStandardLibraryManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  const raw = readManifestFile(manifestPath);
  const result = validateStandardLibraryManifest(raw);
  if (!result.ok) {
    throw new StandardLibraryManifestError(result.errors);
  }
  return result.manifest;
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  StandardLibraryManifestError,
  formatZodError,
  validateManifestSemantics,
  parseStandardLibraryManifest,
  validateStandardLibraryManifest,
  readManifestFile,
  loadAndValidateStandardLibraryManifest,
};
