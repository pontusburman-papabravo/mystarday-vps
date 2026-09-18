'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ZodError } = require('zod');
const {
  parseCampaignBrief,
  slugifyName,
  withCampaignUtm,
  findCopyViolations,
  publishApprovedCampaign,
  firstImageHash,
  getPublicMetaAdsConfig,
  sekToOre,
} = require('../src/lib/meta-ads');

function withEnv(map, fn) {
  const prev = {};
  for (const key of Object.keys(map)) {
    prev[key] = process.env[key];
    if (map[key] == null) delete process.env[key];
    else process.env[key] = map[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(map)) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
}

const VALID = {
  name: 'Morgonrutin SE',
  destination_url: 'https://mystarday.se/register', // pragma: allowlist secret
  daily_budget_sek: 50,
  countries: ['se'],
  primary_text: 'En lugnare morgon med ett nästa steg för barnet.',
  headline: 'Ett nästa steg',
  hypothesis: 'Föräldrar som söker bildschema registrerar sig och når First Success.',
  primary_metric: 'First Success 7d',
  image_url: 'https://mystarday.se/og-image.png', // pragma: allowlist secret
};

describe('meta ads brief schema', () => {
  test('parses a valid traffic brief and normalizes countries/slug/öre', () => {
    const brief = parseCampaignBrief(VALID);
    assert.equal(brief.slug, 'morgonrutin-se');
    assert.deepEqual(brief.countries, ['SE']);
    assert.equal(brief.daily_budget_ore, 5000);
    assert.equal(brief.objective, 'OUTCOME_TRAFFIC');
    assert.equal(brief.call_to_action, 'LEARN_MORE');
  });

  test('rejects destination hosts outside the brand allowlist', () => {
    assert.throws(
      () => parseCampaignBrief({ ...VALID, destination_url: 'https://evil.example/phish' }),
      /inte tillåten/
    );
  });

  test('rejects daily budget above the env cap', () => {
    assert.throws(
      () => parseCampaignBrief({ ...VALID, daily_budget_sek: 5000 }),
      /Dagsbudget max/
    );
  });

  test('blocks fear-based and medical copy', () => {
    const blocked = findCopyViolations({
      ...VALID,
      primary_text: 'Bota ADHD hemma med sista chansen idag',
    });
    assert.ok(blocked.some((v) => v.id === 'cure_adhd'));
    assert.ok(blocked.some((v) => v.id === 'last_chance'));
    assert.throws(
      () => parseCampaignBrief({ ...VALID, headline: 'Bota autism på en vecka' }),
      (err) => err.code === 'META_ADS_COPY_BLOCKED' || err instanceof ZodError
    );
  });

  test('slugify strips diacritics', () => {
    assert.equal(slugifyName('Morgonrutin för Stjärndag'), 'morgonrutin-for-stjarndag');
  });

  test('utm tags are added without dropping the path', () => {
    const url = withCampaignUtm('https://mystarday.se/register', 'morgon-se'); // pragma: allowlist secret
    assert.match(url, /utm_source=meta/);
    assert.match(url, /utm_campaign=morgon-se/);
    assert.match(url, /\/register/);
  });

  test('committed Cursor example parses', () => {
    const example = require('../docs/meta-ads/examples/se-traffic-register.js');
    const brief = parseCampaignBrief({ ...example, created_source: 'cursor' });
    assert.equal(brief.created_source, 'cursor');
    assert.equal(brief.slug, 'morgon-se-register');
    assert.equal(brief.daily_budget_ore, 5000);
  });
});

describe('meta ads publisher', () => {
  test('creates paused objects then activates campaign/ad set/ad', async () => {
    const calls = [];
    const client = {
      async graph(method, objectPath, body) {
        calls.push({ method, path: objectPath, body });
        if (String(objectPath).includes('/adimages')) {
          return { images: { file: { hash: 'imghash' } } };
        }
        if (String(objectPath).includes('/campaigns')) return { id: 'camp_1' };
        if (String(objectPath).includes('/adsets')) return { id: 'adset_1' };
        if (String(objectPath).includes('/adcreatives')) return { id: 'cr_1' };
        if (String(objectPath).includes('/ads')) return { id: 'ad_1' };
        return { success: true };
      },
    };
    const ids = await withEnv({
      META_AD_ACCOUNT_ID: 'act_123',
      META_ADS_PAGE_ID: 'page_9',
    }, () => publishApprovedCampaign(
      { ...parseCampaignBrief(VALID) },
      { graphClient: client }
    ));
    assert.equal(ids.meta_campaign_id, 'camp_1');
    assert.equal(ids.meta_ad_id, 'ad_1');
    const campaignCreate = calls.find((c) => String(c.path).endsWith('/campaigns'));
    assert.equal(campaignCreate.body.status, 'PAUSED');
    const activate = calls.filter((c) => c.path === 'camp_1' || c.path === 'adset_1' || c.path === 'ad_1');
    assert.equal(activate.length, 3);
    assert.ok(activate.every((c) => c.body.status === 'ACTIVE'));
  });

  test('firstImageHash reads the first hash from Meta payload', () => {
    assert.equal(firstImageHash({ images: { a: { hash: 'abc' } } }), 'abc');
  });
});

describe('meta ads public config and wiring', () => {
  test('public config never includes the access token', () => {
    withEnv({
      META_ADS_ACCESS_TOKEN: 'secret-token-value',
      META_AD_ACCOUNT_ID: '999',
      META_ADS_PAGE_ID: '111',
    }, () => {
      const pub = getPublicMetaAdsConfig();
      assert.equal(pub.configured, true);
      assert.equal(pub.adAccountId, 'act_999');
      const encoded = JSON.stringify(pub);
      assert.doesNotMatch(encoded, /secret-token-value/);
    });
  });

  test('CLI script never requires the publisher', () => {
    const src = fs.readFileSync(path.join(__dirname, '../scripts/meta-ads-propose.js'), 'utf8');
    assert.doesNotMatch(src, /publishApprovedCampaign/);
    assert.doesNotMatch(src, /graph\.facebook\.com/);
  });

  test('admin router mounts meta-ads behind requireAdmin', () => {
    const adminSource = fs.readFileSync(path.join(__dirname, '../src/routes/admin.js'), 'utf8');
    const requireAdminIdx = adminSource.indexOf('router.use(requireAdmin)');
    const mountIdx = adminSource.indexOf("router.use('/meta-ads'");
    assert.ok(requireAdminIdx >= 0);
    assert.ok(mountIdx > requireAdminIdx);
  });

  test('approve is the only route that publishes', () => {
    const route = fs.readFileSync(path.join(__dirname, '../src/routes/admin/meta-ads.js'), 'utf8');
    assert.match(route, /publishApprovedCampaign/);
    assert.match(route, /\/approve/);
    const publishCount = route.split('publishApprovedCampaign').length - 1;
    assert.equal(publishCount, 2);
  });
});
