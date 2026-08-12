'use strict';

const assert = require('node:assert/strict');

/**
 * Fill a feedback modal field deterministically and assert the full value
 * before submit. Guards against Puppeteer page.type resolving before the
 * input value is committed (observed flake: payload.message === 'A').
 */
async function fillFeedbackFieldStable(page, selector, expectedValue, label) {
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });

  const nodeStamp = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    if (!el.dataset.e2eNodeId) {
      el.dataset.e2eNodeId = 'e2e-' + Math.random().toString(36).slice(2, 10);
    }
    return {
      nodeId: el.dataset.e2eNodeId,
      connected: el.isConnected,
      modalHidden: document.getElementById('globalFeedbackModal')?.classList.contains('hidden'),
    };
  }, selector);

  assert.ok(nodeStamp && nodeStamp.connected, `${label}: field ${selector} missing or detached before fill`);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.focus();
    el.value = '';
  }, selector);
  await page.focus(selector);
  await page.keyboard.type(expectedValue, { delay: 5 });

  try {
    await page.waitForFunction(
      (sel, expected) => {
        const el = document.querySelector(sel);
        return !!el && el.isConnected && el.value === expected;
      },
      { timeout: 10000 },
      selector,
      expectedValue
    );
  } catch (err) {
    const diag = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const modal = document.getElementById('globalFeedbackModal');
      return {
        selector: sel,
        exists: !!el,
        connected: el ? el.isConnected : false,
        value: el ? el.value : null,
        valueLength: el ? el.value.length : 0,
        activeId: document.activeElement ? document.activeElement.id : null,
        activeTag: document.activeElement ? document.activeElement.tagName : null,
        nodeId: el ? (el.dataset.e2eNodeId || null) : null,
        modalHidden: modal ? modal.classList.contains('hidden') : null,
        titleValue: document.getElementById('globalFeedbackTitle')?.value || '',
        messageValue: document.getElementById('globalFeedbackMessage')?.value || '',
      };
    }, selector);

    const msg = [
      `${label}: incomplete value in ${selector}`,
      `expected length=${expectedValue.length} actual length=${diag.valueLength}`,
      `expected=${JSON.stringify(expectedValue)}`,
      `actual=${JSON.stringify(diag.value)}`,
      `activeElement=${diag.activeId || diag.activeTag || 'none'}`,
      `nodeId=${diag.nodeId || 'none'} connected=${diag.connected}`,
      `modalHidden=${diag.modalHidden}`,
      `titleValue=${JSON.stringify(diag.titleValue)}`,
      `messageValue=${JSON.stringify(diag.messageValue)}`,
    ].join('\n');
    throw new assert.AssertionError({ message: msg, cause: err });
  }

  const after = await page.evaluate((sel, nodeId) => {
    const el = document.querySelector(sel);
    return {
      nodeId: el ? (el.dataset.e2eNodeId || null) : null,
      sameNode: el ? el.dataset.e2eNodeId === nodeId : false,
      connected: el ? el.isConnected : false,
      value: el ? el.value : null,
    };
  }, selector, nodeStamp.nodeId);

  assert.equal(after.value, expectedValue, `${label}: value mismatch after fill`);
  assert.equal(after.sameNode, true, `${label}: textarea DOM node was replaced during fill`);
  assert.equal(after.connected, true, `${label}: textarea detached after fill`);
}

module.exports = { fillFeedbackFieldStable };
