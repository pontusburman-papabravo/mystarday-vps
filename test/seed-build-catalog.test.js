'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ensureBuildCatalog, MVP_CATALOG } = require('../src/lib/seed-build-catalog');
const db = require('../src/lib/db');

test('ensureBuildCatalog seeds when empty', async () => {
  const before = await db.query('SELECT COUNT(*)::int AS n FROM build_project_catalog');
  if (before.rows[0].n === 0) {
    const result = await ensureBuildCatalog();
    assert.equal(result.seeded, true);
    assert.ok(result.count >= MVP_CATALOG.length);
  } else {
    const result = await ensureBuildCatalog();
    assert.equal(result.seeded, false);
  }
  const racer = await db.query("SELECT slug, name FROM build_project_catalog WHERE slug = 'racerbil'");
  assert.equal(racer.rows[0].slug, 'racerbil');
});
