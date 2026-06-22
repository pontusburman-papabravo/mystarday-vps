'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveChildViewPath } = require('../src/lib/child-view-redirect');

const CHILD_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const FAMILY_ID = '11111111-2222-3333-4444-555555555555';

describe('resolveChildViewPath', () => {
  it('view_mode new + magic preview → child/today', async () => {
    const path = await resolveChildViewPath({
      viewMode: 'new',
      childId: CHILD_ID,
      familyId: FAMILY_ID,
      hasMagicAccess: async () => true,
    });
    assert.equal(path, `/child/today?child=${CHILD_ID}`);
  });

  it('view_mode new without magic preview → child-new', async () => {
    const path = await resolveChildViewPath({
      viewMode: 'new',
      childId: CHILD_ID,
      familyId: FAMILY_ID,
      hasMagicAccess: async () => false,
    });
    assert.equal(path, `/child-new/${CHILD_ID}`);
  });

  it('view_mode classic → child/today', async () => {
    const path = await resolveChildViewPath({
      viewMode: 'classic',
      childId: CHILD_ID,
      familyId: FAMILY_ID,
      hasMagicAccess: async () => true,
    });
    assert.equal(path, `/child/today?child=${CHILD_ID}`);
  });
});
