'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveActivityDisplayName,
  resolveRewardDisplayName,
  localizeActivityItems,
  localizeRewardItems,
} = require('../src/lib/family-content-display');

describe('family-content-display', () => {
  it('returns Swedish names unchanged for sv-SE', () => {
    assert.equal(resolveActivityDisplayName('sv-SE', 'Sova ut'), 'Sova ut');
    assert.equal(resolveRewardDisplayName('sv-SE', 'Extra skärmtid'), 'Extra skärmtid');
  });

  it('translates standard library activities for en-GB', () => {
    assert.equal(resolveActivityDisplayName('en-GB', 'Sova ut'), 'Sleep in');
    assert.equal(resolveActivityDisplayName('en-GB', 'Frukost i lugn & ro'), 'Breakfast in peace');
    assert.equal(resolveActivityDisplayName('en-GB', 'Utflykt / Park'), 'Day out / park');
    assert.equal(resolveActivityDisplayName('en-GB', 'Familjeaktivitet'), 'Family activity');
    assert.equal(resolveActivityDisplayName('en-GB', 'Borsta tänderna'), 'Brush teeth');
  });

  it('translates school variants for en-GB', () => {
    assert.equal(resolveActivityDisplayName('en-GB', 'Skola/Förskola'), 'Preschool/School');
    assert.equal(resolveActivityDisplayName('en-GB', 'Skola'), 'School');
  });

  it('translates standard rewards for en-GB', () => {
    assert.equal(resolveRewardDisplayName('en-GB', 'Extra skärmtid'), 'Extra screen time');
    assert.equal(resolveRewardDisplayName('en-GB', 'Välja middag'), 'Choose dinner');
  });

  it('skips customized rewards', () => {
    assert.equal(
      resolveRewardDisplayName('en-GB', 'Extra skärmtid', { modified_by_family: true }),
      'Extra skärmtid'
    );
  });

  it('localizeActivityItems adds display_name without mutating stored name', () => {
    const items = [{ id: '1', name: 'Sova ut', section: 'morgon' }];
    const out = localizeActivityItems(items, 'en-GB');
    assert.equal(out[0].name, 'Sova ut');
    assert.equal(out[0].display_name, 'Sleep in');
  });

  it('localizeRewardItems adds display_name for en-GB', () => {
    const items = [{ id: '1', name: 'Extra skärmtid', star_cost: 5, icon: '📱' }];
    const out = localizeRewardItems(items, 'en-GB');
    assert.equal(out[0].display_name, 'Extra screen time');
  });

  it('maps registration default-content pairs by composite key', () => {
    const row = {
      name: 'Vakna',
      icon: '🛏️',
      schema_type: 'forskola',
      category: 'Morning',
      sort_order: 0,
      star_value: 1,
    };
    assert.equal(resolveActivityDisplayName('en-GB', 'Vakna', row), 'Wake up');
  });
});
