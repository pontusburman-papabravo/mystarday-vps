'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatStoryEvent } = require('../src/lib/family-story-format');

describe('family-hall formatStoryEvent', () => {
  it('formats activity_contribution with stars', () => {
    const row = {
      id: 'e1',
      type: 'activity_contribution',
      child_id: 'c1',
      child_name: 'Astrid',
      created_at: '2026-06-10T10:00:00Z',
      payload: { activityName: 'Borsta tänder', starValue: 2, childName: 'Astrid' },
    };
    const story = formatStoryEvent(row);
    assert.equal(story.text, 'Astrid klarade Borsta tänder (+2 ⭐)');
    assert.equal(story.type, 'activity_contribution');
  });

  it('formats project_completed', () => {
    const row = {
      id: 'e2',
      type: 'project_completed',
      child_id: null,
      child_name: null,
      created_at: '2026-06-10T11:00:00Z',
      payload: { title: 'Liseberg' },
    };
    const story = formatStoryEvent(row);
    assert.ok(story.text.includes('Liseberg'));
  });
});
