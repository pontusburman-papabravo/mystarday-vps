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
    assert.equal(await resolveRewardDisplayName('en-GB', 'Restaurangbesök'), 'Restaurant visit');
    assert.equal(await resolveRewardDisplayName('en-GB', 'Pyssel-projekt tillsammans'), 'Craft project together');
    assert.equal(await resolveRewardDisplayName('en-GB', 'Välja film på filmkväll'), 'Choose a film on movie night');
    assert.equal(await resolveRewardDisplayName('en-GB', 'Frukost på sängen'), 'Breakfast in bed');
    assert.equal(await resolveRewardDisplayName('en-GB', 'Extra saga vid läggdags'), 'Extra story at bedtime');
  });

  it('translates customized reward names via static map when available', async () => {
    assert.equal(
      await resolveRewardDisplayName('en-GB', 'Extra skärmtid', {
        modified_by_family: false,
        source_default_id: 'seed-id',
      }),
      'Extra screen time'
    );
    assert.equal(
      await resolveRewardDisplayName('en-GB', 'Extra skärmtid', { modified_by_family: true }),
      'Extra skärmtid'
    );
  });

  it('does not translate family-customized activities (source=user after edit)', async () => {
    assert.equal(
      await resolveActivityDisplayName('en-GB', 'Förskola vardag', { source: 'user', icon: '🏫' }),
      'Förskola vardag'
    );
  });

  it('does not translate user-created rewards without system origin', async () => {
    const items = [{ id: '1', name: 'Middag', star_cost: 5, icon: '🍽️', modified_by_family: false }];
    const out = await localizeRewardItems(items, 'en-GB');
    assert.equal(out[0].name, 'Middag');
    assert.equal(out[0].display_name, undefined);
  });

  it('does not translate user-created activities (source=user)', async () => {
    const items = [{ id: '1', name: 'Middag', source: 'user', icon: '🍽️', star_value: 1 }];
    const out = await localizeActivityItems(items, 'en-GB');
    assert.equal(out[0].name, 'Middag');
    assert.equal(out[0].display_name, undefined);
  });

  it('translates standard-library scope regardless of source flags', async () => {
    const { CONTENT_SCOPE } = require('../src/lib/family-content-display');
    const items = [{ id: '1', name: 'Välja middag', source: 'user', icon: '🍕', star_cost: 10 }];
    const out = await localizeActivityItems(items, 'en-GB', 'sv-SE', {
      contentScope: CONTENT_SCOPE.STANDARD_LIBRARY,
    });
    assert.equal(out[0].display_name, 'Choose dinner');
  });

  it('localizeActivityItems adds display_name without mutating stored name', async () => {
    const items = [{ id: '1', name: 'Sova ut', section: 'morgon' }];
    const out = await localizeActivityItems(items, 'en-GB');
    assert.equal(out[0].name, 'Sova ut');
    assert.equal(out[0].display_name, 'Sleep in');
  });

  it('localizeRewardItems adds display_name for en-GB system rewards', async () => {
    const items = [{
      id: '1',
      name: 'Extra skärmtid',
      star_cost: 5,
      icon: '📱',
      source_default_id: 'default-1',
      modified_by_family: false,
    }];
    const out = await localizeRewardItems(items, 'en-GB');
    assert.equal(out[0].display_name, 'Extra screen time');
  });

  it('localizeRewardItems localizes goal rows with reward_name only', async () => {
    const items = [{
      reward_id: '1',
      reward_name: 'Restaurangbesök',
      reward_icon: '🍕',
      star_cost: 350,
      source_default_id: 'default-restaurant',
      modified_by_family: false,
    }];
    const out = await localizeRewardItems(items, 'en-GB');
    assert.equal(out[0].reward_name, 'Restaurangbesök');
    assert.equal(out[0].display_name, 'Restaurant visit');
    assert.equal(out[0].reward_name_display, 'Restaurant visit');
  });

  it('localizeRewardItems localizes pending goal change to_reward_name', async () => {
    const items = [{
      to_reward_name: 'Pyssel-projekt tillsammans',
      to_reward_icon: '🎨',
      to_star_cost: 100,
      source_default_id: 'default-craft',
      modified_by_family: false,
    }];
    const out = await localizeRewardItems(items, 'en-GB');
    assert.equal(out[0].to_reward_name, 'Pyssel-projekt tillsammans');
    assert.equal(out[0].to_reward_name_display, 'Craft project together');
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
