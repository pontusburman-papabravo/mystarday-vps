'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatStoryEvent } = require('../src/lib/family-story-format');

describe('family-hall formatStoryEvent', () => {
  it('formats activity_contribution with stars (sv-SE)', () => {
    const row = {
      id: 'e1',
      type: 'activity_contribution',
      child_id: 'c1',
      child_name: 'Astrid',
      created_at: '2026-06-10T10:00:00Z',
      payload: { activityName: 'Borsta tänder', starValue: 2, childName: 'Astrid' },
    };
    const story = formatStoryEvent(row, { locale: 'sv-SE' });
    assert.equal(story.text, 'Astrid klarade Borsta tänder (+2 ⭐)');
    assert.equal(story.type, 'activity_contribution');
  });

  it('formats activity_contribution with stars in en-GB (user names unchanged)', () => {
    const row = {
      id: 'e1',
      type: 'activity_contribution',
      child_id: 'c1',
      child_name: 'Astrid',
      created_at: '2026-06-10T10:00:00Z',
      payload: { activityName: 'Borsta tänder', starValue: 2, childName: 'Astrid' },
    };
    const story = formatStoryEvent(row, { locale: 'en-GB' });
    assert.equal(story.text, 'Astrid completed Borsta tänder (+2 ⭐)');
  });

  it('formats project_completed (sv-SE)', () => {
    const row = {
      id: 'e2',
      type: 'project_completed',
      child_id: null,
      child_name: null,
      created_at: '2026-06-10T11:00:00Z',
      payload: { title: 'Liseberg' },
    };
    const story = formatStoryEvent(row, { locale: 'sv-SE' });
    assert.ok(story.text.includes('Liseberg'));
  });

  it('parents query is valid PostgreSQL (no DISTINCT with foreign ORDER BY)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../db/family-hall.js'), 'utf8');
    assert.doesNotMatch(src, /SELECT DISTINCT p\.name[\s\S]*?ORDER BY p\.created_at/);
    assert.match(src, /SELECT p\.id, p\.name[\s\S]*?ORDER BY p\.created_at ASC/);
  });

  it('child persons include avatar fields via avatar-api mappers', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../db/family-hall.js'), 'utf8');
    assert.match(src, /mapParentForFamilyApi/);
    assert.match(src, /mapChildForFamilyApi/);
    assert.match(src, /avatar_storage_key/);
  });
});
