'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  compareToStoredState,
  eventTypePriority,
} = require('../src/lib/revenuecat-event-ordering');

describe('revenuecat event ordering tuple', () => {
  test('higher timestamp wins', () => {
    const stored = { iap_last_event_timestamp_ms: 1000, iap_last_event_type: 'EXPIRATION', iap_last_revenuecat_event_id: 'evt_a' };
    const incoming = { id: 'evt_b', type: 'EXPIRATION', event_timestamp_ms: 2000 };
    assert.equal(compareToStoredState(incoming, stored), 'incoming_newer');
  });

  test('older timestamp is stale', () => {
    const stored = { iap_last_event_timestamp_ms: 2000, iap_last_event_type: 'RENEWAL', iap_last_revenuecat_event_id: 'evt_b' };
    const incoming = { id: 'evt_c', type: 'EXPIRATION', event_timestamp_ms: 1000 };
    assert.equal(compareToStoredState(incoming, stored), 'stale');
  });

  test('same timestamp: higher event priority wins', () => {
    const ts = 5_000_000;
    const stored = { iap_last_event_timestamp_ms: ts, iap_last_event_type: 'EXPIRATION', iap_last_revenuecat_event_id: 'evt_a' };
    const incoming = { id: 'evt_b', type: 'RENEWAL', event_timestamp_ms: ts };
    assert.ok(eventTypePriority('RENEWAL') > eventTypePriority('EXPIRATION'));
    assert.equal(compareToStoredState(incoming, stored), 'incoming_newer');
  });

  test('same timestamp and priority: lexicographic event id', () => {
    const ts = 5_000_000;
    const stored = { iap_last_event_timestamp_ms: ts, iap_last_event_type: 'RENEWAL', iap_last_revenuecat_event_id: 'evt_aaa' };
    const incoming = { id: 'evt_aab', type: 'RENEWAL', event_timestamp_ms: ts };
    assert.equal(compareToStoredState(incoming, stored), 'incoming_newer');
    assert.equal(compareToStoredState({ ...incoming, id: 'evt_aaa' }, stored), 'tie_same_id');
  });
});
