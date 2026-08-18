'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSessionMetadata,
  enrichActorMetadata,
  classifySessionSource,
  normalizePlatform,
} = require('../src/lib/session-telemetry');

const PARENT_ID = '11111111-1111-4111-8111-111111111111';
const CHILD_ID = '22222222-2222-4222-8222-222222222222';
const DEVICE_ID = '33333333-3333-4333-8333-333333333333';

describe('session-telemetry', () => {
  it('buildSessionMetadata produces actor fields without PII', () => {
    const meta = buildSessionMetadata({
      actorType: 'parent',
      actorId: PARENT_ID,
      trustedDeviceId: DEVICE_ID,
      deviceMode: 'shared',
      platform: 'ios',
      source: 'trusted_device_restore_parent',
      sessionMode: 'resume',
    });
    assert.equal(meta.actor_type, 'parent');
    assert.equal(meta.actor_id, PARENT_ID);
    assert.equal(meta.trusted_device_id, DEVICE_ID);
    assert.equal(meta.device_mode, 'shared');
    assert.equal(meta.platform, 'ios');
    assert.equal(meta.source, 'trusted_device_restore_parent');
    assert.equal(meta.session_mode, 'resume');
    assert.equal(meta.email, undefined);
    assert.equal(meta.token, undefined);
    assert.equal(meta.child_id, undefined);
  });

  it('rejects invalid actor_id', () => {
    assert.throws(() => buildSessionMetadata({
      actorType: 'child',
      actorId: 'not-a-uuid',
      source: 'child_login',
      sessionMode: 'fresh',
    }));
  });

  it('enrichActorMetadata adds actor from JWT user', () => {
    const meta = enrichActorMetadata({}, {
      id: CHILD_ID,
      type: 'child',
      trustedDeviceId: DEVICE_ID,
    });
    assert.equal(meta.actor_type, 'child');
    assert.equal(meta.actor_id, CHILD_ID);
    assert.equal(meta.trusted_device_id, DEVICE_ID);
  });

  it('classifySessionSource distinguishes trusted device from password', () => {
    assert.equal(classifySessionSource({ trusted_device_id: DEVICE_ID }), 'trusted_device');
    assert.equal(classifySessionSource({ source: 'password_login' }), 'password_login');
    assert.equal(classifySessionSource({ source: 'child_login' }), 'child_login');
  });

  it('normalizePlatform maps unknown to unknown', () => {
    assert.equal(normalizePlatform('ios'), 'ios');
    assert.equal(normalizePlatform('desktop'), 'unknown');
  });
});
