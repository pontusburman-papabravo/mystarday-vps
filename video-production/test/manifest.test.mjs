import assert from 'node:assert/strict';
import test from 'node:test';
import { wrapCaption } from '../lib/caption-layout.mjs';
import {
  ManifestSchema,
  loadManifest,
  computeAppScreenRatio,
  sceneCaptionText,
  sceneRenderCaption,
  resolveBrandCaption,
  resolveBrandUrl,
  TAGLINE_VARIANTS,
  planGeneration,
} from '../lib/manifest.mjs';
import { TRANSITIONS, BRAND_URL } from '../lib/config.mjs';
import { computeTimelineDuration } from '../lib/ffmpeg.mjs';

const FILM_IDS = ['a-morning-without-nagging', 'tomorrow-starts-here', 'real-families'];

test('wrapCaption respects manual line breaks', () => {
  const result = wrapCaption('Mer lugn. Mindre tjat.', 24);
  assert.match(result, /^Mer lugn/);
});

test('tagline variants include feeling-first options and empty E', () => {
  assert.match(TAGLINE_VARIANTS.A, /kännas så här/i);
  assert.match(TAGLINE_VARIANTS.B, /Mindre tjat/i);
  assert.equal(TAGLINE_VARIANTS.E, '');
});

test('all films follow love-chaos-hope-solution arc', () => {
  for (const id of FILM_IDS) {
    const { manifest } = loadManifest(id);
    assert.ok(manifest.creativeBrief?.length > 20, `${id} missing creativeBrief`);
    assert.equal(manifest.taglineVariantDefault, 'E');

    assert.equal(manifest.scenes[0].role, 'recognition');
    assert.equal(sceneCaptionText(manifest.scenes[0]), '');

    assert.equal(manifest.scenes[1].role, 'chaos');
    assert.equal(sceneCaptionText(manifest.scenes[1]), '');

    const hope = manifest.scenes.find((s) => s.role === 'hope');
    assert.ok(hope, `${id} missing hope beat`);
    assert.equal(hope.skipPika, true);

    const starScenes = manifest.scenes.filter((s) => {
      const p = (s.pikaPrompt || '').toLowerCase();
      return (/first star|star reward|star graphic|belöning|⭐/.test(p))
        && !/no star|no reward|no belöning/.test(p);
    });
    assert.equal(starScenes.length, 0, `${id} must not show star/reward in prompts`);

    const { ratio } = computeAppScreenRatio(manifest);
    assert.ok(ratio <= 0.25, `${id} app ratio ${Math.round(ratio * 100)}% exceeds 25%`);

    const brand = manifest.scenes.find((s) => s.role === 'brand');
    assert.equal(brand.showCaption, false);
    assert.equal(brand.swedishText, '');
    assert.equal(resolveBrandCaption(manifest, 'E'), '');
    assert.equal(sceneRenderCaption(manifest, brand, { taglineVariant: 'E' }), '');
    assert.match(resolveBrandCaption(manifest, 'B'), /Mindre tjat/i);

    for (const scene of manifest.scenes) {
      assert.ok(TRANSITIONS.has(scene.transition));
      assert.match(scene.outputFilename, /\.mp4$/);
      if (!scene.skipPika) {
        assert.ok(scene.pikaPrompt.length > 40);
        if (scene.role === 'app-glimpse') {
          assert.match(scene.pikaPrompt, /blur|unreadable|out of focus|bokeh/i);
        }
      }
    }
  }
});

test('shoes validation scene emphasizes parent-child eye contact', () => {
  const { manifest } = loadManifest('a-morning-without-nagging');
  const shoes = manifest.scenes.find((s) => s.id === 'scene-05-shoes-alone');
  assert.equal(shoes.validationScene, true);
  assert.equal(shoes.duckMusic, true);
  assert.match(shoes.pikaPrompt, /smiles back|mutual eye contact/i);
  assert.ok(shoes.audioCues?.some((c) => /zipper/i.test(c.description)));
});

test('each flagship film has exactly one validation scene', () => {
  const expected = {
    'a-morning-without-nagging': 'scene-05-shoes-alone',
    'together-through-the-morning': 'whats-next',
  };
  for (const [filmId, sceneId] of Object.entries(expected)) {
    const { manifest } = loadManifest(filmId);
    const v = manifest.scenes.filter((s) => s.validationScene);
    assert.equal(v.length, 1, filmId);
    assert.equal(v[0].id, sceneId, filmId);
  }
});

test('together-through-the-morning v3 is ~38 seconds', () => {
  const { manifest } = loadManifest('together-through-the-morning');
  const dur = computeTimelineDuration(manifest.scenes);
  assert.ok(dur >= 38 && dur <= 44, `duration ${dur}s`);
  assert.equal(resolveBrandUrl(manifest), BRAND_URL);
  const app = computeAppScreenRatio(manifest);
  assert.ok(app.ratio >= 0.08 && app.ratio <= 0.35);
});

test('together-through-the-morning v4 commercial edit is ~40 seconds with low UI', () => {
  const { manifest } = loadManifest('together-through-the-morning-v4');
  const dur = computeTimelineDuration(manifest.scenes);
  assert.ok(dur >= 40 && dur <= 46, `duration ${dur}s`);
  assert.equal(manifest.endBoardShowUrl, false);
  assert.equal(manifest.endBoardLogoOnly, true);
  assert.equal(manifest.rawSourceManifest, 'together-through-the-morning');
  assert.ok(manifest.scenes.find((s) => s.id === 'love-glance'));
  assert.ok(manifest.scenes.find((s) => s.id === 'together-hand'));
  assert.ok(!manifest.scenes.find((s) => s.id === 'app-redeem'));
  assert.ok(!manifest.scenes.find((s) => s.id === 'app-check-star-2'));
  const app = computeAppScreenRatio(manifest);
  assert.ok(app.ratio <= 0.1, `UI ${Math.round(app.ratio * 100)}% exceeds 10%`);
  assert.ok(manifest.music?.startSec >= 8);
  const black = manifest.scenes.find((s) => s.id === 'black-leader');
  assert.ok(black?.skipPika);
  assert.equal(black.renderDuration, 3);
  const v = manifest.scenes.filter((s) => s.validationScene);
  assert.equal(v.length, 1);
  assert.equal(v[0].id, 'whats-next');
});

test('tomorrow flagship has evening hope line and one app glimpse', () => {
  const { manifest } = loadManifest('tomorrow-starts-here');
  const hope = manifest.scenes.find((s) => s.role === 'hope');
  assert.match(hope.swedishText, /Kvällen skapar morgonen/i);
  assert.equal(manifest.scenes.filter((s) => s.role === 'app-glimpse').length, 1);
  const shoes = manifest.scenes.find((s) => s.id === 'scene-06-morning-shoes');
  assert.equal(shoes.renderDuration, 7);
  assert.match(shoes.pikaPrompt, /smiles back|mutual eye contact/i);
  assert.ok(computeTimelineDuration(manifest.scenes) > 28);
});

test('morning film has no app scenes', () => {
  const { manifest } = loadManifest('a-morning-without-nagging');
  assert.equal(computeAppScreenRatio(manifest).ratio, 0);
});

test('brand scenes hold two extra seconds for post-logo silence', () => {
  for (const id of FILM_IDS) {
    const { manifest } = loadManifest(id);
    const brand = manifest.scenes.find((s) => s.role === 'brand');
    assert.equal(brand.renderDuration, 7);
    assert.ok(brand.audioCues?.some((c) => /silence|quiet/i.test(c.description)));
  }
});

test('manifest schema rejects invalid scene without prompt', () => {
  assert.throws(() => ManifestSchema.parse({
    id: 'x',
    title: 'X',
    outputBasename: 'x',
    referenceImage: 'assets/references/x.png',
    scenes: [{
      id: 's1',
      duration: 5,
      pikaPrompt: 'short',
      swedishText: 'Hej',
      transition: 'fade',
      outputFilename: 's1.mp4',
    }],
  }));
});

test('child-drives-the-morning is ~25s cartoon single-story arc', () => {
  const { manifest } = loadManifest('child-drives-the-morning');
  const dur = computeTimelineDuration(manifest.scenes);
  assert.ok(dur >= 23 && dur <= 27, `duration ${dur}s`);
  assert.equal(manifest.visualStyle, 'cartoon');
  assert.equal(manifest.scenes[0].role, 'chaos');
  assert.equal(manifest.scenes[0].swedishText, 'Varje morgon börjar likadant.');
  assert.match(manifest.scenes[1].swedishText, /Jag vet vad jag ska göra/i);
  assert.equal(manifest.scenes[1].swedishText, 'Jag vet vad jag ska göra.');
  assert.match(manifest.scenes[3].swedishText, /Jag klarade det/i);
  assert.match(manifest.scenes[4].swedishText, /fredagsfilmen/i);
  assert.equal(resolveBrandCaption(manifest, 'B'), 'Mindre tjat. Mer självständighet.');
  assert.equal(manifest.vo?.length ?? 0, 0);
  const evening = manifest.scenes.find((s) => s.id === 'evening-wizard');
  assert.ok(evening);
  assert.doesNotMatch(evening.pikaPrompt, /ladda ner appen|download the app|app store badge/i);
  const v = manifest.scenes.filter((s) => s.validationScene);
  assert.equal(v.length, 1);
  assert.equal(v[0].id, 'morning-payoff');
});

test('planGeneration supports shoes validation scene filter', () => {
  const { manifest } = loadManifest('a-morning-without-nagging');
  const plan = planGeneration([{ manifest, state: { scenes: {} } }], {
    sceneId: 'scene-05-shoes-alone',
  });
  assert.equal(plan.totalScenes, 1);
  assert.equal(plan.pendingScenes, 1);
});
