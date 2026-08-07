'use strict';

const { isFeatureEnabledForFamily } = require('./feature-flag-with-family-override');

const FLAG_NATIVE = 'native_widget_enabled';
const FLAG_COMPLETION = 'widget_completion_enabled';

async function isNativeWidgetEnabled(familyId) {
  return isFeatureEnabledForFamily(FLAG_NATIVE, familyId);
}

async function isWidgetCompletionEnabled(familyId) {
  const nativeOn = await isNativeWidgetEnabled(familyId);
  if (!nativeOn) return false;
  return isFeatureEnabledForFamily(FLAG_COMPLETION, familyId);
}

module.exports = {
  FLAG_NATIVE,
  FLAG_COMPLETION,
  isNativeWidgetEnabled,
  isWidgetCompletionEnabled,
};
