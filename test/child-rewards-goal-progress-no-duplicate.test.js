'use strict';

/**
 * Regression test: the classic (non-treasure-v10) Skattkammaren hero
 * (.skatt-hero-v10, rendered inline by renderSkattkammaren in
 * child-dashboard-rewards.js) already shows the active goal's star count,
 * progress bar and label. ChildRewardsEngine.mountGoalProgress() used to
 * ALSO insert a separate #childGoalProgressMount card into the same view
 * on every loadRewards()/refreshRewards() call for any family without
 * treasure-v10 (barnets_samling) active — duplicating the same goal
 * progress twice, stacked, for the classic/default child experience.
 *
 * See public/js/child-rewards-engine.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-rewards-engine.js'), 'utf8');

function makeHeroNode() {
  return { classList: { contains: (c) => c === 'skatt-hero-v10' } };
}

function makeView(initialChildren) {
  const children = initialChildren ? initialChildren.slice() : [];
  const view = {
    children,
    querySelector(sel) {
      const cls = sel.replace('.', '');
      return children.find((c) => c.classList && c.classList.contains(cls)) || null;
    },
    insertBefore(node, ref) {
      const idx = ref ? children.indexOf(ref) : -1;
      children.splice(idx === -1 ? 0 : idx, 0, node);
    },
  };
  Object.defineProperty(view, 'firstChild', { get() { return children[0] || null; } });
  return view;
}

function loadEngine(view) {
  const doc = {
    getElementById: (id) => {
      if (id === 'rewardsView') return view;
      return view.children.find((c) => c.id === id) || null;
    },
    createElement: () => {
      const el = { _html: '' };
      Object.defineProperty(el, 'innerHTML', {
        get() { return el._html; },
        set(v) {
          el._html = v;
          const m = /id="([^"]+)"/.exec(v);
          el.firstChild = { id: m ? m[1] : '', classList: { contains: () => false } };
        },
      });
      return el;
    },
  };
  const sandbox = { window: {}, document: doc, console };
  sandbox.window.document = doc;
  vm.runInNewContext(SRC, sandbox, { filename: 'child-rewards-engine.js' });
  return sandbox.window.ChildRewardsEngine;
}

function activeGoalData() {
  return {
    goal: { star_cost: 50, reward_name: 'Cykel', reward_icon: '\u{1F6B2}' },
    progress_pct: 40,
    stars_toward_goal: 20,
  };
}

describe('child rewards — goal progress is not duplicated alongside the classic hero', () => {
  it('skips the standalone mount when the classic skatt-hero-v10 hero already shows goal progress', () => {
    const view = makeView([makeHeroNode()]);
    const engine = loadEngine(view);
    engine.setGoalData(activeGoalData());

    engine.mountGoalProgress();

    assert.equal(
      view.children.some((c) => c.id === 'childGoalProgressMount'),
      false,
      'must not mount a second goal-progress card on top of the classic hero'
    );
  });

  it('still mounts the standalone card when no classic hero is present (e.g. Idag pre-warm before rewards tab renders)', () => {
    const view = makeView([]);
    const engine = loadEngine(view);
    engine.setGoalData(activeGoalData());

    engine.mountGoalProgress();

    assert.equal(
      view.children.some((c) => c.id === 'childGoalProgressMount'),
      true,
      'standalone mount should still work when the classic hero has not rendered yet'
    );
  });
});
