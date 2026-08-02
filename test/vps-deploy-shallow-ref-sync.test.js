'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('vps-deploy-revision.sh', () => {
  it('refreshes origin/main after successful deploy (shallow ref sync)', () => {
    const script = fs.readFileSync(
      path.join(__dirname, '../scripts/vps-deploy-revision.sh'),
      'utf8'
    );
    assert.match(script, /refresh origin\/main tracking ref/);
    assert.match(script, /refs\/heads\/main:refs\/remotes\/origin\/main/);
  });
});
