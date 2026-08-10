'use strict';

const { isFeatureEnabledForFamily } = require('./feature-flag-with-family-override');
const { isFamilyDeviceEntryEnabled } = require('./family-device-entry-flags');

const FLAG_KEY = 'family_device_daily_ux_v1';

async function isFamilyDeviceDailyUxEnabled(familyId) {
  if (!familyId) return false;
  const entryOn = await isFamilyDeviceEntryEnabled(familyId);
  if (!entryOn) return false;
  return isFeatureEnabledForFamily(FLAG_KEY, familyId);
}

module.exports = {
  FLAG_KEY,
  isFamilyDeviceDailyUxEnabled,
};
