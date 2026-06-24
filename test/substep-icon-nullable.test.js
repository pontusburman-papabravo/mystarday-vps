'use strict';

/**
 * Regression: engångsaktivitet + delsteg gav "Ogiltiga värden" vid spara.
 *
 * Sub-step-UI:t initierar nya delsteg som { name, icon: null } och postar det
 * till POST /api/activities/:id/sub-steps (CreateSubStepSchema → icon: emoji).
 * Den delade `emoji`-typen var `.optional()` (tillät undefined men INTE null),
 * så icon:null föll på validering. Fix: `emoji` är nu `.nullish()`.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CreateSubStepSchema, UpdateSubStepSchema } = require('../src/lib/schemas');

test('CreateSubStepSchema accepts icon: null (new sub-steps default to null icon)', () => {
  const result = CreateSubStepSchema.safeParse({ name: 'Borsta tänderna', icon: null });
  assert.ok(result.success, JSON.stringify(result.error?.errors));
});

test('CreateSubStepSchema accepts an omitted icon', () => {
  assert.ok(CreateSubStepSchema.safeParse({ name: 'Steg utan ikon' }).success);
});

test('CreateSubStepSchema accepts a valid emoji icon', () => {
  assert.ok(CreateSubStepSchema.safeParse({ name: 'Steg', icon: '🦷' }).success);
});

test('CreateSubStepSchema still rejects a missing name', () => {
  assert.ok(!CreateSubStepSchema.safeParse({ icon: '⭐' }).success);
});

test('CreateSubStepSchema still rejects an over-long icon', () => {
  assert.ok(!CreateSubStepSchema.safeParse({ name: 'x', icon: 'abcdefghijk' }).success);
});

test('UpdateSubStepSchema also accepts icon: null', () => {
  assert.ok(UpdateSubStepSchema.safeParse({ name: 'Steg', icon: null }).success);
});
