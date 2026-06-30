'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadPack, clearPackCache } = require('../src/lib/experience-pack');

describe('experience pack load errors', () => {
  let tmpRoot;
  let packsRoot;

  beforeEach(() => {
    clearPackCache();
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xp-pack-'));
    packsRoot = path.join(tmpRoot, 'experience-packs');
    fs.mkdirSync(packsRoot, { recursive: true });
  });

  afterEach(() => {
    clearPackCache();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    delete process.env.EXPERIENCE_PACKS_ROOT;
  });

  function writePack(packId, files) {
    const packDir = path.join(packsRoot, packId);
    fs.mkdirSync(packDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(packDir, name), content, 'utf8');
    }
    process.env.EXPERIENCE_PACKS_ROOT = packsRoot;
    clearPackCache();
  }

  it('reports missing pack directory with expected manifest path', () => {
    process.env.EXPERIENCE_PACKS_ROOT = packsRoot;
    clearPackCache();
    assert.throws(
      () => loadPack('missing_pack'),
      /Experience pack not found: missing_pack/
    );
  });

  it('reports missing included file with pack-relative label', () => {
    writePack('demo_pack', {
      'manifest.json': JSON.stringify({
        pack_id: 'demo_pack',
        includes: { progression: 'progression.json' },
      }),
    });

    assert.throws(
      () => loadPack('demo_pack'),
      /Experience pack file missing \(demo_pack\/progression\.json\)/
    );
  });

  it('reports invalid JSON with file path and parse error', () => {
    writePack('demo_pack', {
      'manifest.json': '{ not json',
    });

    assert.throws(
      () => loadPack('demo_pack'),
      /Experience pack JSON invalid \(demo_pack\/manifest\.json\)/
    );
  });

  it('reports manifest.pack_id mismatch against directory name', () => {
    writePack('demo_pack', {
      'manifest.json': JSON.stringify({
        pack_id: 'other_pack',
        includes: {},
      }),
    });

    assert.throws(
      () => loadPack('demo_pack'),
      /pack id mismatch: directory "demo_pack" but manifest\.pack_id is "other_pack"/
    );
  });
});
