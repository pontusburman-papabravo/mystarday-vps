'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  isSystemSeededReward,
  localizeRewardItems,
  resolveRewardDisplayName,
} = require('../src/lib/family-content-display');
const { resolveChildUiLocale, resolveChildContentLocaleForFamily } = require('../src/lib/child-ui-locale');

describe('reward localization provenance (RC-1)', () => {
  it('1. system-seeded untouched reward → English display_name for en-GB', async () => {
    const items = [{
      id: '1',
      name: 'Extra skärmtid',
      icon: '📱',
      star_cost: 5,
      source_default_id: 'def-1',
      modified_by_family: false,
    }];
    const out = await localizeRewardItems(items, 'en-GB');
    assert.equal(out[0].name, 'Extra skärmtid');
    assert.equal(out[0].display_name, 'Extra screen time');
  });

  it('2. system-seeded but modified_by_family → stored name preserved', async () => {
    const out = await localizeRewardItems([{
      name: 'Min egen skärmtid',
      source_default_id: 'def-1',
      modified_by_family: true,
    }], 'en-GB');
    assert.equal(out[0].display_name, undefined);
    assert.equal(out[0].name, 'Min egen skärmtid');
  });

  it('3. user-created reward (no provenance) → stored name preserved', async () => {
    const out = await localizeRewardItems([{
      name: 'Custom trip',
      icon: '🚗',
      star_cost: 50,
      modified_by_family: false,
    }], 'en-GB');
    assert.equal(out[0].display_name, undefined);
  });

  it('4. user reward matching default name/icon/cost → still preserved without source_default_id', async () => {
    const out = await localizeRewardItems([{
      name: 'Extra skärmtid',
      icon: '📱',
      star_cost: 5,
      modified_by_family: false,
    }], 'en-GB');
    assert.equal(out[0].display_name, undefined);
    assert.equal(out[0].name, 'Extra skärmtid');
  });

  it('5. legacy row without safe provenance → preserved', async () => {
    assert.equal(isSystemSeededReward({ name: 'Middag', modified_by_family: false }), false);
    const display = await resolveRewardDisplayName('en-GB', 'Middag', {
      name: 'Middag',
      modified_by_family: false,
    });
    assert.equal(display, 'Middag');
  });

  it('6. en-GB + child experience on → child content locale en-GB', () => {
    assert.equal(resolveChildUiLocale('en-GB', true), 'en-GB');
  });

  it('7. en-GB + child experience off → child content locale sv-SE', () => {
    assert.equal(resolveChildUiLocale('en-GB', false), 'sv-SE');
  });

  it('8. sv-SE family → no reward display localization', async () => {
    const out = await localizeRewardItems([{
      name: 'Extra skärmtid',
      source_default_id: 'def-1',
      modified_by_family: false,
    }], 'sv-SE');
    assert.equal(out[0].display_name, undefined);
    assert.equal(out[0].name, 'Extra skärmtid');
  });

  it('9. list localization does not mutate stored name field', async () => {
    const item = {
      id: '9',
      name: 'Välja middag',
      source_default_id: 'def-2',
      modified_by_family: false,
    };
    const out = await localizeRewardItems([item], 'en-GB');
    assert.equal(item.name, 'Välja middag');
    assert.equal(out[0].name, 'Välja middag');
    assert.equal(out[0].display_name, 'Choose dinner');
  });

  it('10. resolveChildContentLocaleForFamily is exported async API', () => {
    assert.equal(typeof resolveChildContentLocaleForFamily, 'function');
  });

  it('rejects localizeAll in reward localization modules', () => { // pragma: allowlist secret
    const src = fs.readFileSync(path.join(__dirname, '../src/lib/family-content-display.js'), 'utf8');
    assert.doesNotMatch(src, /localizeAll/);
    const childLocale = fs.readFileSync(path.join(__dirname, '../src/lib/child-ui-locale.js'), 'utf8');
    assert.doesNotMatch(childLocale, /localizeAll/);
  });
});

describe('child profile reports capability gate', () => {
  it('child-profile.js gates reports link on reporting component', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/child-profile.js'), 'utf8');
    assert.match(js, /reportsLinkHtml/);
    assert.match(js, /components\.reporting\.has/);
    assert.match(js, /fetchPackageAccess/);
  });
});

describe('for-dig RC-1 i18n hooks', () => {
  it('scheduleLabel uses scheduleName not Swedish activateLabel prefix', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/for-dig.js'), 'utf8');
    assert.match(js, /goal\.scheduleName/);
    assert.doesNotMatch(js, /startsWith\('aktivera/);
  });

  it('for-dig activation strings use pt()', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/for-dig.js'), 'utf8');
    assert.match(js, /forDig\.activation\.activating/);
    assert.match(js, /forDig\.errors\.generic/);
  });
});
