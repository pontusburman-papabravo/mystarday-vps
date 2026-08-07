'use strict';

const { isFeatureEnabledForFamily } = require('./feature-flag-with-family-override');

const FLAG_KEY = 'trusted_device_v1';

async function isTrustedDeviceEnabled(familyId) {
  return isFeatureEnabledForFamily(FLAG_KEY, familyId);
}

module.exports = {
  FLAG_KEY,
  isTrustedDeviceEnabled,
};
