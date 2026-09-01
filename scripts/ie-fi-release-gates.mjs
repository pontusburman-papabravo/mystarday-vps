#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  evaluateIeFiReleaseGates,
  loadCommittedEvidence,
} = require('../src/lib/ie-fi-release-gates');

const evidence = loadCommittedEvidence();
const gates = evaluateIeFiReleaseGates(evidence);

function yn(v) {
  return v ? 'YES' : 'NO';
}

const report = {
  IE_CLOSED_CODE_READY: yn(gates.IE.CLOSED_CODE_READY),
  FI_CLOSED_CODE_READY: yn(gates.FI.CLOSED_CODE_READY),
  IE_PREBILLING_MARKET_READY: yn(gates.IE.PREBILLING_MARKET_READY),
  FI_PREBILLING_MARKET_READY: yn(gates.FI.PREBILLING_MARKET_READY),
  IE_BILLING_CONFIGURATION_READY: yn(gates.IE.BILLING_CONFIGURATION_READY),
  FI_BILLING_CONFIGURATION_READY: yn(gates.FI.BILLING_CONFIGURATION_READY),
  IE_DEVICE_VERIFIED: yn(gates.IE.DEVICE_VERIFIED),
  FI_DEVICE_VERIFIED: yn(gates.FI.DEVICE_VERIFIED),
  IE_READY_TO_OPEN: yn(gates.IE.READY_TO_OPEN),
  FI_READY_TO_OPEN: yn(gates.FI.READY_TO_OPEN),
  IE_PAID_ROLLOUT_READY: yn(gates.IE.PAID_ROLLOUT_READY),
  FI_PAID_ROLLOUT_READY: yn(gates.FI.PAID_ROLLOUT_READY),
  note: 'Committed JSON and unit tests never grant READY_TO_OPEN or PAID_ROLLOUT_READY',
};

console.log(JSON.stringify(report, null, 2));
