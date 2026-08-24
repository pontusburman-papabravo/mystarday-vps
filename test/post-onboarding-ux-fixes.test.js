'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('post-onboarding UX fixes — shared device parent PIN gate', () => {
  const GATE = read('public/js/parent-pin-handoff-gate.js');
  const ONBOARDING = read('public/js/onboarding.js');
  const ACTIVATION = read('public/js/onboarding-activation.js');
  const DEVICE_PROMPT = read('public/js/device-setup-prompt.js');
  const THIS_DEVICE = read('public/js/settings-this-device.js');

  it('1–2: gate module blocks shared handoff until PIN and uses canonical set-pin API', () => {
    assert.match(GATE, /ensureBeforeChildHandoff/);
    assert.match(GATE, /\/api\/family\/set-pin/);
    assert.match(GATE, /\/api\/family\/parent-pin-status/);
    assert.match(GATE, /shared_with_children/);
    assert.match(GATE, /child_device/);
  });

  it('onboarding wires gate before child handoff paths', () => {
    assert.match(ONBOARDING, /ParentPinHandoffGate\.ensureBeforeChildHandoff/);
    assert.match(ONBOARDING, /redirectToChildHandoffAfterComplete/);
    assert.match(ONBOARDING, /saveOnboardingParentPinIfProvided\(\{ requirePin: true \}\)/);
    assert.match(ONBOARDING, /prepareOnboardingHandoffStep/);
  });

  it('3: existing PIN skips redundant setup via fetchHasParentPin cache path', () => {
    assert.match(GATE, /fetchHasParentPin/);
    assert.match(GATE, /if \(await fetchHasParentPin\(\)\)/);
  });

  it('4: personal/adult-only device does not force PIN', () => {
    const fn = GATE.slice(GATE.indexOf('function usageRequiresParentPin'), GATE.indexOf('function invalidateCache'));
    assert.match(fn, /shared_with_children/);
    assert.match(fn, /child_device/);
    assert.equal(fn.includes('parent_phone'), false);
  });

  it('5: step5 handoff delegates to gate (existing PIN flow unchanged after setup)', () => {
    assert.match(ACTIVATION, /async function startChildHandoff/);
    assert.match(ACTIVATION, /ParentPinHandoffGate\.ensureBeforeChildHandoff/);
    assert.match(ACTIVATION, /openChildLogin/);
    assert.doesNotMatch(ACTIVATION, /Auth\.login/);
  });

  it('device setup + settings this-device gate shared enrollments', () => {
    assert.match(THIS_DEVICE, /ParentPinHandoffGate\.ensureBeforeChildHandoff/);
    assert.match(DEVICE_PROMPT, /ParentPinHandoffGate\.ensureBeforeChildHandoff/);
  });
});

describe('post-onboarding UX fixes — subscription terminology & icon', () => {
  const HUBS = read('public/js/parent-magic-page-hubs.js');
  const SETTINGS_SV = JSON.parse(read('config/i18n/settings-sv-SE.json'));
  const SETTINGS_EN = JSON.parse(read('config/i18n/settings-en-GB.json'));
  const SETTINGS_HTML = read('public/settings.html');

  it('6–7: subscription card titles sv-SE and en-GB', () => {
    assert.equal(SETTINGS_SV.groups.premium.title, 'Prenumeration');
    assert.equal(SETTINGS_SV.groups.premium.sub, 'Premium, köp och betalning');
    assert.equal(SETTINGS_EN.groups.premium.title, 'Subscription');
    assert.equal(SETTINGS_EN.groups.premium.sub, 'Premium, purchases and payments');
    assert.match(HUBS, /settings\.groups\.premium\.title/);
    assert.match(HUBS, /Prenumeration/);
  });

  it('8: trofe icon resolves to img src when IconSystem missing', () => {
    const pageIconBlock = HUBS.slice(HUBS.indexOf('function pageIcon'), HUBS.indexOf('function renderGenericHero'));
    assert.match(pageIconBlock, /stjarnadag-icons-v4\/hub\/'/);
    assert.match(pageIconBlock, /\.svg/);
    assert.match(SETTINGS_HTML, /icon-system\.js/);
    assert.ok(SETTINGS_HTML.indexOf('icon-system.js') < SETTINGS_HTML.indexOf('parent-magic-page-hubs.js'));
  });

  it('8b: IconSystem resolves trofe hub asset to valid img markup', () => {
    const sandbox = { window: {}, console };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    vm.runInNewContext(read('public/js/icon-system.js'), sandbox, { filename: 'icon-system.js' });
    assert.equal(sandbox.IconSystem.has('trofe'), true);
    const html = sandbox.IconSystem.hub('trofe');
    assert.match(html, /<img[^>]+src="\/img\/stjarnadag-icons-v4\/hub\/trofe\.svg(\?v=\d+)?"/);
    assert.match(html, /width="44"/);
  });
});

describe('post-onboarding UX fixes — copy', () => {
  const SUB = read('public/js/settings-subscription.js');
  const CHILD_SV = JSON.parse(read('config/i18n/child-sv-SE.json'));
  const CHILD_EN = JSON.parse(read('config/i18n/child-en-GB.json'));
  const FIRST_STAR_JS = read('public/js/child-first-star-mode.js');
  const FIRST_STAR_LIB = read('src/lib/first-star-mode.js');

  it('9: grandfathered sv-SE copy exact', () => {
    assert.match(SUB, /Premium ingår permanent/);
    assert.match(SUB, /Din familj har full tillgång utan kostnad\./);
    assert.match(SUB, /Premium included permanently/);
    assert.match(SUB, /Your family has full access at no cost\./);
  });

  it('10–11: First Star copy sv-SE exact and en-GB natural', () => {
    assert.equal(CHILD_SV.firstStar.title, 'Redo för din första stjärna? ⭐');
    assert.equal(CHILD_SV.firstStar.hint, 'Bocka av den här och se vad som händer!');
    assert.equal(CHILD_EN.firstStar.title, 'Ready for your first star? ⭐');
    assert.equal(CHILD_EN.firstStar.hint, 'Tick this one off and see what happens!');
  });

  it('12: First Star behavior logic unchanged', () => {
    assert.match(FIRST_STAR_JS, /first_star_mode/);
    assert.match(FIRST_STAR_LIB, /first_star_mode|firstStarMode/);
    assert.doesNotMatch(FIRST_STAR_JS, /filter.*activities|slice\(0,\s*1\)/);
  });
});

describe('post-onboarding UX fixes — settings premium regression', () => {
  const PREMIUM_TEST = read('test/settings-premium-magic.test.js');

  it('13: settings-premium-magic tests updated for new grandfathered copy', () => {
    assert.match(PREMIUM_TEST, /Premium ingår permanent/);
    assert.doesNotMatch(PREMIUM_TEST, /Premium permanent/);
  });
});
