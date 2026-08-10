'use strict';

const { isFeatureEnabledForFamily } = require('./feature-flag-with-family-override');

const FLAG_KEY = 'family_device_entry_v1';

async function isFamilyDeviceEntryEnabled(familyId) {
  if (!familyId) return false;
  return isFeatureEnabledForFamily(FLAG_KEY, familyId);
}

module.exports = {
  FLAG_KEY,
  isFamilyDeviceEntryEnabled,
};
