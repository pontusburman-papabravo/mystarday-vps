'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { slugToTemplateGroup, parseStarterPlanAnswers } = require('../src/lib/starter-plan/slug-to-template-group');
const { selectStarterTemplate } = require('../src/lib/starter-plan/select-template');

describe('starter-plan slug mapping', () => {
  it('maps morning slug to morgon template_group', () => {
    assert.equal(slugToTemplateGroup('morning-short'), 'morgon');
    assert.equal(slugToTemplateGroup('preschool-day'), 'forskola');
  });

  it('parseStarterPlanAnswers maps UI values', () => {
    const input = parseStarterPlanAnswers({
      age_band: '3-5',
      routine_type_ui: 'kvall',
      support_ui: 'ja',
      length_ui: 'kort',
    });
    assert.equal(input.routineType, 'evening');
    assert.equal(input.supportLevel, 'high');
    assert.equal(input.desiredLength, 'short');
    const plan = selectStarterTemplate(input);
    assert.equal(plan.scheduleName, 'Kvällsrutin');
  });
});
