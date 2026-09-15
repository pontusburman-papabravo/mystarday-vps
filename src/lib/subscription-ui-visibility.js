'use strict';

const { isBillingUiEnabled } = require('./billing-ui');
const {
  getNativePurchaseEligibility,
  getNativeRestoreEligibility,
} = require('./iap-native-purchase-gate');

/**
 * Server authority for Premium settings / subscription UI visibility.
 * Does not expose sandbox allowlist contents.
 *
 * @param {string} familyId
 * @param {{ active?: boolean }} [premium]
 * @returns {Promise<{ subscription_ui_visible: boolean, native_purchase_eligible: boolean, native_restore_eligible: boolean, billing_ui_enabled: boolean }>}
 */
async function resolveSubscriptionUiVisibility(familyId, premium) {
  const billing_ui_enabled = await isBillingUiEnabled();
  const [nativePurchase, nativeRestore] = await Promise.all([
    getNativePurchaseEligibility(familyId, { checkGlobalRollout: true }),
    getNativeRestoreEligibility(familyId, { checkGlobalRollout: true }),
  ]);
  const native_purchase_eligible = nativePurchase.allowed === true;
  const native_restore_eligible = nativeRestore.allowed === true;
  const premiumActive = !!(premium && premium.active);
  const subscription_ui_visible = billing_ui_enabled
    || native_purchase_eligible
    || native_restore_eligible
    || premiumActive;
  return {
    subscription_ui_visible,
    native_purchase_eligible,
    native_restore_eligible,
    billing_ui_enabled,
  };
}

module.exports = {
  resolveSubscriptionUiVisibility,
};
