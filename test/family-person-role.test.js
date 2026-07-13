'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  childRoleLabelForParent,
  childRoleLabelForSibling,
  childRoleLabelForPedagog,
  kinshipLabelFromName,
} = require('../src/lib/family-person-role');

describe('family-person-role — child-facing labels', () => {
  it('maps family_role to Swedish labels', () => {
    assert.equal(childRoleLabelForParent({ name: 'Pontus', family_role: 'pappa' }), 'Pappa');
    assert.equal(childRoleLabelForParent({ name: 'Anna', family_role: 'mamma' }), 'Mamma');
    assert.equal(childRoleLabelForParent({ name: 'Eva', family_role: 'bonusförälder' }), 'Bonusförälder');
    assert.equal(childRoleLabelForParent({ name: 'Kalle', family_role: 'annan' }), 'Familj');
  });

  it('infers kinship from display name when role is annan or missing', () => {
    assert.equal(kinshipLabelFromName('Mormor'), 'Mormor');
    assert.equal(kinshipLabelFromName('morfar'), 'Morfar');
    assert.equal(childRoleLabelForParent({ name: 'Mormor', family_role: 'annan' }), 'Mormor');
    assert.equal(childRoleLabelForParent({ name: 'Pappa', family_role: null }), 'Pappa');
  });

  it('falls back to warm helper copy for unknown parents', () => {
    assert.equal(childRoleLabelForParent({ name: 'Pontus', family_role: null }), 'Hjälper mig hemma');
  });

  it('labels siblings and pedagog consistently', () => {
    assert.equal(childRoleLabelForSibling(), 'Syskon');
    assert.equal(childRoleLabelForPedagog(), 'Hjälper mig i skolan');
  });
});
