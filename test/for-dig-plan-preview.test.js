'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildActivationPlanPreview,
  getGoalCtaLabel,
} = require('../src/lib/for-dig-activate');
const { FOR_DIG_GOALS, getGoalBySlug } = require('../src/lib/for-dig-config');

test('each goal has parent-facing headline', () => {
  const expected = {
    'trygga-kvallar': 'Få lugnare läggningar',
    'bra-morgnar': 'Kom iväg utan morgontjat',
    sjalvstandighet: 'Få barnet att klä sig själv',
    skolansvar: 'Få hela skoldagen att flyta',
    'samarbete-hemma': 'Få hjälp med dukning och städning',
    motivation: 'Hålla motivationen uppe med belöningar',
  };

  for (const goal of FOR_DIG_GOALS) {
    assert.ok(goal.headline, `${goal.slug} missing headline`);
    assert.equal(goal.headline, expected[goal.slug], goal.slug);
    assert.notEqual(goal.headline, goal.title, `${goal.slug} headline should differ from internal title`);
  }
});

test('getGoalCtaLabel returns action-oriented labels', () => {
  assert.equal(getGoalCtaLabel(getGoalBySlug('trygga-kvallar')), 'Lägg in kvällsrutinen');
  assert.equal(getGoalCtaLabel(getGoalBySlug('samarbete-hemma')), 'Lägg till aktiviteterna');
  assert.equal(getGoalCtaLabel(getGoalBySlug('motivation')), 'Lägg till belöningarna');
});

test('buildActivationPlanPreview for samarbete-hemma includes Jenny decision points', async () => {
  const parentId = '00000000-0000-4000-8000-000000000001';
  const childId = '00000000-0000-4000-8000-000000000002';
  const familyId = '00000000-0000-4000-8000-000000000003';

  const db = require('../src/lib/db');
  const originalQuery = db.query.bind(db);
  db.query = async (sql, params) => {
    if (sql.includes('FROM child c') && sql.includes('parent_child')) {
      return { rows: [{ id: childId, family_id: familyId, name: 'Astrid' }] };
    }
    if (sql.includes('preferred_locale FROM family')) {
      return { rows: [{ preferred_locale: 'sv-SE' }] };
    }
    if (sql.includes('weekly_schedule_item')) {
      return { rows: [] };
    }
    if (sql.includes('default_activity_template')) {
      return {
        rows: [
          { name: 'Städa rummet', icon: '🧹', star_value: 2, sub_steps: [] },
          { name: 'Duka av', icon: '✨', star_value: 1, sub_steps: [] },
          { name: 'Hämta post', icon: '📬', star_value: 1, sub_steps: [] },
          { name: 'Hjälpa till', icon: '🤝', star_value: 1, sub_steps: [] },
        ],
      };
    }
    return originalQuery(sql, params);
  };

  try {
    const plan = await buildActivationPlanPreview({
      parentId,
      childIds: [childId],
      goalSlug: 'samarbete-hemma',
    });

    assert.equal(plan.headline, 'Få hjälp med dukning och städning');
    assert.match(plan.promise, /Astrid/);
    assert.match(plan.promise, /mindre än en minut/);
    assert.equal(plan.cta_label, 'Lägg till aktiviteterna');
    assert.ok(plan.decisions.some((d) => d.text.includes('Lägger till')));
    assert.ok(plan.decisions.some((d) => d.text.includes('Befintligt schema behålls')));
    assert.ok(plan.decisions.some((d) => d.text.includes('Du kan ändra efteråt')));
    assert.equal(plan.decisions.length, 3);
    assert.equal(plan.details.item_count, 4);
  } finally {
    db.query = originalQuery;
  }
});

test('findByNames uses exact normalized match only', () => {
  const { findByNames } = require('../src/lib/for-dig-activate');
  const items = [
    { name: 'Borsta tänderna (morgon)', id: 1 },
    { name: 'Borsta tänderna (kväll)', id: 2 },
    { name: 'Städa rummet', id: 3 },
  ];

  assert.deepEqual(
    findByNames(items, ['Borsta tänder', 'Städa rummet']).map((i) => i.id),
    [3]
  );
  assert.deepEqual(
    findByNames(items, ['Borsta tänderna (morgon)', 'Städa rummet']).map((i) => i.id),
    [1, 3]
  );
  assert.deepEqual(findByNames(items, ['Städa rum']), []);
});

test('buildActivationPlanPreview for trygga-kvallar uses section-scoped decisions', async () => {
  const parentId = '00000000-0000-4000-8000-000000000010';
  const childId = '00000000-0000-4000-8000-000000000011';
  const familyId = '00000000-0000-4000-8000-000000000012';

  const db = require('../src/lib/db');
  const originalQuery = db.query.bind(db);
  const originalPoolConnect = db.pool.connect.bind(db.pool);
  db.pool.connect = async () => ({
    query: db.query.bind(db),
    release: () => {},
  });
  db.query = async (sql, params) => {
    if (sql.includes('FROM child c') && sql.includes('parent_child')) {
      return { rows: [{ id: childId, family_id: familyId, name: 'Astrid' }] };
    }
    if (sql.includes('preferred_locale FROM family')) {
      return { rows: [{ preferred_locale: 'sv-SE' }] };
    }
    if (sql.includes('weekly_schedule_item') && sql.includes('COALESCE')) {
      return { rows: [{ '?column?': 1 }] };
    }
    if (sql.includes('FROM default_schedule ds') && sql.includes('canonical_id')) {
      return {
        rows: [{
          id: 'sch-1',
          name: 'Kvällsrutin',
          canonical_id: 'evening_routine',
          deprecated: false,
          name_i18n: { sv: 'Kvällsrutin' },
        }],
      };
    }
    if (sql.includes('default_activity_template WHERE canonical_id IS NOT NULL')) {
      return { rows: [{ id: 10, canonical_id: 'brush_teeth' }] };
    }
    if (sql.includes('default_schedule WHERE canonical_id IS NOT NULL')) {
      return { rows: [{ id: 'sch-1', canonical_id: 'evening_routine' }] };
    }
    if (sql.includes('FROM default_schedule_item dsi')) {
      return {
        rows: [{
          id: 1,
          section: 'kvall',
          sort_order: 0,
          start_time: null,
          end_time: null,
          is_optional: false,
          item_variant_key: null,
          default_activity_id: 10,
          activity_canonical_id: 'brush_teeth',
          name: 'Borsta tänder',
          name_i18n: { sv: 'Borsta tänder' },
          icon: '🪥',
          icon_key: null,
          star_value: 1,
          duration_seconds: null,
          sub_steps: [],
          variants: null,
          seven_questions: null,
          activity_deprecated: false,
        }],
      };
    }
    return originalQuery(sql, params);
  };

  try {
    const plan = await buildActivationPlanPreview({
      parentId,
      childIds: [childId],
      goalSlug: 'trygga-kvallar',
    });

    assert.equal(plan.details.section_label, 'Kväll');
    assert.ok(plan.decisions.some((d) => d.text.includes('kvällsaktiviteterna')));
    assert.ok(plan.decisions.some((d) => d.text.includes('Övriga sektioner behålls')));
  } finally {
    db.query = originalQuery;
    db.pool.connect = originalPoolConnect;
  }
});

test('buildActivationPlanPreview rejects empty child_ids', async () => {
  await assert.rejects(
    () => buildActivationPlanPreview({
      parentId: 'p1',
      childIds: [],
      goalSlug: 'trygga-kvallar',
    }),
    /Minst ett barn/
  );
});
