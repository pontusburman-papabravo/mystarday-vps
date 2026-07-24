'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SE_DIR = path.join(ROOT, 'config/experience-packs/child_se');
const EN_DIR = path.join(ROOT, 'config/experience-packs/child_en');

/** Normal Child Core scenes reachable from playable worlds / wire-in catalog. */
const NORMAL_SCENE_IDS = [
  'home_exterior', 'home_hall', 'bedroom', 'home_kitchen', 'home_bathroom',
  'attic', 'garden', 'workshop', 'museum', 'pet_house', 'trophy_room',
  'reading_corner', 'forest', 'lake', 'memory_hall',
];

function runPackAudit() {
  const out = execSync('node scripts/audit-child-pack-parity.mjs --json', {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

function listJsonFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
}

describe('child_en experience pack parity', () => {
  it('child_se and child_en have identical file structure', () => {
    assert.deepEqual(listJsonFiles(SE_DIR), listJsonFiles(EN_DIR));
  });

  it('audit reports zero schema diffs and zero Swedish leakage in child_en', () => {
    const report = runPackAudit();
    assert.equal(report.totals.files_compared, 9);
    assert.equal(report.totals.schema_diff_files, 0);
    assert.equal(report.totals.swedish_strings_total, 0);
    assert.equal(report.totals.swedish_leak_files, 0);
    assert.equal(report.totals.empty_required_files, 0);
    for (const f of report.files) {
      assert.equal(f.schema_diff_count, 0, `${f.file} schema mismatch`);
      assert.equal(f.swedish_string_count, 0, `${f.file} still has Swedish`);
    }
  });

  it('child_en manifest declares en-GB locale', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(EN_DIR, 'manifest.json'), 'utf8'));
    assert.equal(manifest.pack_id, 'child_en');
    assert.equal(manifest.locale, 'en-GB');
  });

  it('normal-reachability scenes have English display names in child_en', () => {
    const scenes = JSON.parse(fs.readFileSync(path.join(EN_DIR, 'scenes.json'), 'utf8'));
    const byId = new Map((scenes.scenes || []).map((s) => [s.scene_id, s]));
    for (const sceneId of NORMAL_SCENE_IDS) {
      const scene = byId.get(sceneId);
      assert.ok(scene, `missing scene ${sceneId} in child_en`);
      const name = scene.display_name_sv || '';
      assert.ok(name.length > 0, `${sceneId} missing display_name_sv`);
      assert.doesNotMatch(name, /[åäöÅÄÖ]/, `${sceneId} display name still Swedish: ${name}`);
      assert.doesNotMatch(name, /^(Hemmet|Hallen|Köket|Sovrummet|Trädgården)/, name);
    }
  });

  it('child_en worlds used in normal navigation are English', () => {
    const worlds = JSON.parse(fs.readFileSync(path.join(EN_DIR, 'worlds.json'), 'utf8'));
    const slugs = ['routine_home', 'garden', 'memory_hall'];
    for (const slug of slugs) {
      const w = (worlds.worlds || []).find((x) => x.world_slug === slug);
      assert.ok(w, `missing world ${slug}`);
      const name = w.display_name_sv || '';
      assert.doesNotMatch(name, /[åäöÅÄÖ]/, `${slug} display name: ${name}`);
    }
  });

  it('child_en copy experiences are English (not duplicated in child-en-GB.json UI bundle)', () => {
    const copy = JSON.parse(fs.readFileSync(path.join(EN_DIR, 'copy.json'), 'utf8'));
    const exp = copy.experiences.parent_ack_completion;
    assert.match(exp.headline_template, /Today/);
    assert.doesNotMatch(exp.body_template, /[åäöÅÄÖ]/);
  });

  it('loadPack(child_en) succeeds and matches child_se structure', () => {
    const { loadPack, clearPackCache } = require('../src/lib/experience-pack');
    clearPackCache();
    const se = loadPack('child_se');
    const en = loadPack('child_en');
    assert.equal(se.scenes.scenes.length, en.scenes.scenes.length);
    assert.equal(se.worlds.worlds.length, en.worlds.worlds.length);
    clearPackCache();
  });
});
