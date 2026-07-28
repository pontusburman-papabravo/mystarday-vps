'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveActivityDisplayName,
  resolveRewardDisplayName,
  localizeActivityItems,
  localizeRewardItems,
  localizeStandardSchedules,
} = require('../src/lib/family-content-display');

describe('family-content-display', () => {
  it('returns Swedish names unchanged for sv-SE', async () => {
    assert.equal(await resolveActivityDisplayName('sv-SE', 'Sova ut'), 'Sova ut');
    assert.equal(await resolveRewardDisplayName('sv-SE', 'Extra skärmtid'), 'Extra skärmtid');
  });

  it('translates standard library activities for en-GB', async () => {
    assert.equal(await resolveActivityDisplayName('en-GB', 'Sova ut'), 'Sleep in');
    assert.equal(await resolveActivityDisplayName('en-GB', 'Frukost i lugn & ro'), 'Breakfast in peace');
    assert.equal(await resolveActivityDisplayName('en-GB', 'Utflykt / Park'), 'Day out / park');
    assert.equal(await resolveActivityDisplayName('en-GB', 'Familjeaktivitet'), 'Family activity');
    assert.equal(await resolveActivityDisplayName('en-GB', 'Borsta tänderna'), 'Brush teeth');
  });

  it('translates school variants for en-GB', async () => {
    assert.equal(await resolveActivityDisplayName('en-GB', 'Skola/Förskola'), 'Preschool/School');
    assert.equal(await resolveActivityDisplayName('en-GB', 'Skola'), 'School');
  });

  it('translates standard rewards for en-GB', async () => {
    assert.equal(await resolveRewardDisplayName('en-GB', 'Extra skärmtid'), 'Extra screen time');
    assert.equal(await resolveRewardDisplayName('en-GB', 'Välja middag'), 'Choose dinner');
  });

  it('translates customized reward names via static map when available', async () => {
    assert.equal(
      await resolveRewardDisplayName('en-GB', 'Extra skärmtid', { modified_by_family: true }),
      'Extra screen time'
    );
  });

  it('localizeActivityItems adds display_name without mutating stored name', async () => {
    const items = [{ id: '1', name: 'Sova ut', section: 'morgon' }];
    const out = await localizeActivityItems(items, 'en-GB');
    assert.equal(out[0].name, 'Sova ut');
    assert.equal(out[0].display_name, 'Sleep in');
  });

  it('localizeRewardItems adds display_name for en-GB', async () => {
    const items = [{ id: '1', name: 'Extra skärmtid', star_cost: 5, icon: '📱' }];
    const out = await localizeRewardItems(items, 'en-GB');
    assert.equal(out[0].display_name, 'Extra screen time');
  });

  it('maps registration default-content pairs by composite key', async () => {
    const row = {
      name: 'Vakna',
      icon: '🛏️',
      schema_type: 'forskola',
      category: 'Morning',
      sort_order: 0,
      star_value: 1,
    };
    assert.equal(await resolveActivityDisplayName('en-GB', 'Vakna', row), 'Wake up');
  });

  it('localizeStandardSchedules adds display_name for en-GB', async () => {
    const schedules = [{
      id: '1',
      name: 'Förskola vardag',
      description: 'Typisk dag med förskola: morgonrutin -> förskola -> eftermiddag -> kväll',
      items: [{ name: 'Sova ut', section: 'morgon' }],
    }];
    const out = await localizeStandardSchedules(schedules, 'en-GB');
    assert.equal(out[0].name, 'Förskola vardag');
    assert.equal(out[0].display_name, 'Nursery weekday');
    assert.match(out[0].display_description, /Typical nursery day/i);
    assert.equal(out[0].items[0].display_name, 'Sleep in');
  });
});
