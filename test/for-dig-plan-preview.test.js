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
    skolansvar: 'Få läxor och väska att funka',
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
    if (sql.includes('weekly_schedule_item')) {
      return { rows: [] };
    }
    if (sql.includes('default_activity_template')) {
      return {
        rows: [
          { name: 'Städa rum', icon: '🧹', star_value: 2, sub_steps: [] },
          { name: 'Duka av', icon: '🍽️', star_value: 1, sub_steps: [] },
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
    assert.ok(plan.details.item_count >= 3);
  } finally {
    db.query = originalQuery;
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
