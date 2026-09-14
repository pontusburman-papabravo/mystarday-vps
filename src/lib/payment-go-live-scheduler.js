'use strict';

/**
 * Fires at payment_start_at (and on boot / retry) to apply Sweden paid go-live.
 * Catch-up on restart. Does not re-enable after a successful apply (admin kill switch wins).
 */

const { PAYMENT_GO_LIVE_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');
const { ACTIONS, runPaymentGoLive } = require('./payment-go-live');
const logger = require('./logger');

const RETRY_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 6 * 60 * 60 * 1000;
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;
const MIN_WAIT_MS = 1000;

let _timer = null;

function shouldStartPaymentGoLiveScheduler() {
  if (process.env.NODE_ENV === 'test') return false;
  const v = process.env.PAYMENT_GO_LIVE_SCHEDULER;
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

function nextPaymentGoLiveDelayMs(decision, {
  retryMs = RETRY_MS,
  heartbeatMs = HEARTBEAT_MS,
  maxWaitMs = MAX_WAIT_MS,
  minWaitMs = MIN_WAIT_MS,
} = {}) {
  if (!decision) return retryMs;
  if (decision.action === ACTIONS.WAIT) {
    const ms = Number.isFinite(decision.msUntil) ? decision.msUntil : retryMs;
    return Math.max(minWaitMs, Math.min(ms, maxWaitMs));
  }
  if (decision.action === ACTIONS.BLOCKED) return retryMs;
  return heartbeatMs;
}

function clearTimer() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

function scheduleNext(delayMs) {
  clearTimer();
  _timer = setTimeout(() => {
    tick().catch((err) => {
      logger.error({
        msg: 'Payment go-live tick failed',
        operation: 'payment.go_live.tick',
        error: err.message,
      }, err);
      scheduleNext(RETRY_MS);
    });
  }, delayMs);
  if (_timer.unref) _timer.unref();
}

async function tick() {
  const outcome = await withAdvisoryLock(PAYMENT_GO_LIVE_LOCK_ID, async () => runPaymentGoLive());
  if (outcome?.skipped === 'lock') {
    logger.info({
      msg: 'Payment go-live skipped — another instance holds the lock',
      operation: 'payment.go_live.lock',
    });
    scheduleNext(RETRY_MS);
    return outcome;
  }
  if (outcome?.skipped === 'error') {
    scheduleNext(RETRY_MS);
    return outcome;
  }
  scheduleNext(nextPaymentGoLiveDelayMs(outcome && outcome.result && outcome.result.decision));
  return outcome;
}

function startPaymentGoLiveScheduler() {
  if (!shouldStartPaymentGoLiveScheduler()) {
    logger.info({
      msg: 'Payment go-live scheduler not started',
      operation: 'payment.go_live.start',
      reason: process.env.NODE_ENV === 'test' ? 'test_env' : 'disabled',
    });
    return;
  }
  tick().catch((err) => {
    logger.error({
      msg: 'Payment go-live initial tick failed',
      operation: 'payment.go_live.start',
      error: err.message,
    }, err);
    scheduleNext(RETRY_MS);
  });
  logger.info({
    msg: 'Payment go-live scheduler started',
    operation: 'payment.go_live.start',
  });
}

function stopPaymentGoLiveScheduler() {
  clearTimer();
}

module.exports = {
  RETRY_MS,
  HEARTBEAT_MS,
  MAX_WAIT_MS,
  shouldStartPaymentGoLiveScheduler,
  nextPaymentGoLiveDelayMs,
  startPaymentGoLiveScheduler,
  stopPaymentGoLiveScheduler,
};
