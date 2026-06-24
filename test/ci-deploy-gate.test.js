const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const deployYml = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/deploy.yml'), 'utf8');

describe('G2 — deploy gated on green CI', () => {
  it('deploy workflow triggers on CI completion', () => {
    assert.match(deployYml, /workflow_run:/);
    assert.match(deployYml, /workflows:\s*\[CI\]/);
    assert.match(deployYml, /branches:\s*\[main\]/);
  });

  it('deploy job only runs when CI conclusion is success (or manual dispatch)', () => {
    assert.match(deployYml, /workflow_run\.conclusion == 'success'/);
    assert.match(deployYml, /workflow_dispatch/);
  });
});
